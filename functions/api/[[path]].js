// API del portafolio (Cloudflare Pages Functions + KV)
// Binding requerido: PORTFOLIO (KV)
// Variables: ADMIN_PASSWORD (secreta), ADMIN_USER (opcional, por defecto "admin"), SESSION_SECRET (secreta, recomendada)

const enc = new TextEncoder();
const MAX_DATA = 1_500_000; // bytes del JSON principal
const MAX_IMG = 6_000_000; // bytes por imagen
const IMG_TYPES = { 'image/jpeg': 1, 'image/png': 1, 'image/webp': 1, 'image/gif': 1, 'image/avif': 1 };
const SESSION_DAYS = 7;

const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

const b64u = (buf) => {
  let s = '';
  new Uint8Array(buf).forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const b64uToStr = (s) => {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return decodeURIComponent(escape(atob(s)));
};
const strToB64u = (s) => b64u(enc.encode(s));
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const rand = (n = 12) => hex(crypto.getRandomValues(new Uint8Array(n)));

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', key, enc.encode(msg));
}
async function safeEq(a, b) {
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const A = new Uint8Array(x), B = new Uint8Array(y);
  let d = 0;
  for (let i = 0; i < A.length; i++) d |= A[i] ^ B[i];
  return d === 0;
}
async function pbkdf2(pass, salt, iter = 100000) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: iter }, key, 256);
  return hex(bits);
}

const secretOf = (env) => env.SESSION_SECRET || env.ADMIN_PASSWORD || '';

async function makeSession(env, authV) {
  const payload = strToB64u(JSON.stringify({ exp: Date.now() + SESSION_DAYS * 864e5, v: authV || 0 }));
  const sig = b64u(await hmac(secretOf(env), payload));
  return `${payload}.${sig}`;
}
function getCookie(req, name) {
  const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : '';
}
async function isAuthed(req, env) {
  const token = getCookie(req, 'session');
  if (!token || !secretOf(env)) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expect = b64u(await hmac(secretOf(env), payload));
  if (!(await safeEq(sig, expect))) return false;
  try {
    const p = JSON.parse(b64uToStr(payload));
    if (!p.exp || p.exp < Date.now()) return false;
    const auth = await env.PORTFOLIO.get('auth', 'json');
    return (auth ? auth.v || 0 : 0) === (p.v || 0);
  } catch {
    return false;
  }
}
const cookieHeader = (url, value, maxAge) =>
  `session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${url.protocol === 'https:' ? '; Secure' : ''}`;

async function rateLimit(env, key, max, ttl) {
  const k = 'rl:' + key;
  const cur = parseInt((await env.PORTFOLIO.get(k)) || '0', 10);
  if (cur >= max) return false;
  await env.PORTFOLIO.put(k, String(cur + 1), { expirationTtl: ttl });
  return true;
}
const clip = (s, n) => String(s == null ? '' : s).slice(0, n);

