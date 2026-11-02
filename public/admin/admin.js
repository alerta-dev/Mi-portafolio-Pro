import { PLATFORMS, esc, safeUrl, uid, slugify, fmtNum, parseVideo, normalize, api } from '/assets/js/common.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ic = (n) => `<span class="ico" style="--i:url(/assets/icons/ui-${n}.svg)"></span>`;
const root = $('#root');

let D = null, STATS = {}, MSGS = [], dirty = false, sect = 'dash', saving = false;
const vf = { q: '', cat: '' };
const openIds = new Set();

/* ---------- Utilidades ---------- */
function toast(msg, err) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
  $('#toasts').append(t); setTimeout(() => t.remove(), err ? 6000 : 2800);
}
function getPath(path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), D); }
function setPath(path, val) {
  const ks = path.split('.'), last = ks.pop();
  const o = ks.reduce((a, k) => a[k], D); o[last] = val;
}
function markDirty() { dirty = true; updateBar(); }
function updateBar() {
  const st = $('.savebar .st'), b = $('#save');
  if (!st) return;
  st.textContent = saving ? 'Guardando…' : dirty ? 'Hay cambios sin guardar' : 'Todo guardado';
  st.classList.toggle('dirty', dirty);
  b.disabled = !dirty || saving;
}
addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- Campos ---------- */
const val = (p) => { const v = getPath(p); return v == null ? '' : v; };
const fText = (label, path, o = {}) => `<label class="field ${o.span ? 'span2' : ''}"><span class="l">${label}</span>
  ${o.area ? `<textarea data-path="${path}" rows="${o.rows || 4}" placeholder="${esc(o.ph || '')}">${esc(val(path))}</textarea>`
    : `<input type="${o.type || 'text'}" data-path="${path}" ${o.kind ? `data-kind="${o.kind}"` : ''} value="${esc(o.list ? (getPath(path) || []).join(', ') : val(path))}" placeholder="${esc(o.ph || '')}" ${o.list ? 'data-kind="list"' : ''} ${o.attrs || ''}>`}
  ${o.hint ? `<small>${o.hint}</small>` : ''}</label>`;
