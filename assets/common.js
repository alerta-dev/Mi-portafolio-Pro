/* Utilidades compartidas entre el sitio público y el panel de administración */
(function () {
  const PF = (window.PF = {});

  PF.esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  PF.safeUrl = (u) => {
    u = String(u ?? '').trim();
    return /^(https?:\/\/|mailto:|\/(?!\/))/i.test(u) ? u : '';
  };

  PF.uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

  PF.fmtNum = (n) => {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return String(Math.round(n));
  };

  /* ---------- iconos (trazos simples, sin dependencias) ---------- */
  const P = {
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>',
    heart: '<path d="M12 20s-8-4.9-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.1-8 11-8 11z"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    up: '<path d="m6 15 6-6 6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    left: '<path d="m15 6-6 6 6 6"/>',
    right: '<path d="m9 6 6 6-6 6"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    logout: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    folder: '<path d="M3 6h6l2 2h10v11H3z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5M16 4.5a3.5 3.5 0 0 1 0 7M22 20c0-2.6-1.7-4.3-4-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 13h18"/>',
    yt: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/>',
    x: '<path d="M5 5l14 14M19 5 5 19"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 5.2A9.7 9.7 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.5 6.6C3.7 8.4 2 12 2 12s4 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m4 18 5-5 4 4 3-3 4 4"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  };
  PF.icon = (name, cls = '') =>
    `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

  /* ---------- plataformas de redes ---------- */
  PF.PLATFORMS = [
    { key: 'youtube', label: 'YouTube', color: '#ff2d3d', abbr: 'YT', host: /youtube\.com|youtu\.be/ },
    { key: 'x', label: 'X (Twitter)', color: '#e7e7e7', abbr: 'X', host: /(^|\.)x\.com|twitter\.com/ },
    { key: 'instagram', label: 'Instagram', color: '#e1306c', abbr: 'IG', host: /instagram\.com/ },
    { key: 'tiktok', label: 'TikTok', color: '#25f4ee', abbr: 'TT', host: /tiktok\.com/ },
    { key: 'twitch', label: 'Twitch', color: '#9146ff', abbr: 'TW', host: /twitch\.tv/ },
    { key: 'discord', label: 'Discord', color: '#5865f2', abbr: 'DC', host: /discord\.(gg|com)/ },
    { key: 'behance', label: 'Behance', color: '#1769ff', abbr: 'Bē', host: /behance\.net/ },
    { key: 'tumblr', label: 'Tumblr', color: '#3b5a7a', abbr: 'Tb', host: /tumblr\.com/ },
    { key: 'telegram', label: 'Telegram', color: '#2aabee', abbr: 'TG', host: /t\.me|telegram\./ },
    { key: 'linkedin', label: 'LinkedIn', color: '#0a8cd9', abbr: 'in', host: /linkedin\.com/ },
    { key: 'github', label: 'GitHub', color: '#c9d1d9', abbr: 'GH', host: /github\.com/ },
    { key: 'kofi', label: 'Ko-fi', color: '#ff5e5b', abbr: 'Kf', host: /ko-fi\.com/ },
    { key: 'patreon', label: 'Patreon', color: '#ff6b5a', abbr: 'Pa', host: /patreon\.com/ },
    { key: 'whatsapp', label: 'WhatsApp', color: '#25d366', abbr: 'WA', host: /wa\.me|whatsapp\./ },
    { key: 'web', label: 'Sitio web', color: '#9aa4b2', abbr: '', host: null },
    { key: 'other', label: 'Otro', color: '#9aa4b2', abbr: '', host: null },
  ];
  PF.platform = (key) => PF.PLATFORMS.find((p) => p.key === key) || PF.PLATFORMS[PF.PLATFORMS.length - 1];
  PF.detectPlatform = (url) => {
    try {
      const h = new URL(url).hostname;
      const p = PF.PLATFORMS.find((p) => p.host && p.host.test(h));
      return p ? p.key : '';
    } catch {
      return '';
    }
  };
  PF.platformBadge = (key) => {
    const p = PF.platform(key);
    return `<span class="pbadge" style="--pc:${p.color}">${p.abbr ? PF.esc(p.abbr) : PF.icon('link')}</span>`;
  };

  /* ---------- videos: detectar el origen del enlace ---------- */
  PF.videoInfo = (url) => {
    url = String(url || '').trim();
    if (!url) return { type: 'none' };
    let u;
    try {
      u = new URL(url);
    } catch {
      return { type: 'none' };
    }
    const h = u.hostname.replace(/^www\./, '');
    const ok = (s) => /^[\w-]{3,64}$/.test(s || '');
    if (h === 'youtu.be' && ok(u.pathname.slice(1))) return { type: 'youtube', id: u.pathname.slice(1) };
    if (/(^|\.)youtube\.com$/.test(h)) {
      const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]+)/);
      if (m) return { type: 'youtube', id: m[1], short: u.pathname.startsWith('/shorts') };
      if (ok(u.searchParams.get('v'))) return { type: 'youtube', id: u.searchParams.get('v') };
    }
    if (h === 'vimeo.com') {
      const m = u.pathname.match(/\/(\d+)/);
      if (m) return { type: 'vimeo', id: m[1] };
    }
    if (h === 'player.vimeo.com') {
      const m = u.pathname.match(/\/video\/(\d+)/);
      if (m) return { type: 'vimeo', id: m[1] };
    }
    if (h === 'streamable.com') {
      const m = u.pathname.match(/^\/(?:e\/)?([a-z0-9]+)$/i);
      if (m) return { type: 'streamable', id: m[1] };
    }
    if (h === 'drive.google.com') {
      const m = u.pathname.match(/\/file\/d\/([\w-]+)/);
      if (m) return { type: 'drive', id: m[1] };
    }
    if (/\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(u.pathname + u.search) || /(^|\.)media\.tumblr\.com$/.test(h))
      return { type: 'file', url };
    return { type: 'external', url };
  };

  PF.thumbOf = (v) => {
    if (v.thumb) return v.thumb;
    const i = PF.videoInfo(v.url);
    if (i.type === 'youtube') return `https://i.ytimg.com/vi/${i.id}/hqdefault.jpg`;
    return '';
  };

  PF.hue = (s) => {
    let h = 0;
    for (const c of String(s || 'x')) h = (h * 31 + c.charCodeAt(0)) % 360;
    return h;
  };

  /* ---------- datos por defecto (se usan hasta que guardes por primera vez) ---------- */
  PF.defaults = () => ({
    profile: {
      name: 'Tu Nombre',
      role: 'Editor de video',
      roles: ['Editor de video', 'Motion graphics'],
      story: 'Edito videos con ritmo, humor y mucho cariño por el detalle. Cuéntale al mundo quién eres desde el panel.',
      location: '',
      email: '',
      contactUrl: '',
      availability: 'available',
      availabilityText: 'Disponible para nuevos proyectos',
      languages: ['Español'],
      experience: 'Escribe aquí tu experiencia: cuánto llevas editando, con qué tipo de creadores has trabajado, qué te hace diferente…',
      avatar: '',
      banner: '',
      bannerY: 30,
    },
    links: [],
    software: [
      { id: 'sw1', name: 'Adobe Premiere Pro', note: 'Edición principal' },
      { id: 'sw2', name: 'After Effects', note: 'Animación y efectos' },
    ],
    equipment: [],
    services: [
      { id: 'sv1', title: 'Edición de YouTube', description: 'Cortes, ritmo, subtítulos, efectos de sonido y música.', price: 'Desde $—' },
      { id: 'sv2', title: 'Shorts / Reels / TikTok', description: 'Formato vertical dinámico con subtítulos animados.', price: 'Desde $—' },
    ],
    categories: [
      { id: 'c-youtube', name: 'YouTube', description: 'Videos largos' },
      { id: 'c-shorts', name: 'Shorts y Reels', description: 'Formato vertical' },
      { id: 'c-stream', name: 'Streams y clips', description: '' },
      { id: 'c-motion', name: 'Animación', description: '' },
    ],
    videos: [
      { id: 'v1', title: 'Video de ejemplo 1', url: '', thumb: '', category: 'c-youtube', description: 'Reemplázalo desde el panel.', date: '' },
      { id: 'v2', title: 'Video de ejemplo 2', url: '', thumb: '', category: 'c-shorts', description: '', date: '' },
      { id: 'v3', title: 'Video de ejemplo 3', url: '', thumb: '', category: 'c-stream', description: '', date: '' },
      { id: 'v4', title: 'Video de ejemplo 4', url: '', thumb: '', category: 'c-motion', description: '', date: '' },
      { id: 'v5', title: 'Video de ejemplo 5', url: '', thumb: '', category: 'c-youtube', description: '', date: '' },
      { id: 'v6', title: 'Video de ejemplo 6', url: '', thumb: '', category: 'c-shorts', description: '', date: '' },
    ],
    clients: [],
    timeline: [],
    settings: {
      siteTitle: '',
      description: '',
      accent: '#7aa2ff',
      counters: true,
      viewsOffset: 0,
      likesOffset: 0,
      showClients: true,
      showTimeline: true,
      showServices: true,
      footer: '',
    },
  });

  PF.normalize = (d) => {
    const def = PF.defaults();
    if (!d || typeof d !== 'object') return def;
    const out = { ...def, ...d };
    out.profile = { ...def.profile, ...(d.profile || {}) };
    out.settings = { ...def.settings, ...(d.settings || {}) };
    for (const k of ['links', 'software', 'equipment', 'services', 'categories', 'videos', 'clients', 'timeline'])
      out[k] = Array.isArray(d[k]) ? d[k] : def[k];
    if (!Array.isArray(out.profile.roles)) out.profile.roles = [];
    if (!Array.isArray(out.profile.languages)) out.profile.languages = [];
    return out;
  };

  /* ---------- API ---------- */
  PF.api = async (path, opts = {}) => {
    const res = await fetch('/api/' + path, { credentials: 'same-origin', ...opts });
    let body = null;
    try {
      body = await res.json();
    } catch {}
    if (!res.ok) {
      const err = new Error((body && body.error) || `Error ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return body;
  };

  PF.load = async () => {
    try {
      const r = await PF.api('data');
      return { data: PF.normalize(r.data), stats: r.stats || { views: {}, likes: {} }, live: !!r.data };
    } catch {
      return { data: PF.defaults(), stats: { views: {}, likes: {} }, live: false };
    }
  };
})();
