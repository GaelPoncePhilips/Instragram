# Tareas del frontend

Marcar `[x]` al terminar. Orden: base → API y mock → HU1–HU12 → reels, DMs, destacadas → álbumes → pulido.

## Base
- [x] Proyecto Vite + React + TS strict con Bun
- [x] Tokens M3 Expressive: color HCT (semilla #3D5AFE), tipografía Roboto Flex, formas, springs
- [x] Layout: barra inferior móvil, barra superior móvil, barra lateral escritorio (colapsable), panel deslizable
- [x] Selector "Crear" (FAB menu móvil / diálogo escritorio)
- [x] Switcher de usuario de desarrollo sin recargar
- [x] Componentes UI: Button/ButtonGroup, IconButton, Avatar con anillos, Sheet, Dialog, Confirm, ActionMenu, Switch, Tabs, Chips, SearchBar, TextField, LoadingShape, Snackbar, ripple

## API y mock
- [x] Tipos del contrato (src/types/api.ts)
- [x] Cliente API único (Bearer, 401, mock/real, temporalRequest)
- [x] Servicios por dominio con endpoint comentado
- [x] Backend simulado con todas las rutas, reglas y errores del contrato
- [x] Datos semilla (11 usuarios, 34 posts, 7 reels, stories, destacadas, 5 álbumes, DMs, notificaciones)
- [x] Parches temporales aislados (services/temporal, mocks/temporal)

## Pantallas e historias
- [x] HU1 Registro e inicio de sesión (validación en vivo, 409)
- [x] HU1 Perfil (encabezado, contadores, bio, pestañas, grilla 3×1:1)
- [x] HU2 Publicar foto con hashtags automáticos
- [x] HU3 Seguir / Solicitado / Siguiendo, solicitudes
- [x] HU4 Cuenta privada (403) y pasar a pública
- [x] HU5 Likes (doble tap, lista) y comentarios (crear/borrar)
- [x] HU6 Feed con scroll infinito
- [x] HU7 Stories: fila, visor, subir, archivo
- [x] HU8 Mejores amigos (lista, story verde)
- [x] HU9 Vistas de story ("Visto por N")
- [x] HU10 Bloqueos (404, lista, desbloquear)
- [x] HU11 Tendencias y página de hashtag
- [x] HU12 Estadísticas y "No me siguen"
- [x] Buscar y Explorar
- [x] Post: detalle (modal escritorio / pantalla móvil), compartir por DM, guardar
- [x] Notificaciones (panel escritorio, pantalla móvil, todas los tipos)
- [x] Ajustes (privada, reels desactivados, tema)

## Extras
- [x] Reels: visor vertical con snap, autoplay, comentarios, estado desactivado (403)
- [x] DMs: bandeja, solicitudes, grupos, chat con cursor, compartir post, anular envío, leído, bloqueo
- [x] Destacadas: crear desde archivo, editar, reordenar, borrar, visor
- [x] Álbumes: pestaña en perfil (portadas cuadradas, invitaciones con Aceptar/Rechazar)
- [x] Álbumes: crear en 4 pasos
- [x] Álbumes: pantalla con roles (admin/miembro), invitar, quitar, subir fotos y videos, salir, eliminar

## Cierre
- [ ] Responsive 360 / 768 / 1280 (verificado por DOM; falta revisión visual)
- [x] Estados vacío / carga / error en todas las pantallas
- [x] `bun run build`, `bunx tsc --noEmit`, `bun run lint`
- [x] Recorrido: crear álbum → invitar → cambiar usuario → aceptar → subir → ver en todos los perfiles
- [x] README, docs/API.md, docs/TEMPORAL.md, docs/CHECKLIST.md
