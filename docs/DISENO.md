# Keepsy — decisiones de diseño

Principio: **estructura = Instagram, piel = Material 3 Expressive**. Ante la duda, gana la solución de Instagram.
Base: [`investigacion.md`](investigacion.md). Abajo, qué se verificó a mano, qué se descartó y qué se decidió.

## 1. Verificación de fuentes (hecha por mí, no por el subagente)

| Afirmación del informe | Fuente abierta | Resultado | Decisión |
|---|---|---|---|
| La barra inferior móvil de Instagram ahora es Inicio, Reels, DMs, Buscar, Perfil, con Crear arriba a la izquierda | [Dataconomy, 13/10/2025](https://dataconomy.com/2025/10/13/instagram-tests-reels-first-redesign-with-dms-at-the-center) y [Storrito](https://storrito.com/resources/what-instagrams-navigation-redesign-actually-changed/) | Coinciden en el orden y en que Crear sube a la esquina superior izquierda. **No coinciden** en qué va al centro (DMs vs Reels) ni en si es prueba (Dataconomy) o despliegue por oleadas desde feb/mar 2026 (Storrito, blog de un vendedor sin fuente primaria). Ninguna dice dónde quedó el corazón de notificaciones. | **Se mantiene la navegación pedida** (Inicio, Buscar, Crear, Reels, Perfil). Diferencia informada en el plan; cambiar es un solo array en `navItems.ts`. |
| La grilla del perfil pasó de 1:1 a 3:4 (1013×1350) | [Planoly, act. 31/10/2025](https://www.planoly.com/blog/guide-to-instagrams-new-vertical-grid) | Confirmado: toda miniatura de la grilla se recorta a 3:4 desde inicios de 2025. No dice cantidad de columnas. | **Se mantiene 1:1** porque la consigna lo exige "EXACTAMENTE". Proporción en un token (`--grid-ratio`) para pasar a 3:4 con una línea. |
| Escala de esquinas M3 y springs | [Shape.md](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Shape.md), [Motion.md](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md) | Confirmado: 0/4/8/12/16/20/28/32/48/full. Springs: spatial 0,9 con rigidez 1400/700/300; effects 1,0 con 3800/1600/800. La página **no** los etiqueta como "expressive" o "standard". | Se usan esos valores tal cual como tokens. Para likes y el FAB menu se usa una variante con amortiguación 0,6 (más rebote) marcada como decisión propia, no como token oficial. |

Descartado o tratado como no confirmado: el ancho de 470px del feed (viene de un userstyle, no de una fuente oficial; se adopta igual porque coincide con lo pedido), las cifras de "adicción" de blogs divulgativos (no se usan), la "librería de 35 formas" (no se usa el número; se dibujan 6 formas propias para el indicador de carga).

## 2. Navegación (estructura Instagram, sin estilo M3)

- **Móvil < 768px**: barra inferior de 5 íconos sin texto: Inicio `home`, Buscar `search`, Crear `add_box`, Reels `movie`, Perfil (avatar). Alto 50px + `env(safe-area-inset-bottom)`, fondo `surface`, borde superior 1px `outline-variant`, íconos 24px, área táctil 48px. Activo = `FILL 1`; Perfil activo = anillo de 2px `on-surface` alrededor del avatar. Sin píldora, sin etiquetas.
- **Barra superior móvil**: wordmark "Keepsy" a la izquierda; corazón (punto `error` si hay no leídas) y avión `send` con contador a la derecha. Solo en Inicio, como Instagram; las demás pantallas tienen su propia cabecera con "atrás".
- **Tablet 768–1023px**: barra lateral de 72px solo con íconos (logo en vez de wordmark).
- **Escritorio ≥ 1024px**: barra lateral de 244px: wordmark, Inicio, Buscar, Explorar, Reels, Mensajes (contador), Notificaciones (contador; abre panel deslizable de 397px), Crear, Perfil, y "Más" abajo (cambiar usuario dev, ajustes, tema, cerrar sesión). Activo = texto en negrita + ícono relleno.
- Buscar en escritorio abre un panel deslizable igual que Notificaciones (como Instagram); en móvil es una pantalla.
- Íconos: **Material Symbols Rounded** variable, `wght 400`, `GRAD 0`, `opsz 24`; solo cambia `FILL`.

## 3. Color

- Semilla **#3D5AFE**, esquema **Expressive** de `@material/material-color-utilities` (HCT), claro y oscuro, generado en tiempo de ejecución y expuesto como `--md-sys-color-*`. Tailwind consume esas variables. Valores de referencia (generados con la misma lógica en Python, `materialyoucolor`):

| Rol | Claro | Oscuro |
|---|---|---|
| primary | `#4B58AA` | `#C9CFFF` |
| on-primary | `#FAF8FF` | `#3B4379` |
| primary-container | `#B4BDFF` | `#B7C0FF` |
| secondary | `#59633A` | `#C4CAA9` |
| tertiary | `#586500` | `#F6FFBE` |
| tertiary-container | `#E6F884` | `#E3F581` |
| surface | `#FCF8FF` | `#0D0C1B` |
| surface-container | `#F0EBFF` | `#19172C` |
| on-surface | `#302E56` | `#E7E2FF` |
| outline-variant | `#B1ADDD` | `#474563` |
| error | `#AC3149` | `#FD6F85` |

- Superficies: blanco azulado, nunca crema. El feed va sobre `surface` sin tarjetas.
- **Anillo de story**: sin ver = trazo cónico `primary → tertiary-container` (índigo → lima, nada de magenta-naranja); visto = `outline-variant`; mejores amigos = verde fijo `#1FAF5A` / `#4ADE80` (oscuro) **con una corona** (ícono `crown`) sobre el anillo. La corona identifica a mejores amigos en toda la app: fila de stories, visor, archivo, lista de mejores amigos y switch "Solo mejores amigos".
- Like activo = `error` (rojo del esquema), como el corazón rojo de Instagram.

## 4. Tipografía

- **Roboto Flex** variable desde Google Fonts con ejes `opsz, wdth, wght` (se verifica en el build que el CSS servido incluya `font-variation-settings` usable; si no, se cae a ejes estándar `font-weight`/`font-stretch`).
- Escala M3: Display 57/45/36, Headline 32/28/24, Title 22/16/14, Body 16/14/12, Label 14/12/11.
- Enfático: números del perfil (publicaciones/seguidores/seguidos) en Title Large `wght 700`, `wdth 110`; títulos de álbum y estadísticas en Headline `wght 650`; wordmark en Roboto Flex `wght 800`, `wdth 125`, minúsculas, `opsz 144`.
- Cuerpo de post a 14px como Instagram.

## 5. Formas

Tokens `--md-sys-shape-corner-*`: 0, 4, 8, 12, 16, 20, 28, 32, 48, full.
- Botones: `full` en reposo → `medium` (12) al presionar; seleccionado (Siguiendo) = `medium`. Transición con spring spatial-fast.
- Icon buttons toggle (like, guardar): círculo → `large` (16) al activarse.
- Grillas de contenido: radio 0–4px (`extra-small` como máximo). Separación 3px (2px en móvil).
- Diálogos `extra-large` (28), sheets `extra-large` arriba, chips `small` (8), avatares `full`.
- Indicador de carga: SVG que muta entre 6 polígonos redondeados (círculo, cookie de 4, cookie de 8, pentágono suave, trébol, píldora) con `d` interpolado por puntos equivalentes.

## 6. Movimiento

| Token | Damping | Rigidez | Uso |
|---|---|---|---|
| spatial-fast | 0,9 | 1400 | botones, toggles, morph de forma |
| spatial-default | 0,9 | 700 | sheets, side sheet, diálogos |
| spatial-slow | 0,9 | 300 | transición a pantalla completa (story, post en móvil) |
| effects-fast | 1 | 3800 | state layers, color |
| effects-default | 1 | 1600 | opacidad de overlays |
| effects-slow | 1 | 800 | fundidos de imagen |
| *bounce* (propio) | 0,6 | 500 | corazón del doble tap, apertura del FAB menu |

Implementación propia: un integrador de resortes de ~60 líneas (`useSpring`) que produce CSS `linear()` para transiciones o anima por `requestAnimationFrame`. Con `prefers-reduced-motion: reduce`, todos los springs pasan a fundido de 100ms sin desplazamiento.

## 7. Componentes M3 y dónde van

FAB menu (selector "Crear" en móvil, desde el ícono de la barra), diálogo (selector "Crear" en escritorio), button group conectado (Editar perfil / Compartir / ajustes; Seguir / Mensaje / ▾), tabs primarias con ícono en el perfil, chips de entrada para elegir amigos, bottom sheet (móvil) y side sheet (escritorio) para comentarios, likes y notificaciones, diálogos de confirmación, snackbars, switches con ícono (privada, reels desactivados, solo mejores amigos), search bar, state layers + ripple en todo lo clickeable.

## 8. Retención (de la investigación, sección B)

- Contador de notificaciones con punto en el corazón y número en el avión. → hecho en nav.
- Scroll infinito con "Ya viste todo" + sugerencias al final del feed.
- Stories arriba con anillos; al terminar las de un usuario se pasa al siguiente sin cerrar.
- Reels y Mensajes como destinos de primer nivel.
- "Sugerencias para ti" en columna derecha (escritorio) y como carrusel horizontal tras el 4.º post (móvil).

## 9. Estilos a evitar

Grillas masonry/mosaico, tarjetas flotantes en el feed, estética de dashboard, degradé magenta-naranja-amarillo, logo y fuente de Instagram, fondos crema, etiquetas de sección numeradas, etiquetas monoespaciadas, glassmorphism, barra de navegación de Material (píldora + etiquetas).
Agregados durante la construcción:
- Indicadores de paso numerados en asistentes ("Paso 1 de 4"): se reemplazaron por una barra segmentada como las de stories.
- Etiquetas con mayúsculas y monoespaciado para metadatos: los metadatos van en `type-body-s` con `on-surface-variant`.

## 10. Cambios posteriores (pedido del 18/11/2026)

- **Perfil propio**: sin botones arriba. "Editar perfil" pasa a Configuración (tarjeta al principio, con avatar). En la esquina inferior hay un **FAB extendido M3** que cambia según la pestaña: Nueva publicación / Nuevo reel / Nuevo álbum / Nueva story (en Archivo). Se contrae a solo ícono al bajar y se expande al subir.
- **Destacadas**: se reordenan manteniendo presionada una (400 ms), que se levanta (escala 1,1 y sombra), y arrastrando. Al soltar se guarda el orden. El ⋯ sigue dando Editar / Eliminar.
- **PWA**: manifest, íconos (192, 512 y maskable), `apple-touch-icon` y service worker propio, sin dependencias. Red primero para navegación, caché para assets y fuentes, stale-while-revalidate para imágenes y nada de caché para `/api` ni videos. Instalación desde Configuración o desde "Más".
- **Capas CSS**: las clases propias (`state`, `morph`, `btn-group`) viven en `@layer components`. Fuera de una capa le ganaban a las utilidades de Tailwind: `.state { position: relative }` anulaba `fixed`/`absolute`.

## 11. Nombre

La app se llama **Keepsy** (antes "Ronda"); el nombre viene de *keepsake*, el recuerdo que se guarda. El logo no cambia: la forma "cookie" M3 con el anillo lima se lee como un momento guardado dentro de un círculo. El wordmark va en minúsculas ("keepsy"), Roboto Flex `wght 800`, `wdth 125`.

