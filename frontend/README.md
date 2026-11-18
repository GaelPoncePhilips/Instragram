# Ronda — frontend

Red social con la estructura de Instagram y piel Material 3 Expressive. React 19 + TypeScript strict + Vite + React Router + Tailwind 4 + Zustand. Runtime y gestor de paquetes: **Bun**.

## Levantar todo (desde la raíz del repo)

```bash
./run.sh          # backend (:8000) + frontend (:5173) contra el backend real
./run.sh --mock   # solo el frontend con el backend simulado
```

`run.sh` crea el venv del backend, instala dependencias (pip y bun), crea `backend/.env` desde `.env.example` si no existe (y se detiene para que completes `DATABASE_URL` y `JWT_SECRET`), y cierra los dos procesos con Ctrl+C. El frontend llama al backend por el proxy `/api` de Vite, así no hace falta CORS y también funciona desde el celular.

## Instalar y ejecutar

```bash
cd frontend
bun install
cp .env.example .env        # opcional: por defecto usa el mock
bun run dev                 # http://localhost:5173 (y la IP de tu red, para el celular)
```

Otros scripts:

```bash
bun run build               # tsc -b + vite build
bunx tsc --noEmit -p tsconfig.app.json
bun run lint                # oxlint
bun run preview             # sirve dist/ en :4173
```

### Probar desde el celular
`vite.config.ts` tiene `server.host: true`. Con `bun run dev`, Vite muestra una línea `Network: http://<IP-de-tu-PC>:5173`. Abrila desde el celular conectado al mismo Wi-Fi. Si no carga, permití Bun/Node en el Firewall de Windows (o marcá la red como Privada).

### Cuentas de prueba (mock)
Contraseña de todas: `ronda123`. Email: username sin "." ni "_" + `@ronda.dev` (p. ej. `anarios@ronda.dev`). En el login hay chips para rellenarlas, y en "Más → Cambiar usuario (dev)" o en Ajustes se cambia de cuenta sin recargar.

- `ana.rios`: privada; cuenta principal con solicitudes, invitación a álbum y DMs sin leer.
- `ines_lee`: privada, Ana no la sigue → 403.
- `kike.troll`: bloqueado por Ana → 404.
- `juli.run`: reels desactivados → 403 en Reels.

El mock vive en memoria: **recargar la página reinicia los datos** (la sesión se mantiene).

## Instalar como app (PWA)

```bash
./run.sh --pwa      # build de producción + preview en :4173 (con service worker)
```

- **En la PC**: abrí http://localhost:4173 y usá "Instalar app" (Configuración, menú "Más" o el ícono de la barra del navegador).
- **Android (Chrome)**: el service worker y el botón de instalar exigen **https** (o localhost). Por la IP de la red (`http://192.168…:4173`) Chrome no lo ofrece. Para probarlo:
  - en el celular, abrí `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, agregá `http://<IP-de-tu-PC>:4173` y reiniciá Chrome;
  - o exponé el puerto con un túnel https (cloudflared, ngrok) o publicá el build en un hosting con https.
- **iPhone (Safari)**: Compartir → "Agregar a inicio" funciona también por http y abre a pantalla completa, aunque sin service worker.

## Estructura

```
src/
  app/          App (rutas), layout (BottomNav, MobileTopBar, SideNav, paneles, CreateMenu, DevSwitcher)
  components/   ui/ (componentes M3 propios), shared.tsx (UserRow, FollowButton, PostGrid…), ErrorBoundary
  features/     auth, feed, post, stories, profile, highlights, settings, search, explore, hashtags,
                reels, dm, notifications, create, albums
  services/     client.ts (cliente único) + un archivo por dominio · temporal/ (parches)
  mocks/        db, seed, rules, server, handlers/ · temporal/ (endpoints que faltan en el contrato)
  stores/       session, ui, badges (Zustand)
  theme/        color.ts (HCT → --md-sys-color-*), motion.ts (springs → linear())
  types/        api.ts (contrato tal cual, snake_case), temporal.ts
```

## Cómo pasar del mock al backend real

1. Levantá el backend (`backend/README.md`) en `http://localhost:8000`.
2. En `frontend/.env`:
   ```
   VITE_USE_MOCK=false
   VITE_API_URL=http://localhost:8000/api
   ```
   Si el front corre en otro origen, el backend tiene que habilitar CORS para `http://localhost:5173` (y para la IP de la red si probás desde el celular).
3. Los **parches temporales siguen respondiendo desde el mock** aunque `VITE_USE_MOCK=false`: notificaciones, búsqueda de usuarios, usuario por id, videos en álbumes, avatares, guardados y cuentas de desarrollo. Con backend real, el mock identifica al usuario por su `username`.
4. Cuando el backend implemente uno de esos endpoints, poné `VITE_TEMPORAL_<NOMBRE>=false` y seguí `docs/TEMPORAL.md` (raíz del repo) para saber qué borrar.
5. Switcher de desarrollo: hace login real con las cuentas del seed. En el backend real hay que crear esos usuarios con la contraseña `ronda123`, o poner `VITE_TEMPORAL_DEV_CUENTAS=false`.

## Documentación
- `docs/API.md`: endpoints que usa el frontend (tablas y DTOs). El contrato fuente de verdad es `../docs/API.md`.
- `../docs/TEMPORAL.md`: parches temporales.
- `../docs/CHECKLIST.md`: estado de cada HU y extra.
- `../docs/DISENO.md`: decisiones de diseño. `../docs/investigacion.md`: investigación.
- `TASKS.md`: lista de tareas.
