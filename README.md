# Portafolio de editor de video

Sitio estático + panel de administración (`/admin/`) con login. Pensado para **GitHub + Cloudflare Pages**.
Los datos (perfil, videos, categorías, imágenes subidas, mensajes) se guardan en **Cloudflare KV**, así que
puedes editar todo desde el panel sin tocar el código.

## Estructura
- `index.html`, `assets/` → sitio público
- `admin/` → panel de administración
- `functions/api/[[path]].js` → API (login, guardado, subida de imágenes, vistas/likes, mensajes)
- `data/default.json` → contenido de ejemplo inicial

## Pasos para publicar
1. **GitHub**: crea un repositorio nuevo y sube TODO el contenido de esta carpeta (incluida `functions`).
2. **Cloudflare → Workers & Pages → Create → Pages → Connect to Git** y elige el repositorio.
   - Framework preset: `None`
   - Build command: (vacío)
   - Build output directory: `/`
3. **Crear el almacenamiento**: Cloudflare → Storage & Databases → **KV** → Create namespace (por ejemplo `portafolio-data`).
4. **Conectarlo**: proyecto de Pages → Settings → **Bindings** → Add → **KV namespace**
   - Variable name: `PORTFOLIO` (exactamente así, en mayúsculas)
   - KV namespace: el que creaste (Production, y Preview si quieres).
5. **Contraseña**: Settings → **Variables and secrets** → agrega como *Secret*:
   - `ADMIN_PASSWORD` → tu contraseña
   - `SESSION_SECRET` → un texto largo y aleatorio
   - `ADMIN_USER` → (opcional) tu usuario; si no lo pones es `admin`
6. **Vuelve a desplegar** (Deployments → ⋯ → Retry deployment, o haz un commit nuevo).
7. Entra a `https://TU-PROYECTO.pages.dev/admin/`, inicia sesión, **cambia la contraseña en Ajustes**, edita tu contenido y pulsa **Guardar cambios**.
8. (Opcional) Dominio propio: Pages → Custom domains.

## Probar en tu PC
```
cp .dev.vars.example .dev.vars   # edita la contraseña
npm install
npm run dev                      # http://localhost:8788  y  /admin/
```

## Videos de Tumblr
Sube el video a Tumblr, abre el post, clic derecho en el video → «Copiar dirección del video»
(termina en `.mp4`) y pégalo en el panel → Videos. También funcionan YouTube, Vimeo, Google Drive y Streamable.

## Notas
- No incluí `wrangler.toml` a propósito: si lo agregas, Cloudflare ignora los Bindings del panel.
- Recomendado: protege `/admin/*` con Cloudflare Access (Zero Trust, gratis) como segunda capa de login.
- Las imágenes subidas desde el panel se guardan en KV (se reducen automáticamente). Los videos nunca se suben aquí.