const fCheck = (label, path) => `<label class="check"><input type="checkbox" data-path="${path}" ${getPath(path) ? 'checked' : ''}> ${label}</label>`;
const fSelect = (label, path, opts, o = {}) => `<label class="field ${o.span ? 'span2' : ''}"><span class="l">${label}</span><select data-path="${path}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(val(path)) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
function fImage(label, path, o = {}) {
  const u = safeUrl(val(path));
  return `<div class="field ${o.span ? 'span2' : ''}"><span class="l">${label}</span>
  <div class="imgf ${o.wide ? 'wide' : ''} ${o.round ? 'round' : ''}">
    <div class="iprev" data-prev="${path}" style="${u ? `background-image:url('${u.replace(/['"()\s]/g, encodeURIComponent)}')` : ''}"></div>
    <div><input type="text" data-path="${path}" value="${esc(val(path))}" placeholder="Pega un link de imagen o sube una">
      <div class="irow"><label class="btn sm ghost">${ic('upload')} Subir imagen<input type="file" hidden accept="image/*" data-upload="${path}" data-max="${o.max || 1600}" ${o.square ? 'data-square="1"' : ''}></label>
      <button class="btn sm danger" data-act="clearimg" data-path="${path}" type="button">Quitar</button></div>
      ${o.hint ? `<small>${o.hint}</small>` : ''}</div></div></div>`;
}
const secHead = (t, d) => `<header><h1>${t}</h1>${d ? `<p>${d}</p>` : ''}</header>`;

/* ---------- Secciones ---------- */
const NAV = [
  ['dash', 'home', 'Resumen'], ['profile', 'user', 'Perfil'], ['videos', 'film', 'Videos'], ['cats', 'folder', 'Categorías'],
  ['links', 'link', 'Redes y enlaces'], ['tools', 'tool', 'Herramientas'], ['clients', 'building', 'Clientes'],
  ['timeline', 'clock', 'Línea de tiempo'], ['services', 'briefcase', 'Servicios'], ['msgs', 'inbox', 'Mensajes'], ['settings', 'gear', 'Ajustes'],
];
function totals() {
  return D.videos.reduce((a, v) => { const s = STATS[v.id] || {}; a.v += (+v.views || 0) + (s.v || 0); a.l += (+v.likes || 0) + (s.l || 0); return a; }, { v: 0, l: 0 });
}
const newMsgs = () => MSGS.filter((m) => m.id > (localStorage.getItem('seenMsg') || '')).length;

const S = {};
S.dash = () => {
  const t = totals(), p = D.profile;
  const todo = [
    ['Sube tu foto de perfil', !!p.avatar, 'profile'], ['Sube tu banner', !!p.banner, 'profile'],
    ['Escribe tu historia', p.story.length > 20, 'profile'], ['Crea tus categorías', D.categories.length > 0, 'cats'],
    ['Agrega tus videos reales', D.videos.some((v) => v.url), 'videos'], ['Agrega tus redes', D.links.some((l) => l.url && !/^https:\/\/(www\.)?\w+\.com\/?$/.test(l.url)), 'links'],
    ['Cambia la contraseña inicial', !!localStorage.getItem('pwChanged'), 'settings'],
  ];
  return `<div class="sect">${secHead('Resumen', 'Todo lo que cambies aquí se refleja en tu portafolio al guardar.')}
  <div class="stats"><div class="stat"><b>${D.videos.length}</b><span>Videos</span></div><div class="stat"><b>${D.categories.length}</b><span>Categorías</span></div>
  <div class="stat"><b>${fmtNum(t.v)}</b><span>Vistas</span></div><div class="stat"><b>${fmtNum(t.l)}</b><span>Me gusta</span></div>
  <div class="stat"><b>${newMsgs()}</b><span>Mensajes nuevos</span></div></div>
  <div class="card"><h2>Para dejarlo listo</h2><div class="todo">${todo.map(([l, d, s]) => `<a href="#" data-go="${s}" class="${d ? 'done' : ''}"><span class="dot">${d ? ic('check') : ''}</span>${l}</a>`).join('')}</div></div>
  <div class="card"><h2>Atajos</h2><div class="row"><button class="btn accent" data-go="videos" data-newvideo>${ic('plus')} Añadir video</button><a class="btn ghost" href="/" target="_blank">${ic('external')} Ver mi portafolio</a></div></div></div>`;
};

S.profile = () => `<div class="sect">${secHead('Perfil', 'Lo primero que ve la gente al entrar.')}
  <div class="card"><h2>Imágenes</h2><div class="grid2">
    ${fImage('Foto de perfil', 'profile.avatar', { round: 1, square: 1, max: 600, hint: 'Se recorta en cuadrado. Admite GIF animado.' })}
    ${fImage('Banner', 'profile.banner', { wide: 1, max: 2000, hint: 'Recomendado 1800×500. Evita poner texto importante en los bordes.' })}
    <label class="field span2"><span class="l">Posición vertical del banner</span><input type="range" min="0" max="100" data-path="profile.bannerFocus" data-kind="num" value="${+val('profile.bannerFocus') || 40}"><small>Mueve el recorte hacia arriba o abajo.</small></label></div></div>
  <div class="card"><h2>Datos básicos</h2><div class="grid2">
    ${fText('Nombre o alias', 'profile.name')}${fText('Título', 'profile.headline', { ph: 'Editor de video' })}
    ${fText('Mi historia', 'profile.story', { area: 1, rows: 5, span: 1 })}
    ${fText('Experiencia', 'profile.experience', { area: 1, rows: 5, span: 1, hint: 'Se muestra tal cual, respeta los saltos de línea.' })}
    ${fText('Roles', 'profile.roles', { list: 1, ph: 'Editor de video, Motion graphics', hint: 'Sepáralos con comas.' })}
    ${fText('Idiomas', 'profile.languages', { list: 1, ph: 'Español, Inglés' })}
    ${fText('Ubicación', 'profile.location', { ph: 'Ciudad, País' })}${fText('Correo de contacto', 'profile.email', { type: 'email', hint: 'Se muestra en el perfil como info confirmada.' })}</div></div>
  <div class="card"><h2>Disponibilidad</h2><div class="grid2">
    ${fSelect('Estado', 'profile.availability', [['open', 'Disponible (verde)'], ['busy', 'Poco cupo (naranja)'], ['closed', 'No disponible (rojo)']])}
    ${fText('Texto', 'profile.availabilityText', { ph: 'Disponible para proyectos', hint: 'Déjalo vacío para ocultar el aviso.' })}</div></div></div>`;

function listShell(key, title, desc, addLabel, items) {
  return `<div class="sect">${secHead(title, desc)}<div class="row" style="margin-bottom:14px"><button class="btn accent" data-act="add" data-key="${key}">${ic('plus')} ${addLabel}</button></div>
  ${items.length ? items.join('') : `<div class="empty">Aún no hay nada. Pulsa «${addLabel}» para empezar.</div>`}</div>`;
}
const itemBtns = (key, i, n) => `<span class="ib">${i > 0 ? `<button type="button" data-act="mv" data-key="${key}" data-i="${i}" data-dir="-1" aria-label="Subir">${ic('up')}</button>` : ''}${i < n - 1 ? `<button type="button" data-act="mv" data-key="${key}" data-i="${i}" data-dir="1" aria-label="Bajar">${ic('down')}</button>` : ''}<button type="button" class="del" data-act="del" data-key="${key}" data-i="${i}" aria-label="Eliminar">${ic('trash')}</button></span>`;
const itemWrap = (key, i, id, sum, body, small = '') => `<details class="item" data-id="${id}" ${openIds.has(id) ? 'open' : ''}><summary>${sum}${itemBtns(key, i, D[key].length)}</summary><div class="item-body">${body}</div></details>`;

S.links = () => listShell('links', 'Redes y enlaces', 'Los enlaces «confirmados» salen con un check en la sección de info confirmada; el resto aparece en Enlaces.', 'Añadir enlace',
  D.links.map((l, i) => itemWrap('links', i, l.id,
    `<span class="vthumb sq" data-icon="${i}">${ic('link')}</span><span class="t"><b data-live="links.${i}.label">${esc(l.label || 'Nuevo enlace')}</b><small>${esc((PLATFORMS.find((p) => p.id === l.platform) || {}).label || '')}</small></span>`,
    `${fSelect('Plataforma', `links.${i}.platform`, PLATFORMS.map((p) => [p.id, p.label]))}${fText('Nombre visible', `links.${i}.label`)}
     ${fText('URL', `links.${i}.url`, { span: 1, ph: 'https://…', type: 'url' })}<div class="field" style="align-content:end">${fCheck('Confirmado (muestra un check)', `links.${i}.verified`)}</div>`)));

S.tools = () => listShell('tools', 'Herramientas y programas', 'Los editores y programas que usas. La barra indica tu nivel.', 'Añadir herramienta',
  D.tools.map((t, i) => itemWrap('tools', i, t.id, `<span class="vthumb sq">${ic('tool')}</span><span class="t"><b data-live="tools.${i}.name">${esc(t.name || 'Nueva herramienta')}</b><small>${+t.level || 0}%</small></span>`,
    `${fText('Nombre', `tools.${i}.name`, { ph: 'Adobe Premiere Pro', hint: 'Si reconozco el nombre (Premiere, After Effects, DaVinci…) pongo su icono.' })}
     <label class="field"><span class="l">Nivel: <span data-live="tools.${i}.level">${+t.level || 0}</span>%</span><input type="range" min="0" max="100" step="5" data-path="tools.${i}.level" data-kind="num" value="${+t.level || 0}"></label>`)));

S.cats = () => listShell('categories', 'Categorías', 'Organiza tus videos por tipo de trabajo. Cada categoría tiene su propio filtro en el portafolio.', 'Nueva categoría',
  D.categories.map((c, i) => itemWrap('categories', i, c.id,
    `<span class="vthumb sq">${esc(c.emoji || '🎬')}</span><span class="t"><b data-live="categories.${i}.name">${esc(c.name || 'Nueva categoría')}</b><small>${D.videos.filter((v) => (v.cats || []).includes(c.id)).length} videos</small></span>`,
    `${fText('Nombre', `categories.${i}.name`)}${fText('Emoji', `categories.${i}.emoji`, { ph: '🎮', attrs: 'maxlength="4"' })}
     ${fText('Descripción', `categories.${i}.description`, { area: 1, rows: 2, span: 1, hint: 'Se muestra al filtrar por esta categoría.' })}
     ${fText('Dirección (slug)', `categories.${i}.slug`, { hint: 'Parte del link: /#/portfolio/<b>este-texto</b>' })}`)));

S.clients = () => listShell('clients', 'Clientes', 'Con quién has trabajado y qué dijeron de ti. Si no tienes clientes, esta pestaña se oculta sola.', 'Añadir cliente',
  D.clients.map((c, i) => itemWrap('clients', i, c.id, `<span class="vthumb sq">${ic('building')}</span><span class="t"><b data-live="clients.${i}.name">${esc(c.name || 'Nuevo cliente')}</b><small>${esc(c.description || '')}</small></span>`,
    `${fText('Nombre', `clients.${i}.name`)}${fText('Enlace', `clients.${i}.url`, { type: 'url', ph: 'https://…' })}
     ${fImage('Logo o foto', `clients.${i}.logo`, { max: 400, square: 1, span: 1 })}${fText('Qué hice para ellos', `clients.${i}.description`, { area: 1, rows: 3 })}
     ${fText('Testimonio (opcional)', `clients.${i}.testimonial`, { area: 1, rows: 2, span: 1 })}`)));

S.timeline = () => listShell('timeline', 'Línea de tiempo', 'Hitos de tu carrera, del más reciente al más antiguo.', 'Añadir hito',
  D.timeline.map((t, i) => itemWrap('timeline', i, t.id, `<span class="vthumb sq">${ic('clock')}</span><span class="t"><b data-live="timeline.${i}.title">${esc(t.title || 'Nuevo hito')}</b><small data-live="timeline.${i}.date">${esc(t.date || '')}</small></span>`,
    `${fText('Fecha o año', `timeline.${i}.date`, { ph: '2026' })}${fText('Título', `timeline.${i}.title`)}${fText('Descripción', `timeline.${i}.text`, { area: 1, rows: 3, span: 1 })}`)));

S.services = () => listShell('services', 'Servicios', 'Qué ofreces. El precio es opcional.', 'Añadir servicio',
  D.services.map((t, i) => itemWrap('services', i, t.id, `<span class="vthumb sq">${ic('briefcase')}</span><span class="t"><b data-live="services.${i}.title">${esc(t.title || 'Nuevo servicio')}</b><small>${esc(t.price || '')}</small></span>`,
    `${fText('Título', `services.${i}.title`)}${fText('Precio (opcional)', `services.${i}.price`, { ph: 'Desde $20 USD' })}${fText('Descripción', `services.${i}.text`, { area: 1, rows: 2, span: 1 })}`)));

/* Videos */
function vThumb(v) {
  const p = parseVideo(v.url), src = safeUrl(v.thumb) || p.thumb;
  if (src) return `<span class="vthumb" style="background-image:url('${src.replace(/['"()\s]/g, encodeURIComponent)}')"></span>`;
  if (p.kind === 'file') return `<span class="vthumb"><video muted preload="metadata" src="${esc(p.url)}#t=0.5" style="width:100%;height:100%;object-fit:cover"></video></span>`;
  return `<span class="vthumb">${ic('film')}</span>`;
}
function detectHTML(url) {
  const p = parseVideo(url);
  if (p.kind === 'none') return `<span class="detect warn">Pega el link del video</span>`;
  if (p.kind === 'link') return `<span class="detect warn">${esc(p.label)}: ${esc(p.hint || 'se abrirá en su página original, no dentro del portafolio.')}</span>`;
  return `<span class="detect">${ic('check')} ${esc(p.label)}: se reproduce dentro del portafolio</span>`;
}
function videoItem(v, i) {
  const st = STATS[v.id] || {};
  const filtered = vf.q || vf.cat;
  const cats = (v.cats || []).map((id) => (D.categories.find((c) => c.id === id) || {}).name).filter(Boolean).join(', ');
  const body = `${fText('Título', `videos.${i}.title`, { span: 1 })}
    <label class="field span2"><span class="l">Link del video</span><input type="text" data-path="videos.${i}.url" value="${esc(v.url)}" placeholder="https://va.media.tumblr.com/…mp4  ·  YouTube  ·  Vimeo  ·  Google Drive"><span data-detect="videos.${i}.url">${detectHTML(v.url)}</span></label>
    ${fImage('Miniatura', `videos.${i}.thumb`, { span: 1, wide: 1, max: 1000, hint: 'Opcional. Con YouTube o .mp4 se genera sola; súbela para controlar cómo se ve.' })}
    <div class="field span2"><span class="l">Categorías</span><div class="catpick">${D.categories.length ? D.categories.map((c) => `<label><input type="checkbox" data-path="videos.${i}.cats" data-kind="multi" value="${c.id}" ${(v.cats || []).includes(c.id) ? 'checked' : ''}>${esc(c.emoji || '')} ${esc(c.name)}</label>`).join('') : '<span class="note">Primero crea categorías en la sección Categorías.</span>'}</div></div>
    ${fText('Fecha', `videos.${i}.date`, { type: 'date' })}${fText('Cliente (opcional)', `videos.${i}.client`, { attrs: 'list="clientlist"' })}
    ${fSelect('Formato del video', `videos.${i}.ratio`, [['16:9', 'Horizontal 16:9'], ['9:16', 'Vertical 9:16 (shorts/reels)'], ['1:1', 'Cuadrado 1:1'], ['4:5', 'Retrato 4:5']])}
    <div class="field" style="align-content:end">${fCheck('Destacado (sale primero en el inicio)', `videos.${i}.featured`)}</div>
    ${fText('Descripción', `videos.${i}.description`, { area: 1, rows: 3, span: 1 })}
    ${fText('Vistas iniciales', `videos.${i}.views`, { type: 'number', kind: 'num', attrs: 'min="0"', hint: `Se suman a las vistas reales de la página (${fmtNum(st.v || 0)}).` })}
    ${fText('Me gusta iniciales', `videos.${i}.likes`, { type: 'number', kind: 'num', attrs: 'min="0"', hint: `Se suman a los reales (${fmtNum(st.l || 0)}).` })}`;
  return `<details class="item" data-id="${v.id}" ${openIds.has(v.id) ? 'open' : ''}><summary>${vThumb(v)}<span class="t"><b data-live="videos.${i}.title">${esc(v.title || 'Sin título')}</b><small>${esc(cats || 'Sin categoría')}${v.featured ? ' · <span class="star">★ destacado</span>' : ''}</small></span>
    <span class="ib">${!filtered && i > 0 ? `<button type="button" data-act="mv" data-key="videos" data-i="${i}" data-dir="-1" aria-label="Subir">${ic('up')}</button>` : ''}${!filtered && i < D.videos.length - 1 ? `<button type="button" data-act="mv" data-key="videos" data-i="${i}" data-dir="1" aria-label="Bajar">${ic('down')}</button>` : ''}<button type="button" class="del" data-act="del" data-key="videos" data-i="${i}" aria-label="Eliminar">${ic('trash')}</button></span></summary>
    <div class="item-body">${body}</div></details>`;
}
function videoList() {
  const q = vf.q.toLowerCase();
  const rows = D.videos.map((v, i) => [v, i]).filter(([v]) => (!vf.cat || (v.cats || []).includes(vf.cat)) && (!q || (v.title + ' ' + v.url).toLowerCase().includes(q)));
  return rows.length ? rows.map(([v, i]) => videoItem(v, i)).join('') : `<div class="empty">${D.videos.length ? 'Ningún video coincide con el filtro.' : 'Aún no tienes videos. Pega un link arriba para añadir el primero.'}</div>`;
}
S.videos = () => `<div class="sect">${secHead('Videos', 'Sube tus videos a Tumblr (o YouTube, Vimeo, Drive) y pega aquí el link con un título.')}
  <details class="help"><summary>¿Cómo obtengo el link de un video de Tumblr?</summary><ol>
    <li>Sube el video a tu blog de Tumblr y publica el post.</li>
    <li>Abre el post, haz clic derecho sobre el video y elige <b>Copiar dirección del video</b>.</li>
    <li>El link debe terminar en <code>.mp4</code>, por ejemplo <code>https://va.media.tumblr.com/tumblr_xxx.mp4</code>.</li>
    <li>Pégalo en «Link del video». Se reproducirá dentro de tu portafolio.</li>
    <li>Si pegas el link normal del post de Tumblr, el portafolio solo podrá abrir el post en otra pestaña.</li></ol></details>
  <div class="card"><h2>Añadir video</h2><div class="quick">
    <label class="field"><span class="l">Link</span><input type="text" id="qv-url" placeholder="Pega el link del video"></label>
    <label class="field"><span class="l">Título</span><input type="text" id="qv-title" placeholder="Título del video"></label>
    <label class="field"><span class="l">Categoría</span><select id="qv-cat"><option value="">Sin categoría</option>${D.categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
    <button class="btn accent" data-act="quickadd">${ic('plus')} Añadir</button></div></div>
  <div class="tools"><input type="text" id="vq" placeholder="Buscar por título o link" value="${esc(vf.q)}"><select id="vc"><option value="">Todas las categorías</option>${D.categories.map((c) => `<option value="${c.id}" ${vf.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
  <div id="vlist">${videoList()}</div>
  <datalist id="clientlist">${D.clients.map((c) => `<option value="${esc(c.name)}">`).join('')}</datalist></div>`;

S.msgs = () => `<div class="sect">${secHead('Mensajes', 'Lo que te escribe la gente desde el botón «Enviar mensaje» de tu portafolio.')}
  ${MSGS.length ? MSGS.map((m) => `<article class="msg ${m.isNew ? 'new' : ''}"><header><span><b style="color:var(--text)">${esc(m.name || 'Sin nombre')}</b> ${m.email ? '· ' + esc(m.email) : ''}</span><span>${new Date(m.date).toLocaleString('es')}</span></header><p>${esc(m.message)}</p>
    <div class="row"><button class="btn sm danger" data-act="delmsg" data-id="${m.id}">${ic('trash')} Eliminar</button></div></article>`).join('') : '<div class="empty">Todavía no hay mensajes.</div>'}</div>`;

const SWATCHES = ['#ff5c8a', '#a78bfa', '#6c8cff', '#22d3ee', '#34d399', '#fbbf24', '#fb923c', '#f87171'];
S.settings = () => `<div class="sect">${secHead('Ajustes', 'Apariencia general, secciones visibles y seguridad.')}
  <div class="card"><h2>Sitio</h2><div class="grid2">
    ${fText('Título de la pestaña del navegador', 'settings.siteTitle')}${fText('Descripción (para buscadores)', 'settings.description')}
    <div class="field span2"><span class="l">Color de acento</span><div class="swatches"><input type="color" data-path="settings.accent" value="${esc(D.settings.accent)}">
      ${SWATCHES.map((c) => `<button type="button" class="sw" data-act="swatch" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div></div>
    ${fText('Texto del pie de página', 'settings.footer')}${fText('Videos en el inicio', 'settings.homeCount', { type: 'number', kind: 'num', attrs: 'min="1" max="24"' })}</div></div>
  <div class="card"><h2>Secciones visibles</h2><div class="grid2">
    ${fCheck('Estadísticas (videos, vistas, me gusta)', 'settings.showStats')}${fCheck('Pestaña Clientes', 'settings.showClients')}${fCheck('Pestaña Línea de tiempo', 'settings.showTimeline')}${fCheck('Servicios en el inicio', 'settings.showServices')}</div></div>
  <div class="card"><h2>Cambiar contraseña</h2><form id="pwform" class="grid2">
    <label class="field"><span class="l">Contraseña actual</span><input type="password" name="cur" autocomplete="current-password" required></label>
    <label class="field"><span class="l">Nueva contraseña (mínimo 8)</span><input type="password" name="next" autocomplete="new-password" minlength="8" required></label>
    <div class="row span2"><button class="btn" type="submit">Cambiar contraseña</button><span class="err" id="pwerr"></span></div></form></div>
  <div class="card"><h2>Copia de seguridad</h2><p class="note" style="margin-top:0">Descarga todo tu contenido en un archivo. Las imágenes subidas se guardan como enlaces; el archivo no las incluye.</p>
    <div class="row"><button class="btn ghost" data-act="export">${ic('upload')} Descargar copia</button><label class="btn ghost">Restaurar copia<input type="file" hidden accept="application/json" id="importf"></label></div></div>
  <div class="card"><h2>Sesión</h2><button class="btn danger" data-act="logout">${ic('logout')} Cerrar sesión</button></div></div>`;

/* ---------- Render principal ---------- */
function renderApp() {
  const nm = newMsgs();
  root.innerHTML = `<div class="app"><nav class="nav" aria-label="Secciones"><div class="brand"><i></i>Panel</div>
    ${NAV.map(([id, i, l]) => `<button data-go="${id}" ${id === sect ? 'aria-current="page"' : ''}>${ic(i)} ${l}${id === 'msgs' && nm ? `<span class="badge">${nm}</span>` : ''}</button>`).join('')}
    <span class="grow"></span><a href="/" target="_blank">${ic('external')} Ver portafolio</a></nav>
    <main id="main">${S[sect]()}</main>
    <div class="savebar"><span class="st"></span><button class="btn accent" id="save">Guardar cambios</button></div></div>`;
  updateBar();
}
function rerender() { const y = scrollY; $('#main').innerHTML = S[sect](); const n = $('.nav'); if (n) $$('[data-go]', n).forEach((b) => (id(b) === sect ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'))); scrollTo(0, y); }
const id = (b) => b.dataset.go;
async function go(s) {
  sect = s; location.hash = s;
  if (s === 'msgs') { await loadMsgs(); }
  renderApp(); scrollTo(0, 0);
  if (s === 'msgs') { localStorage.setItem('seenMsg', (MSGS[0] || {}).id || ''); }
}
async function loadMsgs() {
  try {
    const seen = localStorage.getItem('seenMsg') || '';
    MSGS = ((await api('messages')).messages || []).map((m) => ({ ...m, isNew: m.id > seen }));
  } catch {}
}

/* ---------- Guardar ---------- */
async function save() {
  const slugs = new Set();
  for (const c of D.categories) {
    c.slug = slugify(c.slug || c.name);
    if (slugs.has(c.slug)) { toast(`Hay dos categorías con la misma dirección «${c.slug}». Cámbiala en Categorías.`, true); return; }
    slugs.add(c.slug);
  }
  saving = true; updateBar();
  try {
    await api('data', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(D) });
    dirty = false; toast('Guardado. Tu portafolio ya está actualizado.');
  } catch (e) {
    if (e.status === 401) { toast('Tu sesión expiró. Inicia sesión de nuevo.', true); setTimeout(() => location.reload(), 1500); }
    else toast('No se pudo guardar: ' + e.message, true);
  }
  saving = false; updateBar();
}

/* ---------- Imágenes ---------- */
async function toBlob(file, max, square) {
  if (file.type === 'image/gif') { if (file.size > 5.5e6) throw new Error('El GIF supera 5 MB.'); return file; }
  const bmp = await createImageBitmap(file);
  let sx = 0, sy = 0, sw = bmp.width, sh = bmp.height;
  if (square) { const m = Math.min(sw, sh); sx = (sw - m) / 2; sy = (sh - m) / 2; sw = sh = m; }
  const k = Math.min(1, max / Math.max(sw, sh));
  const cv = document.createElement('canvas'); cv.width = Math.round(sw * k); cv.height = Math.round(sh * k);
  cv.getContext('2d').drawImage(bmp, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
  let b = await new Promise((r) => cv.toBlob(r, 'image/webp', 0.86));
  if (!b || b.type !== 'image/webp') b = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.88));
  return b;
}
function setPrev(path, url) {
  const safe = safeUrl(url);
  $$(`[data-prev="${path}"]`).forEach((e) => (e.style.backgroundImage = safe ? `url('${safe.replace(/['"()\s]/g, encodeURIComponent)}')` : ''));
}
async function upload(input) {
  const f = input.files[0]; if (!f) return;
  const wrap = input.closest('.imgf'); wrap.classList.add('busy');
  try {
    const blob = await toBlob(f, +input.dataset.max || 1600, !!input.dataset.square);
    const r = await fetch('/api/upload', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': blob.type }, body: blob });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.message || 'No se pudo subir la imagen.');
    const path = input.dataset.upload;
    setPath(path, j.url); markDirty(); setPrev(path, j.url);
    $(`input[data-path="${path}"]`, wrap).value = j.url;
    toast('Imagen subida. Recuerda guardar los cambios.');
  } catch (e) { toast(e.message || 'No se pudo procesar la imagen.', true); }
  wrap.classList.remove('busy'); input.value = '';
}

/* ---------- Eventos ---------- */
const BLANK = {
  links: () => ({ id: uid('l'), platform: 'link', label: 'Nuevo enlace', url: '', verified: false }),
  tools: () => ({ id: uid('t'), name: '', level: 70 }),
  categories: () => ({ id: uid('c'), name: 'Nueva categoría', slug: 'nueva-' + Math.random().toString(36).slice(2, 5), description: '', emoji: '🎬' }),
  clients: () => ({ id: uid('cl'), name: '', logo: '', description: '', testimonial: '', url: '' }),
  timeline: () => ({ id: uid('tl'), date: String(new Date().getFullYear()), title: '', text: '' }),
  services: () => ({ id: uid('s'), title: '', text: '', price: '' }),
  videos: () => ({ id: uid('v'), title: '', url: '', thumb: '', cats: [], description: '', date: new Date().toISOString().slice(0, 10), featured: false, views: 0, likes: 0, ratio: '16:9', client: '' }),
};
document.addEventListener('input', (e) => {
  const t = e.target, path = t.dataset && t.dataset.path;
  if (t.id === 'vq') { vf.q = t.value; $('#vlist').innerHTML = videoList(); return; }
  if (!path || t.dataset.kind === 'multi') return;
  let v;
  if (t.type === 'checkbox') v = t.checked;
  else if (t.dataset.kind === 'list') v = t.value.split(',').map((s) => s.trim()).filter(Boolean);
  else if (t.dataset.kind === 'num' || t.type === 'range' || t.type === 'number') v = t.value === '' ? 0 : +t.value;
  else v = t.value;
  // slug automático al escribir el nombre de una categoría
  const m = /^categories\.(\d+)\.name$/.exec(path);
  if (m) { const c = D.categories[+m[1]], auto = slugify(c.name) === c.slug || /^nueva-/.test(c.slug); if (auto) { c.slug = slugify(v); const s = $(`[data-path="categories.${m[1]}.slug"]`); if (s) s.value = c.slug; } }
  setPath(path, v); markDirty();
  $$(`[data-live="${path}"]`).forEach((el) => (el.textContent = v || ''));
  $$(`[data-prev="${path}"]`).length && setPrev(path, v);
  const d = $(`[data-detect="${path}"]`); if (d) { d.innerHTML = detectHTML(v); const it = t.closest('.item'); if (it) { const th = $('.vthumb', it); const tmp = document.createElement('div'); tmp.innerHTML = vThumb(D.videos[+path.split('.')[1]]); th.replaceWith(tmp.firstElementChild); } }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'vc') { vf.cat = t.value; $('#vlist').innerHTML = videoList(); return; }
  if (t.dataset.kind === 'multi') {
    const path = t.dataset.path;
    setPath(path, $$(`[data-path="${path}"]:checked`).map((x) => x.value)); markDirty();
    const it = t.closest('.item'); if (it) { const v = D.videos[+path.split('.')[1]]; $('.t small', it).innerHTML = esc((v.cats || []).map((id) => (D.categories.find((c) => c.id === id) || {}).name).filter(Boolean).join(', ') || 'Sin categoría') + (v.featured ? ' · <span class="star">★ destacado</span>' : ''); }
  } else if (t.dataset.upload) upload(t);
  else if (t.id === 'importf') importFile(t);
  else if (t.dataset.path && /\.(platform|featured)$/.test(t.dataset.path)) { const it = t.closest('.item'); if (it && /featured$/.test(t.dataset.path)) { const v = D.videos[+t.dataset.path.split('.')[1]]; const s = $('.t small', it); s.innerHTML = s.innerHTML.replace(/ · <span class="star">.*<\/span>/, '') + (v.featured ? ' · <span class="star">★ destacado</span>' : ''); } }
});
document.addEventListener('toggle', (e) => { const it = e.target; if (it.classList && it.classList.contains('item')) it.open ? openIds.add(it.dataset.id) : openIds.delete(it.dataset.id); }, true);

document.addEventListener('click', async (e) => {
  const g = e.target.closest('[data-go]');
  if (g) { e.preventDefault(); await go(g.dataset.go); if (g.hasAttribute('data-newvideo')) addItem('videos'); return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, key = b.dataset.key, i = +b.dataset.i;
  if (['mv', 'del'].includes(a)) { e.preventDefault(); e.stopPropagation(); }
  if (a === 'add') addItem(key);
  else if (a === 'mv') { const arr = D[key], j = i + +b.dataset.dir; [arr[i], arr[j]] = [arr[j], arr[i]]; markDirty(); rerender(); }
  else if (a === 'del') {
    const it = D[key][i], name = it.title || it.name || it.label || 'este elemento';
    if (!confirm(`¿Eliminar «${name}»?`)) return;
    if (key === 'categories') D.videos.forEach((v) => (v.cats = (v.cats || []).filter((c) => c !== it.id)));
    D[key].splice(i, 1); markDirty(); rerender();
  }
  else if (a === 'clearimg') { setPath(b.dataset.path, ''); markDirty(); const inp = $(`input[data-path="${b.dataset.path}"]`); if (inp) inp.value = ''; setPrev(b.dataset.path, ''); }
  else if (a === 'swatch') { D.settings.accent = b.dataset.c; $('input[type=color]').value = b.dataset.c; markDirty(); }
  else if (a === 'quickadd') {
    const url = $('#qv-url').value.trim(), title = $('#qv-title').value.trim(), cat = $('#qv-cat').value;
    if (!url && !title) { toast('Escribe al menos un link o un título.', true); return; }
    const v = BLANK.videos(); v.url = url; v.title = title || 'Video sin título'; v.cats = cat ? [cat] : [];
    D.videos.unshift(v); openIds.add(v.id); markDirty(); rerender(); toast('Video añadido. Revisa los detalles y guarda.');
  }
  else if (a === 'delmsg') { try { await api('messages/' + b.dataset.id, { method: 'DELETE' }); MSGS = MSGS.filter((m) => m.id !== b.dataset.id); rerender(); } catch (x) { toast(x.message, true); } }
  else if (a === 'export') { const url = URL.createObjectURL(new Blob([JSON.stringify(D, null, 2)], { type: 'application/json' })); const l = document.createElement('a'); l.href = url; l.download = 'portafolio-copia-' + new Date().toISOString().slice(0, 10) + '.json'; l.click(); URL.revokeObjectURL(url); }
  else if (a === 'logout') { await api('logout', { method: 'POST' }).catch(() => {}); dirty = false; location.reload(); }
});
function addItem(key) {
  const it = BLANK[key](); D[key].unshift(it); openIds.add(it.id); markDirty();
  if (key === 'videos') { vf.q = ''; vf.cat = ''; }
  rerender();
  const el = $(`.item[data-id="${it.id}"]`); if (el) { el.open = true; const f = $('input[type=text],textarea', el); f && f.focus({ preventScroll: false }); }
}
async function importFile(inp) {
  try {
    const d = normalize(JSON.parse(await inp.files[0].text()));
    if (!confirm('Esto reemplaza lo que ves ahora por el contenido de la copia. ¿Continuar?')) return;
    D = d; markDirty(); rerender(); toast('Copia cargada. Pulsa Guardar para aplicarla.');
  } catch { toast('El archivo no es una copia válida.', true); }
  inp.value = '';
}
document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'pwform') return;
  e.preventDefault();
  const f = new FormData(e.target), err = $('#pwerr'); err.textContent = '';
  try { await api('password', { json: { current: f.get('cur'), next: f.get('next') } }); localStorage.setItem('pwChanged', '1'); e.target.reset(); toast('Contraseña actualizada.'); }
  catch (x) { err.textContent = x.message; }
});
document.addEventListener('click', (e) => { if (e.target.closest('#save')) save(); });
document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (D && dirty) save(); } });
addEventListener('hashchange', () => { const h = location.hash.slice(1); if (D && S[h] && h !== sect) go(h); });