export async function onRequest({ request, env, params }) {
  const url = new URL(request.url);
  const path = (Array.isArray(params.path) ? params.path : [params.path]).filter(Boolean);
  const method = request.method;
  const route = path[0] || '';

  if (!env.PORTFOLIO) {
    if (route === 'me') return json({ authenticated: false, kv: false, configured: !!env.ADMIN_PASSWORD });
    return json({ error: 'kv_missing', message: 'Falta crear el binding KV llamado PORTFOLIO.' }, 503);
  }

  // Protección CSRF: las peticiones que escriben deben venir del mismo origen
  if (method !== 'GET' && method !== 'HEAD') {
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) return json({ error: 'forbidden' }, 403);
  }

  try {
    // ---------- Público ----------
    if (route === 'data' && method === 'GET') {
      const data = await env.PORTFOLIO.get('data', 'json');
      const stats = {};
      const list = await env.PORTFOLIO.list({ prefix: 'stat:' });
      for (const k of list.keys) if (k.metadata) stats[k.name.slice(5)] = k.metadata;
      return json({ data, stats });
    }

    if (route === 'img' && method === 'GET' && path[1]) {
      const id = path[1].replace(/[^a-z0-9]/gi, '');
      const { value, metadata } = await env.PORTFOLIO.getWithMetadata('img:' + id, 'arrayBuffer');
      if (!value) return new Response('Not found', { status: 404 });
      return new Response(value, {
        headers: {
          'content-type': (metadata && metadata.type) || 'image/jpeg',
          'cache-control': 'public, max-age=31536000, immutable',
          'x-content-type-options': 'nosniff',
        },
      });
    }

    if (route === 'track' && method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const id = String(b.id || '');
      if (!/^[a-z0-9_-]{1,40}$/i.test(id) || !['view', 'like', 'unlike'].includes(b.t)) return json({ error: 'bad_request' }, 400);
      const ip = request.headers.get('cf-connecting-ip') || 'local';
      if (!(await rateLimit(env, 'track:' + ip, 120, 3600))) return json({ error: 'rate' }, 429);
      const data = await env.PORTFOLIO.get('data', 'json');
      if (!data || !(data.videos || []).some((v) => v.id === id)) return json({ error: 'not_found' }, 404);
      const key = 'stat:' + id;
      const { metadata } = await env.PORTFOLIO.getWithMetadata(key);
      const m = { v: (metadata && metadata.v) || 0, l: (metadata && metadata.l) || 0 };
      if (b.t === 'view') m.v++;
      if (b.t === 'like') m.l++;
      if (b.t === 'unlike') m.l = Math.max(0, m.l - 1);
      await env.PORTFOLIO.put(key, '1', { metadata: m });
      return json(m);
    }

    if (route === 'contact' && method === 'POST') {
      const b = await request.json().catch(() => ({}));
      if (b.website) return json({ ok: true }); // honeypot
      const message = clip(b.message, 3000).trim();
      if (message.length < 3) return json({ error: 'empty' }, 400);
      const ip = request.headers.get('cf-connecting-ip') || 'local';
      if (!(await rateLimit(env, 'contact:' + ip, 5, 3600))) return json({ error: 'rate' }, 429);
      const id = `${String(Date.now()).padStart(14, '0')}-${rand(3)}`;
      await env.PORTFOLIO.put(
        'msg:' + id,
        JSON.stringify({ id, name: clip(b.name, 80), email: clip(b.email, 120), message, date: new Date().toISOString() })
      );
      return json({ ok: true });
    }

    // ---------- Sesión ----------
    if (route === 'me' && method === 'GET') {
      return json({ authenticated: await isAuthed(request, env), kv: true, configured: !!env.ADMIN_PASSWORD });
    }

    if (route === 'login' && method === 'POST') {
      if (!env.ADMIN_PASSWORD && !(await env.PORTFOLIO.get('auth'))) return json({ error: 'not_configured', message: 'Falta definir la variable ADMIN_PASSWORD en Cloudflare.' }, 500);
      const ip = request.headers.get('cf-connecting-ip') || 'local';
      if (!(await rateLimit(env, 'login:' + ip, 8, 900))) return json({ error: 'rate', message: 'Demasiados intentos. Espera 15 minutos.' }, 429);
      const b = await request.json().catch(() => ({}));
      const user = String(b.user || '');
      const pass = String(b.password || '');
      const auth = await env.PORTFOLIO.get('auth', 'json');
      let passOk;
      if (auth && auth.hash) passOk = await safeEq(await pbkdf2(pass, auth.salt, auth.iter || 100000), auth.hash);
      else passOk = env.ADMIN_PASSWORD ? await safeEq(pass, env.ADMIN_PASSWORD) : false;
      const userOk = await safeEq(user.toLowerCase(), String(env.ADMIN_USER || 'admin').toLowerCase());
      if (!(passOk && userOk)) return json({ error: 'invalid', message: 'Usuario o contraseña incorrectos.' }, 401);
      const token = await makeSession(env, auth ? auth.v : 0);
      return json({ ok: true }, 200, { 'set-cookie': cookieHeader(url, token, SESSION_DAYS * 86400) });
    }

    if (route === 'logout' && method === 'POST') {
      return json({ ok: true }, 200, { 'set-cookie': cookieHeader(url, '', 0) });
    }

    // ---------- Todo lo de abajo requiere sesión ----------
    if (!(await isAuthed(request, env))) return json({ error: 'unauthorized' }, 401);

    if (route === 'data' && method === 'PUT') {
      const text = await request.text();
      if (text.length > MAX_DATA) return json({ error: 'too_big', message: 'Los datos son demasiado grandes.' }, 413);
      let d;
      try { d = JSON.parse(text); } catch { return json({ error: 'bad_json' }, 400); }
      if (!d || typeof d !== 'object' || Array.isArray(d)) return json({ error: 'bad_data' }, 400);
      for (const k of ['links', 'tools', 'categories', 'videos', 'clients', 'timeline', 'services']) if (d[k] && !Array.isArray(d[k])) return json({ error: 'bad_data', message: k + ' debe ser una lista' }, 400);
      await env.PORTFOLIO.put('data', JSON.stringify(d));
      return json({ ok: true });
    }

    if (route === 'upload' && method === 'POST') {
      const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!IMG_TYPES[type]) return json({ error: 'bad_type', message: 'Formato no permitido. Usa JPG, PNG, WEBP, GIF o AVIF.' }, 415);
      const buf = await request.arrayBuffer();
      if (buf.byteLength > MAX_IMG) return json({ error: 'too_big', message: 'La imagen supera 6 MB.' }, 413);
      if (buf.byteLength < 100) return json({ error: 'empty' }, 400);
      const id = rand(10);
      await env.PORTFOLIO.put('img:' + id, buf, { metadata: { type } });
      return json({ url: '/api/img/' + id });
    }

    if (route === 'password' && method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const cur = String(b.current || ''), next = String(b.next || '');
      if (next.length < 8) return json({ error: 'weak', message: 'La nueva contraseña debe tener al menos 8 caracteres.' }, 400);
      const auth = await env.PORTFOLIO.get('auth', 'json');
      let ok;
      if (auth && auth.hash) ok = await safeEq(await pbkdf2(cur, auth.salt, auth.iter || 100000), auth.hash);
      else ok = env.ADMIN_PASSWORD ? await safeEq(cur, env.ADMIN_PASSWORD) : false;
      if (!ok) return json({ error: 'invalid', message: 'La contraseña actual no es correcta.' }, 401);
      const salt = rand(16);
      const rec = { salt, iter: 100000, hash: await pbkdf2(next, salt), v: ((auth && auth.v) || 0) + 1 };
      await env.PORTFOLIO.put('auth', JSON.stringify(rec));
      const token = await makeSession(env, rec.v);
      return json({ ok: true }, 200, { 'set-cookie': cookieHeader(url, token, SESSION_DAYS * 86400) });
    }

    if (route === 'messages' && method === 'GET') {
      const list = await env.PORTFOLIO.list({ prefix: 'msg:', limit: 200 });
      const msgs = (await Promise.all(list.keys.map((k) => env.PORTFOLIO.get(k.name, 'json')))).filter(Boolean);
      msgs.sort((a, b) => (a.id < b.id ? 1 : -1));
      return json({ messages: msgs });
    }
    if (route === 'messages' && method === 'DELETE' && path[1]) {
      await env.PORTFOLIO.delete('msg:' + path[1].replace(/[^0-9a-f-]/gi, ''));
      return json({ ok: true });
    }

    return json({ error: 'not_found' }, 404);
  } catch (e) {
    return json({ error: 'server', message: String((e && e.message) || e) }, 500);
  }
}
