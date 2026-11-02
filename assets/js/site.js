import { esc, safeUrl, brandIcon, toolIcon, parseVideo, fmtNum, fmtDate, hueOf, normalize } from './common.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const canHover = matchMedia('(hover: hover)').matches;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

let DB, STATS = {};
const S = { tab: null, cat: '', q: '', sort: 'feat', ids: [], lastHash: '#/', open: null };
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

/* ---------- Datos ---------- */
async function load() {
  let data = null;
  try {
    const r = await fetch('/api/data', { cache: 'no-store' });
    if (r.ok) { const j = await r.json(); data = j.data; STATS = j.stats || {}; }
  } catch {}
  if (!data) {
    try { data = await (await fetch('/data/default.json')).json(); } catch { data = {}; }
  }
  DB = normalize(data);
}
const byId = (id) => DB.videos.find((v) => v.id === id);
const catById = (id) => DB.categories.find((c) => c.id === id);
const vs = (v) => ({ views: (+v.views || 0) + ((STATS[v.id] || {}).v || 0), likes: (+v.likes || 0) + ((STATS[v.id] || {}).l || 0) });
const cssUrl = (u) => safeUrl(u).replace(/['"()\s\\]/g, (c) => encodeURIComponent(c));

/* ---------- Tema / meta ---------- */
function hexToHsl(hex) {
  const m = /^#?([\da-f]{6})$/i.exec(hex || ''); if (!m) return [340, 100, 68];
  const n = parseInt(m[1], 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return [h, s * 100, l * 100];
}
function applyTheme() {
  const a = /^#[\da-f]{6}$/i.test(DB.settings.accent) ? DB.settings.accent : '#ff5c8a';
  const [h, s, l] = hexToHsl(a);
  const r = document.documentElement.style;
  r.setProperty('--accent', a);
  r.setProperty('--accent-2', `hsl(${Math.round(h + 75) % 360} ${Math.round(Math.max(s, 60))}% ${Math.round(Math.min(Math.max(l, 55), 68))}%)`);
  const { siteTitle, description } = DB.settings;
  document.title = siteTitle || DB.profile.name;
  const set = (sel, attr, val) => { const e = $(sel); if (e) e.setAttribute(attr, val); };
  set('meta[name=description]', 'content', description || '');
  set('meta[property="og:title"]', 'content', siteTitle || DB.profile.name);
  const av = safeUrl(DB.profile.avatar);
  if (av) set('link[rel=icon]', 'href', av);
}

/* ---------- Piezas ---------- */
function mediaHTML(v) {
  const p = parseVideo(v.url);
  const src = safeUrl(v.thumb) || p.thumb;
  if (src) return `<div class="media"><img src="${esc(src)}" alt="" loading="lazy" decoding="async"${p.thumbFallback ? ` data-fb="${esc(p.thumbFallback)}"` : ''}></div>`;
  if (p.kind === 'file') return `<div class="media"><video muted playsinline preload="metadata" src="${esc(p.url)}#t=0.8"></video></div>`;
  return `<div class="ph" style="--h:${hueOf(v.id + v.title)}">${esc((v.title || '?').trim().charAt(0).toUpperCase())}</div>`;
}
function cardHTML(v, i) {
  const c = catById((v.cats || [])[0]);
  const st = vs(v);
  const sub = [v.date ? fmtDate(v.date) : '', DB.settings.showStats && st.views ? fmtNum(st.views) + ' vistas' : ''].filter(Boolean).join('  ·  ');
  return `<button class="card" data-id="${esc(v.id)}" style="--i:${Math.min(i, 14)}" aria-label="Ver ${esc(v.title)}">
    ${mediaHTML(v)}<span class="shade"></span>
    ${c ? `<span class="badge">${esc(c.emoji || '')} ${esc(c.name)}</span>` : ''}
    ${v.ratio === '9:16' ? '<span class="badge vert">Vertical</span>' : ''}
    <span class="playb"><span class="ico" style="--i:url(/assets/icons/ui-play.svg)"></span></span>
    <span class="cap"><b>${esc(v.title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></button>`;
}
const gridHTML = (list, cls = '') => list.length
  ? `<div class="grid stagger ${cls}">${list.map(cardHTML).join('')}</div>`
  : `<div class="empty">Todavía no hay videos aquí.</div>`;

/* ---------- Estructura base ---------- */
function shell() {
  const p = DB.profile, s = DB.settings;
  const av = cssUrl(p.avatar), bn = cssUrl(p.banner);
  const avail = { open: '', busy: 'busy', closed: 'closed' }[p.availability] ?? '';
  const tabs = [['profile', 'Perfil'], ['portfolio', 'Portafolio']];
  if (s.showClients && DB.clients.length) tabs.push(['clients', 'Clientes']);
  if (s.showTimeline && DB.timeline.length) tabs.push(['timeline', 'Línea de tiempo']);
  S.tabs = tabs.map((t) => t[0]);
  $('#app').innerHTML = `
  <div class="banner"><div class="banner-img ${bn ? '' : 'fallback'}" style="--fy:${+p.bannerFocus || 40}%;${bn ? `background-image:url('${bn}')` : ''}"></div></div>
  <header class="wrap head">
    <div class="avatar"><span style="${av ? `background-image:url('${av}')` : ''}">${av ? '' : esc((p.name || '?').charAt(0).toUpperCase())}</span></div>
    <div class="who"><h1>${esc(p.name)}</h1>
      <div class="sub"><span>${esc(p.headline)}</span>${p.availabilityText ? `<span class="avail ${avail}"><i></i>${esc(p.availabilityText)}</span>` : ''}</div></div>
    <nav class="tabs" role="tablist" aria-label="Secciones">
      ${tabs.map(([id, l]) => `<button role="tab" data-tab="${id}" aria-selected="false">${l}</button>`).join('')}
      <span class="rail"></span><span class="playhead"></span>
    </nav>
  </header>
  <main class="wrap" id="view"></main>
  <footer>${esc(s.footer || '')}</footer>`;
}
function movePlayhead(tab) {
  const b = $(`.tabs [data-tab="${tab}"]`), ph = $('.playhead');
  $$('.tabs [data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
  if (!b || !ph) return;
  ph.style.width = Math.max(18, b.offsetWidth - 24) + 'px';
  ph.style.transform = `translateX(${b.offsetLeft + 12}px)`;
  if (b.scrollIntoView && innerWidth < 880) b.scrollIntoView({ inline: 'center', block: 'nearest' });
}

/* ---------- Vistas ---------- */
function sideHTML() {
  const p = DB.profile;
  const verified = DB.links.filter((l) => l.verified && safeUrl(l.url));
  const others = DB.links.filter((l) => !l.verified && safeUrl(l.url));
  const sec = (h, body) => (body ? `<div class="sec"><h3>${h}</h3>${body}</div>` : '');
  return `<aside class="side">
    <button class="btn wide" data-act="contact"><span class="ico" style="--i:url(/assets/icons/ui-mail.svg)"></span>Enviar mensaje</button>
    <div class="panel">
      ${sec('Mi historia', p.story && `<p>${esc(p.story)}</p>`)}
      ${sec('Roles', p.roles.length && `<div class="chips">${p.roles.map((r) => `<span class="chip">${esc(r)}</span>`).join('')}</div>`)}
      ${sec('Info confirmada', (verified.length || p.email || p.location) && `<div class="iconrow">
        ${p.email ? `<a href="mailto:${esc(p.email)}" title="Correo" aria-label="Correo"><span class="ico tick" style="--i:url(/assets/icons/ui-check.svg)"></span>${brandIcon('gmail')}</a>` : ''}
        ${verified.map((l) => `<a href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener me" title="${esc(l.label)}" aria-label="${esc(l.label)}"><span class="ico tick" style="--i:url(/assets/icons/ui-check.svg)"></span>${brandIcon(l.platform)}</a>`).join('')}
        ${p.location ? `<span class="static" title="${esc(p.location)}">${'<span class="ico" style="--i:url(/assets/icons/ui-pin.svg)"></span>'}</span>` : ''}</div>
        ${p.location ? `<div class="facts"><span>${esc(p.location)}</span></div>` : ''}`)}
      ${sec('Enlaces', others.length && `<div class="iconrow">${others.map((l) => `<a href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener" title="${esc(l.label)}" aria-label="${esc(l.label)}">${brandIcon(l.platform)}</a>`).join('')}</div>`)}
      ${sec('Experiencia', p.experience && `<p>${esc(p.experience)}</p>`)}
      ${sec('Herramientas', DB.tools.length && DB.tools.map((t) => `<div class="tool">${toolIcon(t.name)}<span>${esc(t.name)}</span><div class="bar"><i style="--w:${Math.min(100, Math.max(0, +t.level || 0))}%"></i></div></div>`).join(''))}
      ${sec('Idiomas', p.languages.length && `<div class="chips">${p.languages.map((r) => `<span class="chip">${esc(r)}</span>`).join('')}</div>`)}
    </div></aside>`;
}
function orderHome() {
  const f = DB.videos.filter((v) => v.featured), r = DB.videos.filter((v) => !v.featured);
  return [...f, ...r];
}
function profileView() {
  const tv = DB.videos.length, st = DB.videos.reduce((a, v) => { const x = vs(v); a.v += x.views; a.l += x.likes; return a; }, { v: 0, l: 0 });
  const home = orderHome().slice(0, Math.max(1, +DB.settings.homeCount || 6));
  S.ids = home.map((v) => v.id);
  const cats = DB.categories;
  const counts = (id) => DB.videos.filter((v) => (v.cats || []).includes(id)).length;
  return `<div class="layout view-in">${sideHTML()}
  <div class="col">
    ${DB.settings.showStats ? `<div class="stats">
      <div class="stat"><b data-count="${tv}">0</b><span>Videos</span></div>
      <div class="stat"><b data-count="${st.v}">0</b><span>Vistas</span></div>
      <div class="stat"><b data-count="${st.l}">0</b><span>Me gusta</span></div></div>` : ''}
    <section class="panel"><div class="panel-h"><span>Portafolio</span><a href="#/portfolio">Ver todo (${tv})</a></div>${gridHTML(home, 'home')}</section>
    ${cats.length ? `<section class="panel"><div class="panel-h"><span>Trabajos por categoría</span></div>
      <div class="catgrid">${cats.map((c, i) => `<a class="catcard" href="#/portfolio/${esc(c.slug)}" data-reveal style="--d:${i}"><span class="em">${esc(c.emoji || '🎬')}</span><b>${esc(c.name)}</b><small>${counts(c.id)} ${counts(c.id) === 1 ? 'video' : 'videos'}</small></a>`).join('')}</div></section>` : ''}
    ${DB.settings.showServices && DB.services.length ? `<section class="panel"><div class="panel-h"><span>Servicios</span></div>
      <div class="svc">${DB.services.map((s, i) => `<div data-reveal style="--d:${i}"><b>${esc(s.title)}</b><p>${esc(s.text)}</p>${s.price ? `<div class="price">${esc(s.price)}</div>` : ''}</div>`).join('')}</div></section>` : ''}
  </div></div>`;
}

function filtered() {
  const cat = DB.categories.find((c) => c.slug === S.cat);
  const q = S.q.trim().toLowerCase();
  let l = DB.videos.filter((v) => (!cat || (v.cats || []).includes(cat.id)) &&
    (!q || [v.title, v.description, v.client, ...(v.cats || []).map((id) => (catById(id) || {}).name)].join(' ').toLowerCase().includes(q)));
  if (S.sort === 'new') l = [...l].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  else if (S.sort === 'views') l = [...l].sort((a, b) => vs(b).views - vs(a).views);
  else l = [...l.filter((v) => v.featured), ...l.filter((v) => !v.featured)];
  return l;
}
function portfolioView() {
  const total = DB.videos.length;
  return `<section class="panel view-in">
    <div class="toolbar">
      <div class="cats" role="group" aria-label="Categorías">
        <button class="cat" data-cat="" aria-pressed="true">Todos <em>${total}</em></button>
        ${DB.categories.map((c) => `<button class="cat" data-cat="${esc(c.slug)}" aria-pressed="false">${esc(c.emoji || '')} ${esc(c.name)} <em>${DB.videos.filter((v) => (v.cats || []).includes(c.id)).length}</em></button>`).join('')}
      </div>
      <label class="search"><span class="ico" style="--i:url(/assets/icons/ui-search.svg)"></span><input type="search" id="q" placeholder="Buscar video" aria-label="Buscar video"></label>
      <select class="select" id="sort" aria-label="Ordenar"><option value="feat">Destacados</option><option value="new">Más recientes</option><option value="views">Más vistos</option></select>
    </div>
    <div class="catdesc" id="catdesc"></div>
    <div id="pgrid"></div></section>`;
}
function updatePortfolio(animate = true) {
  const list = filtered();
  S.ids = list.map((v) => v.id);
  $$('.cat').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === S.cat)));
  const c = DB.categories.find((x) => x.slug === S.cat);
  $('#catdesc').textContent = c ? c.description || '' : '';
  $('#catdesc').style.display = c && c.description ? '' : 'none';
  const g = $('#pgrid');
  if (!g) return;
  g.innerHTML = list.length ? gridHTML(list) : `<div class="empty">No hay videos que coincidan.</div>`;
  bindCards(g);
}

function clientsView() {
  return `<div class="clients view-in">${DB.clients.map((c, i) => `<article class="panel client" data-reveal style="--d:${i % 4}">
    <header><div class="logo" style="${c.logo ? `background-image:url('${cssUrl(c.logo)}')` : ''}">${c.logo ? '' : esc((c.name || '?').charAt(0).toUpperCase())}</div><h3>${esc(c.name)}</h3></header>
    ${c.description ? `<p>${esc(c.description)}</p>` : ''}${c.testimonial ? `<blockquote>${esc(c.testimonial)}</blockquote>` : ''}
    ${safeUrl(c.url) ? `<a href="${esc(safeUrl(c.url))}" target="_blank" rel="noopener">Visitar sitio</a>` : ''}</article>`).join('')}</div>`;
}
function timelineView() {
  return `<div class="tl view-in">${DB.timeline.map((t, i) => `<div class="tl-item" data-reveal style="--d:${Math.min(i, 3)}"><time>${esc(t.date)}</time><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p></div>`).join('')}</div>`;
}

/* ---------- Render por pestaña ---------- */
function renderTab(tab) {
  const view = $('#view');
  const html = { profile: profileView, portfolio: portfolioView, clients: clientsView, timeline: timelineView }[tab]();
  view.innerHTML = html;
  S.tab = tab;
  movePlayhead(tab);
  if (tab === 'portfolio') { $('#sort').value = S.sort; $('#q').value = S.q; updatePortfolio(); }
  bindCards(view);
  observe(view);
  countUp(view);
}

function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'v') {
    if (!S.tab) { S.lastHash = '#/portfolio'; renderTab('portfolio'); }
    openVideo(parts[1]);
    return;
  }
  closeModal(true);
  let tab = ['portfolio', 'clients', 'timeline'].includes(parts[0]) ? parts[0] : 'profile';
  if (!S.tabs.includes(tab)) tab = 'profile';
  S.lastHash = location.hash || '#/';
  if (tab === 'portfolio') {
    const slug = parts[1] || '';
    S.cat = DB.categories.some((c) => c.slug === slug) ? slug : '';
    if (S.tab === 'portfolio') { updatePortfolio(); return; }
  }
  if (S.tab !== tab) {
    scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    renderTab(tab);
  }
}

