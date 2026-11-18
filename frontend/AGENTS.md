# Guía para agentes — frontend de Ronda

App: red social con **estructura de Instagram** y **piel Material 3 Expressive**. Si dudás entre una solución original y la de Instagram, elegí la de Instagram. Español rioplatense en la UI ("Seguir", "Añade un comentario…", "Ver los N comentarios").

Leé antes de escribir: `../docs/API.md` (contrato), `../docs/DISENO.md` (decisiones), `src/types/api.ts`, `src/services/*.ts`, `src/components/ui/*`, `src/components/shared.tsx`, `src/lib/hooks.ts`, `src/lib/time.ts`, `src/index.css`.

## Reglas técnicas (obligatorias)
- Bun: `export PATH="$HOME/.bun/bin:$PATH"` y luego `bunx tsc --noEmit -p tsconfig.app.json`, `bun run lint`, `bun run build`. Nada de npm/yarn/pnpm. No instales dependencias nuevas.
- TypeScript strict, **prohibido `any`**. `verbatimModuleSyntax`: importá tipos con `import type`. Sin enums ni parameter properties (erasableSyntaxOnly).
- Toda llamada al backend pasa por `src/services/*` (nunca `fetch` directo). Errores: `ApiError` (status, error, message) y `mensajeDeError(e)`; snackbar con `snackbar(texto)` de `src/stores/ui`.
- Usuario logueado: `useYo()` de `src/stores/session`. Contadores de nav: `useBadges`.
- Carga de datos: `useAsync(fn, deps)` y scroll infinito `useInfinite((offset, limit) => ..., deps, limit)` + `sentinelRef` (limit máx. 50).
- Archivos completos, sin "...". Solo tocá los archivos que te asignaron (más archivos nuevos dentro de tu carpeta de feature). Si necesitás algo de un archivo ajeno, usalo con la firma que ya tiene; no lo edites.
- Accesibilidad: `alt` en imágenes, `aria-label` en botones de ícono (`IconButton` lo exige), foco visible, Escape cierra (ya lo hacen `Dialog`/`Sheet`).
- Responsive real en 360, 768 y 1280 px. Móvil < 768 (`useIsMobile`), escritorio ≥ 1024 (`useIsDesktop`).
- Estados vacío / carga (`CenteredLoader`, `GridSkeleton`) / error (`ErrorState` con reintento) en cada pantalla. 403 privada → "Esta cuenta es privada"; 404 → "no disponible".

## Piel M3 Expressive (usar tokens, no colores sueltos)
- Colores Tailwind: `bg-surface`, `text-on-surface`, `text-on-surface-variant`, `bg-surface-container(-low|-high|-highest)`, `bg-primary`, `text-on-primary`, `bg-primary-container`, `bg-secondary-container`, `bg-tertiary-container`, `border-outline-variant`, `text-error`, `bg-scrim/50`, `text-amigos`/`bg-amigos` (verde mejores amigos).
- Tipografía: `type-display-s`, `type-headline-l|m|s`, `type-title-l|m|s`, `type-body-l|m|s`, `type-label-l|m|s` + `emphasized` para títulos y números clave.
- Radios: `rounded-xs`(4) `rounded-sm`(8) `rounded-md`(12) `rounded-lg`(16) `rounded-xl`(28) `rounded-full`. **Grillas de contenido: radio ≤ 4px, 3 columnas, cuadradas** (usá `PostGrid`).
- Movimiento: clases `spring-spatial-fast`, `spring-spatial`, `spring-effects`, `anim-slide-up`, `anim-scale-in`, `anim-fade-in`, `anim-fab-item`, `heart-pop`, `pop`. Respetan prefers-reduced-motion.
- Interacción: `state` (state layer) + `ripple`; botones `Button` (morph redondo→cuadrado, `selected`), `ButtonGroup` conectado, `IconButton` (toggle con `active`), `Switch` con ícono, `Tabs`, `InputChip`/`FilterChip`, `SearchBar`, `TextField`, `Sheet` (bottom en móvil / side en escritorio), `Dialog`, `Confirm`, `ActionMenu`, `LoadingShape`, `Avatar` (prop `anillo`: 'sin-ver' | 'visto' | 'amigos').
- Íconos: `<Icon name="..." fill={activo} />` (Material Symbols Rounded).

## Estilos prohibidos
Masonry/mosaico, tarjetas flotantes en el feed (el post va plano sobre `surface`, separado por espacio/borde fino), estética de dashboard, degradé magenta-naranja-amarillo, logo/fuente de Instagram, fondos crema, etiquetas de sección numeradas, etiquetas monoespaciadas, glassmorphism, barra de navegación de Material (píldora + etiquetas).

## Huecos temporales
Cualquier parche que inventes: marcado `// TEMPORAL`, aislado en `src/services/temporal/` o `src/mocks/temporal/`, con flag `VITE_TEMPORAL_<NOMBRE>` en `src/config/env.ts`, y avisalo en tu reporte final para documentarlo en `docs/TEMPORAL.md`. Los que ya existen están en `src/services/temporal/` (notificaciones, búsqueda, usuarioPorId, avatar, guardados, subida de archivos, cuentas dev).

## Datos de prueba (mock en memoria, se reinicia al recargar)
Contraseña de todos: `ronda123`. Emails: username sin "." ni "_" + `@ronda.dev` (ej. `anarios@ronda.dev`). `ana.rios` (privada, usuario principal), `bruno.dev`, `carla_foto` (privada), `diego.mar`, `eli.viaja`, `fede_music` (privada), `gabi.cocina`, `hugo.art`, `ines_lee` (privada, Ana no la sigue → 403), `juli.run` (reels desactivados), `kike.troll` (bloqueado por Ana → 404).
