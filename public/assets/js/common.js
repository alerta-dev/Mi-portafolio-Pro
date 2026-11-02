// Utilidades compartidas entre el sitio público y el panel

export const PLATFORMS = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'x', label: 'X (Twitter)' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'discord', label: 'Discord' },
  { id: 'twitch', label: 'Twitch' },
  { id: 'kick', label: 'Kick' },
  { id: 'tumblr', label: 'Tumblr' },
  { id: 'behance', label: 'Behance' },
  { id: 'artstation', label: 'ArtStation' },
  { id: 'vimeo', label: 'Vimeo' },
  { id: 'github', label: 'GitHub' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'threads', label: 'Threads' },
  { id: 'bluesky', label: 'Bluesky' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'snapchat', label: 'Snapchat' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'spotify', label: 'Spotify' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'gmail', label: 'Correo' },
  { id: 'patreon', label: 'Patreon' },
  { id: 'kofi', label: 'Ko-fi' },
  { id: 'paypal', label: 'PayPal' },
  { id: 'steam', label: 'Steam' },
  { id: 'roblox', label: 'Roblox' },
  { id: 'link', label: 'Otro enlace' },
];

// Icono de marca (máscara CSS con SVG local)
export function brandIcon(platform, cls = '') {
  const known = PLATFORMS.some((p) => p.id === platform && p.id !== 'link');
  if (!known) return `<span class="ico ${cls}" style="--i:url(/assets/icons/ui-link.svg)" aria-hidden="true"></span>`;
  return `<span class="ico ${cls}" style="--i:url(/assets/icons/${platform}.svg)" aria-hidden="true"></span>`;
}

const TOOL_ICONS = [
  [/premiere/i, 'adobepremierepro'], [/after ?effects|\bae\b/i, 'adobeaftereffects'], [/photoshop|\bps\b/i, 'adobephotoshop'],
  [/illustrator/i, 'adobeillustrator'], [/audition/i, 'adobeaudition'], [/davinci|resolve/i, 'davinciresolve'],
  [/blender/i, 'blender'], [/figma/i, 'figma'], [/canva/i, 'canva'], [/obs/i, 'obsstudio'], [/audacity/i, 'audacity'],
  [/unreal/i, 'unrealengine'], [/vegas/i, 'vegas'],
];
export function toolIcon(name) {
  const m = TOOL_ICONS.find(([re]) => re.test(name || ''));
  if (m) return `<span class="ico" style="--i:url(/assets/icons/${m[1]}.svg)" aria-hidden="true"></span>`;
  return `<span class="tool-letter" aria-hidden="true">${esc((name || '?').trim().charAt(0).toUpperCase())}</span>`;
}

export const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Solo permite http(s), rutas relativas y mailto
export function safeUrl(u) {
  u = String(u || '').trim();
  if (!u) return '';
  if (u.startsWith('/') && !u.startsWith('//')) return u;
  if (/^(https?:|mailto:)/i.test(u)) return u;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(u)) return 'https://' + u;
  return '';
}

export const uid = (p = 'x') => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);

export const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'categoria';

export function fmtNum(n) {
  n = Number(n) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 2).replace(/0$/, '').replace(/\.$/, '') + 'K';
  return String(n);
}

export function fmtDate(d) {
  if (!d) return '';
  const t = new Date(d + (String(d).length === 10 ? 'T12:00:00' : ''));
  if (isNaN(t)) return d;
  return t.toLocaleDateString('es', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Detecta el tipo de enlace de video y cómo reproducirlo
export function parseVideo(raw) {
  const url = String(raw || '').trim();
  if (!url) return { kind: 'none', label: 'Sin enlace' };
  let u;
  try { u = new URL(url, location.href); } catch { return { kind: 'link', label: 'Enlace', url }; }
  if (!/^https?:$/.test(u.protocol)) return { kind: 'link', label: 'Enlace', url: '' };
  const h = u.hostname.replace(/^www\./, '');
  const p = u.pathname;

  let yt = '';
  if (h === 'youtu.be') yt = p.slice(1).split('/')[0];
  else if (/(^|\.)youtube(-nocookie)?\.com$/.test(h)) {
    if (p === '/watch') yt = u.searchParams.get('v') || '';
    else { const m = p.match(/^\/(shorts|embed|live|v)\/([\w-]{6,})/); if (m) yt = m[2]; }
  }
  if (yt && /^[\w-]{6,15}$/.test(yt))
    return { kind: 'iframe', label: 'YouTube', url, embed: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`, thumb: `https://i.ytimg.com/vi/${yt}/maxresdefault.jpg`, thumbFallback: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` };

  if (h === 'vimeo.com' || h === 'player.vimeo.com') {
    const m = p.match(/(\d{5,})/);
    if (m) return { kind: 'iframe', label: 'Vimeo', url, embed: `https://player.vimeo.com/video/${m[1]}?autoplay=1` };
  }
  if (h === 'drive.google.com') {
    const m = p.match(/\/file\/d\/([\w-]+)/) || (u.searchParams.get('id') ? [0, u.searchParams.get('id')] : null);
    if (m) return { kind: 'iframe', label: 'Google Drive', url, embed: `https://drive.google.com/file/d/${m[1]}/preview`, thumb: `https://drive.google.com/thumbnail?id=${m[1]}&sz=w800` };
  }
  if (h === 'streamable.com') {
    const m = p.match(/\/(?:e\/)?(\w+)/);
    if (m) return { kind: 'iframe', label: 'Streamable', url, embed: `https://streamable.com/e/${m[1]}?autoplay=1` };
  }
  if (/\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(p + u.search) || /(^|\.)(media|vtt|va)\.tumblr\.com$/.test(h))
    return { kind: 'file', label: /tumblr/.test(h) ? 'Tumblr (video directo)' : 'Video directo', url };
  if (/tumblr\.com$/.test(h)) return { kind: 'link', label: 'Tumblr (post)', url, hint: 'Para reproducirlo dentro de la página usa el link directo del video (.mp4).' };
  return { kind: 'link', label: h, url };
}

export function hueOf(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

export function normalize(d) {
  d = d && typeof d === 'object' ? d : {};
  const arr = (x) => (Array.isArray(x) ? x : []);
  return {
    settings: { siteTitle: 'Portafolio', description: '', accent: '#ff5c8a', showStats: true, showClients: true, showTimeline: true, showServices: true, homeCount: 6, footer: '', ...(d.settings || {}) },
    profile: { name: 'Tu nombre', headline: 'Editor de video', story: '', roles: [], location: '', email: '', avatar: '', banner: '', bannerFocus: 40, availability: 'open', availabilityText: '', experience: '', languages: [], ...(d.profile || {}) },
    links: arr(d.links), tools: arr(d.tools), categories: arr(d.categories),
    videos: arr(d.videos).map((v) => ({ cats: [], views: 0, likes: 0, ratio: '16:9', featured: false, ...v })),
    clients: arr(d.clients), timeline: arr(d.timeline), services: arr(d.services),
  };
}

export async function api(path, opts = {}) {
  const o = { credentials: 'same-origin', ...opts };
  o.headers = { ...(opts.headers || {}) };
  if (opts.json !== undefined) { o.method = o.method || 'POST'; o.body = JSON.stringify(opts.json); o.headers['content-type'] = 'application/json'; delete o.json; }
  const r = await fetch('/api/' + path, o);
  let body = null;
  try { body = await r.json(); } catch {}
  if (!r.ok) { const e = new Error((body && body.message) || 'Error ' + r.status); e.status = r.status; e.body = body; throw e; }
  return body;
}