/* ---------- Acceso ---------- */
function loginScreen(info) {
  if (info.kv === false) {
    root.innerHTML = `<div class="login"><div class="card"><h1>Falta un paso</h1><p>El almacenamiento de datos todavía no está conectado.</p>
      <p>En Cloudflare, entra a tu proyecto de Pages → <b>Settings → Bindings</b> y agrega un <b>KV namespace</b> con el nombre de variable <code>PORTFOLIO</code>. Luego vuelve a desplegar.</p></div></div>`;
    return;
  }
  root.innerHTML = `<div class="login"><form id="lf"><h1>Panel del portafolio</h1><p>Entra para editar tu contenido.</p>
    <label class="field"><span class="l">Usuario</span><input type="text" name="user" autocomplete="username" value="admin" required></label>
    <label class="field"><span class="l">Contraseña</span><input type="password" name="password" autocomplete="current-password" required autofocus></label>
    <div class="err" id="lerr" role="alert"></div><button class="btn accent" type="submit">Entrar</button>
    ${info.configured ? '' : '<p class="note">Aún no se definió <code>ADMIN_PASSWORD</code> en Cloudflare.</p>'}</form></div>`;
  $('#lf').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = new FormData(e.target), btn = $('button', e.target); btn.disabled = true; $('#lerr').textContent = '';
    try { await api('login', { json: { user: f.get('user'), password: f.get('password') } }); await start(); }
    catch (x) { $('#lerr').textContent = x.message; btn.disabled = false; }
  });
}
async function start() {
  let info;
  try { info = await api('me'); } catch { info = { kv: false }; }
  if (!info.authenticated) { loginScreen(info); return; }
  try {
    const j = await api('data');
    STATS = j.stats || {};
    D = normalize(j.data || (await (await fetch('/data/default.json')).json()));
    if (!j.data) dirty = true; // primer uso: hay que guardar para publicar los datos base
  } catch (e) { toast('No se pudieron cargar los datos: ' + e.message, true); return; }
  await loadMsgs();
  const h = location.hash.slice(1); if (S[h]) sect = h;
  renderApp();
}
start();
