# Portafolio de editor de video (Cloudflare Workers + GitHub)

- `public/` → sitio público (`index.html`, `assets/`) y panel (`admin/`)
- `src/worker.js` + `src/api.js` → API (login, guardado, imágenes, vistas/likes, mensajes)
- `wrangler.jsonc` → configuración de Cloudflare (el nombre debe coincidir con tu proyecto: `alerteditor`)

## Publicar
1. Sube TODO el contenido de esta carpeta a GitHub (en la raíz del repo debe verse `wrangler.jsonc`).
2. En Cloudflare, tu proyecto conectado al repo usa: Build command: (vacío) · Deploy command: `npx wrangler deploy`.
   Se despliega solo con cada commit.
3. El KV `PORTFOLIO` se crea automáticamente en el primer deploy. Si falla, crea un namespace en
   Storage & Databases → KV y pega su id en `wrangler.jsonc`:
   `"kv_namespaces": [{ "binding": "PORTFOLIO", "id": "TU_ID" }]`
4. En el proyecto → Settings → Variables and secrets, agrega como **Secret**:
   `ADMIN_PASSWORD` (tu clave) y `SESSION_SECRET` (texto largo aleatorio). `ADMIN_USER` es opcional (por defecto `admin`).
5. Vuelve a desplegar (Deployments → Retry) y entra a `/admin/`.

## Probar en tu PC
```
cp .dev.vars.example .dev.vars
npm install
npm run dev     # http://localhost:8788  y  /admin/
```

## Videos de Tumblr
Clic derecho en el video → «Copiar dirección del video» (termina en `.mp4`) y pégalo en Panel → Videos.
También funcionan YouTube, Vimeo, Google Drive y Streamable.