/* ---------- Efectos ---------- */
let io;
function observe(root) {
  io ||= new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  $$('[data-reveal]', root).forEach((el) => io.observe(el));
  requestAnimationFrame(() => $$('.bar', root).forEach((el, i) => setTimeout(() => el.classList.add('in'), 250 + i * 120)));
}
function countUp(root) {
  $$('[data-count]', root).forEach((el) => {
    const to = +el.dataset.count || 0;
    if (reduce || to < 2) { el.textContent = fmtNum(to); return; }
    const t0 = performance.now(), d = 1200;
    const tick = (t) => { const k = Math.min(1, (t - t0) / d); el.textContent = fmtNum(Math.round(to * (1 - Math.pow(1 - k, 4)))); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
}
function bindCards(root) {
  if (!canHover) return;
  $$('.card', root).forEach((c) => {
    const v = byId(c.dataset.id); if (!v) return;
    const p = parseVideo(v.url); if (p.kind !== 'file') return;
    let el, t;
    c.addEventListener('mouseenter', () => {
      t = setTimeout(() => {
        el = document.createElement('video');
        el.className = 'media pv'; el.muted = true; el.loop = true; el.playsInline = true; el.preload = 'auto'; el.src = p.url;
        el.addEventListener('playing', () => el.classList.add('on'));
        c.insertBefore(el, c.querySelector('.shade'));
        el.play().catch(() => {});
      }, 220);
    });
    c.addEventListener('mouseleave', () => { clearTimeout(t); if (el) { el.remove(); el = null; } });
  });
}

/* ---------- Modal de video ---------- */
function track(id, t) {
  fetch('/api/track', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, t }), keepalive: true }).catch(() => {});
  const s = (STATS[id] ||= { v: 0, l: 0 });
  if (t === 'view') s.v++; if (t === 'like') s.l++; if (t === 'unlike') s.l = Math.max(0, s.l - 1);
}
function playerHTML(v, p) {
  const r = v.ratio || '16:9', cls = { '9:16': 'v916', '4:5': 'v45', '1:1': 'v11' }[r] || '';
  const ar = r.replace(':', '/');
  if (p.kind === 'file') return `<div class="player ${cls}"><video controls autoplay playsinline src="${esc(p.url)}" style="${cls ? `width:auto;height:min(72vh,640px);aspect-ratio:${ar}` : ''}"></video></div>`;
  if (p.kind === 'iframe') return `<div class="player ${cls}"><iframe src="${esc(p.embed)}" style="--r:${ar}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen title="${esc(v.title)}" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
  const href = safeUrl(p.url);
  return `<div class="player"><div class="nolink">${href ? `<p>${esc(p.hint || 'Este video se abre en su página original.')}</p><a class="btn" href="${esc(href)}" target="_blank" rel="noopener">Ver el video</a>` : '<p>Este video todavía no tiene enlace.</p>'}</div></div>`;
}
function openVideo(id) {
  const v = byId(id);
  if (!v) { location.hash = S.lastHash || '#/portfolio'; return; }
  if (!S.ids.includes(id)) S.ids = DB.videos.map((x) => x.id);
  S.open = id;
  const i = S.ids.indexOf(id), p = parseVideo(v.url), st = vs(v), liked = store.get('liked', []).includes(id);
  const cats = (v.cats || []).map(catById).filter(Boolean);
  const m = $('#modal');
  m.innerHTML = `<div class="back" data-act="close"></div>
  <div class="dialog" tabindex="-1">
    <button class="xbtn" data-act="close" aria-label="Cerrar"><span class="ico" style="--i:url(/assets/icons/ui-close.svg)"></span></button>
    ${S.ids.length > 1 ? `<button class="pnav l" data-act="prev" aria-label="Anterior"><span class="ico" style="--i:url(/assets/icons/ui-prev.svg)"></span></button><button class="pnav r" data-act="next" aria-label="Siguiente"><span class="ico" style="--i:url(/assets/icons/ui-next.svg)"></span></button>` : ''}
    ${playerHTML(v, p)}
    <div class="vinfo"><h2>${esc(v.title)}</h2>
      <div class="vmeta">
        ${v.date ? `<span><span class="ico" style="--i:url(/assets/icons/ui-clock.svg)"></span>${esc(fmtDate(v.date))}</span>` : ''}
        ${DB.settings.showStats ? `<span><span class="ico" style="--i:url(/assets/icons/ui-eye.svg)"></span><span id="vcount">${fmtNum(st.views)}</span> vistas</span>` : ''}
        ${v.client ? `<span><span class="ico" style="--i:url(/assets/icons/ui-briefcase.svg)"></span>${esc(v.client)}</span>` : ''}
        ${cats.map((c) => `<a class="chip" href="#/portfolio/${esc(c.slug)}" data-act="close-nav">${esc(c.emoji || '')} ${esc(c.name)}</a>`).join('')}
      </div>
      ${v.description ? `<p>${esc(v.description)}</p>` : ''}
      <div class="acts">
        <button class="pill ${liked ? 'liked' : ''}" data-act="like"><span class="ico" style="--i:url(/assets/icons/ui-heart${liked ? '-fill' : ''}.svg)"></span><span id="lcount">${fmtNum(st.likes)}</span> Me gusta</button>
        <button class="pill" data-act="share"><span class="ico" style="--i:url(/assets/icons/ui-share.svg)"></span><span id="sharet">Copiar enlace</span></button>
        ${safeUrl(v.url) && p.kind !== 'link' ? `<a class="pill" href="${esc(safeUrl(v.url))}" target="_blank" rel="noopener"><span class="ico" style="--i:url(/assets/icons/ui-external.svg)"></span>Abrir original</a>` : ''}
      </div></div></div>`;
  m.classList.add('open'); document.body.style.overflow = 'hidden';
  $('.dialog', m).focus({ preventScroll: true });
  const seen = (() => { try { return JSON.parse(sessionStorage.getItem('seen') || '[]'); } catch { return []; } })();
  if (!seen.includes(id) && p.kind !== 'none') {
    track(id, 'view');
    try { sessionStorage.setItem('seen', JSON.stringify([...seen, id])); } catch {}
    const c = $('#vcount'); if (c) c.textContent = fmtNum(vs(v).views);
  }
}
function closeModal(silent) {
  const m = $('#modal');
  if (!m.classList.contains('open')) return;
  m.classList.remove('open'); m.innerHTML = ''; document.body.style.overflow = ''; S.open = null;
  if (!silent) location.hash = S.lastHash || '#/portfolio';
}
function step(d) {
  const i = S.ids.indexOf(S.open); if (i < 0) return;
  const id = S.ids[(i + d + S.ids.length) % S.ids.length];
  location.replace('#/v/' + id);
}

/* ---------- Contacto ---------- */
function openContact() {
  const p = DB.profile, m = $('#modal');
  const direct = DB.links.filter((l) => safeUrl(l.url));
  m.innerHTML = `<div class="back" data-act="close-contact"></div><div class="dialog narrow" tabindex="-1">
    <button class="xbtn" data-act="close-contact" aria-label="Cerrar"><span class="ico" style="--i:url(/assets/icons/ui-close.svg)"></span></button>
    <form class="form" id="cform"><h2>Hablemos de tu proyecto</h2>
      <p style="margin:0;color:var(--muted)">Cuéntame qué necesitas editar, cuánto dura y para cuándo lo quieres.</p>
      <label class="field">Tu nombre<input name="name" maxlength="80" autocomplete="name"></label>
      <label class="field">Tu correo o usuario de contacto<input name="email" maxlength="120" autocomplete="email"></label>
      <label class="field">Mensaje<textarea name="message" rows="5" maxlength="3000" required></textarea></label>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="msg-err" id="cerr" role="alert"></div>
      <button class="btn" type="submit">Enviar mensaje</button>
      ${p.email || direct.length ? `<div class="iconrow" style="margin-top:4px">${p.email ? `<a href="mailto:${esc(p.email)}" title="${esc(p.email)}" aria-label="Correo">${brandIcon('gmail')}</a>` : ''}${direct.map((l) => `<a href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener" title="${esc(l.label)}" aria-label="${esc(l.label)}">${brandIcon(l.platform)}</a>`).join('')}</div>` : ''}
    </form></div>`;
  m.classList.add('open'); document.body.style.overflow = 'hidden';
  $('#cform input[name=name]').focus();
  $('#cform').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, btn = $('button[type=submit]', f), err = $('#cerr');
    btn.disabled = true; err.textContent = '';
    try {
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(f))) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || '');
      f.outerHTML = `<div class="sent"><div class="okc"><span class="ico" style="--i:url(/assets/icons/ui-check.svg)"></span></div><h2>Mensaje enviado</h2><p style="margin:0;color:var(--muted)">Te responderé lo antes posible.</p><button class="btn ghost" data-act="close-contact">Cerrar</button></div>`;
    } catch (x) {
      err.textContent = x.message === 'rate' ? 'Enviaste demasiados mensajes. Intenta de nuevo en una hora.' : 'No se pudo enviar. Escríbeme por alguno de los enlaces de abajo.';
      btn.disabled = false;
    }
  });
}
function closeContact() { const m = $('#modal'); m.classList.remove('open'); m.innerHTML = ''; document.body.style.overflow = ''; }

/* ---------- Eventos ---------- */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act],[data-tab],[data-cat],.card');
  if (!t) return;
  if (t.dataset.tab) { location.hash = t.dataset.tab === 'profile' ? '#/' : '#/' + t.dataset.tab; return; }
  if (t.classList.contains('cat')) { location.hash = t.dataset.cat ? '#/portfolio/' + t.dataset.cat : '#/portfolio'; return; }
  if (t.classList.contains('card')) { S.lastHash = location.hash || '#/'; location.hash = '#/v/' + t.dataset.id; return; }
  const a = t.dataset.act;
  if (a === 'contact') openContact();
  else if (a === 'close-contact') closeContact();
  else if (a === 'close') closeModal();
  else if (a === 'close-nav') closeModal(true);
  else if (a === 'prev') step(-1);
  else if (a === 'next') step(1);
  else if (a === 'like') {
    const id = S.open, liked = store.get('liked', []), has = liked.includes(id);
    store.set('liked', has ? liked.filter((x) => x !== id) : [...liked, id]);
    track(id, has ? 'unlike' : 'like');
    t.classList.toggle('liked', !has);
    t.firstElementChild.style.setProperty('--i', `url(/assets/icons/ui-heart${has ? '' : '-fill'}.svg)`);
    $('#lcount').textContent = fmtNum(vs(byId(id)).likes);
  } else if (a === 'share') {
    const url = location.origin + location.pathname + '#/v/' + S.open;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).catch(() => {}).finally(() => {
      $('#sharet').textContent = '¡Enlace copiado!'; setTimeout(() => { const x = $('#sharet'); if (x) x.textContent = 'Copiar enlace'; }, 1800);
    });
  }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'q') { S.q = e.target.value; updatePortfolio(); }
});
document.addEventListener('change', (e) => { if (e.target.id === 'sort') { S.sort = e.target.value; updatePortfolio(); } });
document.addEventListener('keydown', (e) => {
  const open = $('#modal').classList.contains('open');
  if (!open) return;
  if (e.key === 'Escape') { $('.dialog.narrow') ? closeContact() : closeModal(); }
  if (S.open && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  }
});
document.addEventListener('pointermove', (e) => {
  const p = e.target.closest && e.target.closest('.panel'); if (!p) return;
  const r = p.getBoundingClientRect();
  p.style.setProperty('--mx', e.clientX - r.left + 'px'); p.style.setProperty('--my', e.clientY - r.top + 'px');
});
document.addEventListener('error', (e) => {
  const t = e.target;
  if (t.tagName === 'IMG' && t.dataset.fb && t.src !== t.dataset.fb) t.src = t.dataset.fb;
}, true);
addEventListener('hashchange', route);
addEventListener('resize', () => S.tab && movePlayhead(S.tab));

/* ---------- Inicio ---------- */
(async () => {
  await load();
  applyTheme();
  shell();
  document.fonts && document.fonts.ready.then(() => S.tab && movePlayhead(S.tab));
  route();
})();
