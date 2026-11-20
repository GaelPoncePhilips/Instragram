# Investigación de diseño: clon de Instagram en React con piel Material 3 Expressive

Fecha de la investigación: noviembre 2026. Convención: cada dato lleva su fuente; lo que no pude verificar está marcado "(no confirmado)". No se inventan medidas. Muchas fuentes sobre Instagram son blogs de herramientas de marketing, no documentación oficial; se indica cuando importa.

## A. Estructura real de Instagram

### A1. Navegación móvil (hubo cambio reciente)
- Instagram probó en octubre de 2025 un diseño que pasa Crear a la esquina superior izquierda y pone los DMs en el centro de la barra inferior — [Dataconomy](https://dataconomy.com/2025/10/13/instagram-tests-reels-first-redesign-with-dms-at-the-center), [Techbriefly](https://techbriefly.com/2025/10/13/instagram-tests-reels-first-ui-with-new-tab-layout/).
- Orden actual reportado: Inicio, Reels, DMs, Buscar, Perfil; Crear arriba a la izquierda y los mensajes salieron de la barra superior — [Storrito](https://storrito.com/resources/what-instagrams-navigation-redesign-actually-changed/). Ese blog da marzo de 2026 como lanzamiento por oleadas; otras fuentes lo ubican como prueba desde octubre de 2025 (fecha exacta y carácter permanente: no confirmado) — [Design Compass](https://designcompass.org/en/2025/10/01/instagram-testing-reels-focused-tab-layout/).
- Motivo declarado por Mosseri: el crecimiento viene sobre todo de DMs, Reels y contenido recomendado — [Design Compass](https://designcompass.org/en/2025/10/01/instagram-testing-reels-focused-tab-layout/).
- En la prueba también se podía deslizar horizontalmente entre pestañas — [Dataconomy](https://dataconomy.com/2025/10/13/instagram-tests-reels-first-redesign-with-dms-at-the-center).
- Íconos, relleno vs trazo del estado activo, alto aproximado de la barra y contenido exacto de la barra superior (wordmark, corazón): no confirmado en ninguna fuente que pude leer. Convención observada habitual: ícono relleno cuando está activo (no confirmado).

### A2. Escritorio (web)
- El rediseño web de 2022 movió el menú a una barra vertical izquierda con Inicio, Buscar, Explorar, Mensajes, Notificaciones, Crear, Perfil y Más — [Digit](https://www.digit.in/news/apps/instagram-web-ui-gets-a-user-friendly-facelift-here-is-what-has-changed-65885.html). Reels en esa lista: no confirmado.
- La barra se expande o se colapsa a íconos según el ancho de pantalla — [TechCrunch](https://techcrunch.com/2022/11/08/instagram-is-updating-its-web-interface-to-take-advantage-of-large-screens), [iDownloadBlog](https://www.idownloadblog.com/?p=927102). Breakpoints y ancho en px: no confirmado (el valor de 1264px no apareció en ninguna fuente).
- Columna del feed: un usuario que reescribe el CSS usa una base de 470px más variables de la barra lateral — [userstyles.world](https://userstyles.world/style/7842/instagram-com-bigger-feed-on-desktop). Es ingeniería inversa de terceros, no oficial (470px: no confirmado oficialmente).
- Las sugerencias aparecen a la derecha mientras se navega el feed — [TechCrunch](https://techcrunch.com/2022/11/08/instagram-is-updating-its-web-interface-to-take-advantage-of-large-screens).

### A3. Post, stories, perfil, Reels, DMs, notificaciones, explorar
- Orden del post (cabecera, media, acciones, likes, caption, comentarios, caja de comentario): no pude verificarlo en una fuente citable; es el orden conocido pero queda (no confirmado). Ratio de media del feed: 4:5 para imagen/carrusel y 9:16 para Reels — [Buffer](https://buffer.com/resources/instagram-grid/).
- Stories: desaparecen a las 24 h salvo que se guarden en Destacadas, y un aro de color rodea el avatar si hay una story sin ver — [Ayuda de Instagram](https://help.latest.instagram.com/iphone-app/899271546851408). Mantener pulsado pausa, soltar reanuda — [RFG Creative](https://rfgcreative.com/misc/how-do-instagram-stories-work.html) (guía de terceros, antigua). Duración por imagen (suele citarse 5 s), toque izquierdo/derecho, barras segmentadas, y colores gris para visto y verde para Mejores amigos: no confirmado.
- Las stories mostradas se ordenan por un sistema de predicción de interés — [Meta Transparency](https://transparency.meta.com/features/explaining-ranking/ig-stories/) (consultado solo en el resultado de búsqueda).
- Perfil, grilla: pasó de 1:1 a vertical. Se probó en agosto de 2024 y se desplegó de forma gradual desde inicios de 2025 — [Buffer](https://buffer.com/resources/instagram-grid/), [Planoly](https://www.planoly.com/blog/guide-to-instagrams-new-vertical-grid). La vista previa de la grilla es 3:4 (1013x1350 px) y los posts 4:5 se recortan a 3:4 en la grilla; los covers de Reels (9:16) se ven en 3:4 — [Planoly](https://www.planoly.com/blog/guide-to-instagrams-new-vertical-grid). Buffer dice que los posts de imagen son 4:5 también en grilla y solo Reels 3:4; hay discrepancia, así que tomá 3:4 como valor y márcalo configurable. Número de columnas y separación: no confirmado (se asume 3 columnas, no confirmado).
- Encabezado de perfil, destacadas, pestañas: no confirmado en fuentes leídas.
- Visor de Reels, bandeja de DMs/chat, agrupación de notificaciones y grilla de Explorar: no hallé fuente citable; sólo se confirma que los Reels se ven nativos en la grilla de perfil y Explorar, sin tamaños de tile — [SocialBu](https://socialbu.com/blog/instagram-new-grid-update) (no confirmado en detalle).

## B. Por qué atrae y retiene (hallazgos y decisiones UI)
Aviso: la búsqueda devolvió sobre todo blogs divulgativos, sin estudios revisados por pares; las cifras citadas allí se descartaron por no verificables. Tomá estos puntos como hipótesis de diseño.

1. Recompensas variables: likes, comentarios y contenido nuevo llegan de forma impredecible, como un esquema de refuerzo variable — [Freedom](https://freedom.to/blog/this-is-how-instagram-keeps-you-addicted/) (blog; no hay estudio citado). → Decisión UI: contador de likes que se actualiza en vivo y una notificación con insignia numérica en la pestaña de corazón/notificaciones.
2. Scroll infinito: elimina puntos naturales de parada — [Freedom](https://freedom.to/blog/this-is-how-instagram-keeps-you-addicted/). → Decisión UI: feed con carga incremental sin paginación y un "Estás al día" a modo de cierre opcional.
3. Stories, efímero y FOMO: el contenido desaparece a las 24 h y el aro avisa lo no visto — [Ayuda de Instagram](https://help.latest.instagram.com/iphone-app/899271546851408). → Decisión UI: tray de stories arriba del feed con aro degradado para no visto y gris para visto; barra segmentada con progreso.
4. Recomendación: Meta describe stories y feed ordenados por interés predicho — [Meta Transparency](https://transparency.meta.com/features/explaining-ranking/ig-stories/). → Decisión UI: ordenar el feed del clon con una puntuación simple (afinidad y recencia) y una pestaña Explorar de contenido no seguido.
5. Prioridad de Reels y DMs: Instagram admite que su crecimiento viene de DMs, Reels y recomendados — [Design Compass](https://designcompass.org/en/2025/10/01/instagram-testing-reels-focused-tab-layout/). → Decisión UI: Reels y mensajes como destinos de primer nivel en la navegación, no enterrados en Más.
6. Prueba social y comparación: ocultar likes (Project Daisy) redujo la presión en adolescentes pero también métricas comerciales — [Shorenstein Center](https://shorensteincenter.org/wp-content/uploads/2023/11/Discussion-Paper_Youth-Online-Harms-and-Project-Daisy_For-Shorenstein-Publication.pdf) (borrador). → Decisión UI: ajuste "Ocultar contador de likes" por usuario, con el contador visible por defecto.
7. Sugerencias de seguimiento: columna derecha en escritorio — [TechCrunch](https://techcrunch.com/2022/11/08/instagram-is-updating-its-web-interface-to-take-advantage-of-large-screens). → Decisión UI: tarjeta "Sugerencias para ti" con botón Seguir (relleno tonal) en la columna derecha y como carrusel entre posts en móvil.

## C. Material 3 Expressive

### C1. Contexto y color
- Google respaldó Expressive con 46 estudios y más de 18.000 participantes; los cinco fundamentos son color, forma, tamaño, contención y movimiento — [Google Design](https://design.google/library/expressive-material-design-google-research). La preferencia fue máxima en 18–24 años (hasta 87%) y los elementos clave se detectaron hasta 4 veces más rápido (misma fuente).
- Roles de color y esquema dinámico desde semilla: la librería oficial lista implementaciones en C++, Dart, Java, Swift, TypeScript y Kotlin — [material-color-utilities](https://github.com/material-foundation/material-color-utilities). Paquete npm: `@material/material-color-utilities` (misma fuente).
- Variantes de esquema: el enum de TypeScript incluye MONOCHROME, NEUTRAL, TONAL_SPOT, VIBRANT, EXPRESSIVE, FIDELITY, CONTENT, RAINBOW, FRUIT_SALAD y CMF — [variant.ts](https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/typescript/dynamiccolor/variant.ts). TonalSpot es el valor por defecto según un port de terceros — [mcu-scheme](https://docs.rs/mcu-scheme/0.2.2/mcu_scheme/enum.Variant.html).
- Spec: el tipo SpecVersion de TypeScript admite '2021', '2025' y '2026' — [color_spec.ts](https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/typescript/dynamiccolor/color_spec.ts). Que la versión publicada en npm incluya ya el spec 2025/2026: no confirmado (esto es la rama main).

### C2. Tipografía
- Escala base (sp, display/headline/title/body/label): Display 57/45/36; Headline 32/28/24; Title 22/16/14; Body 16/14/12; Label 14/12/11 — [Typography.md](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Typography.md).
- Existe una escala "emphasized" paralela con más peso (por ejemplo Title Medium y Small en Bold, Label en Bold) para selección, acciones y titulares — [Typography.md](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Typography.md).

### C3. Forma
- Tokens de esquina: None 0, Extra Small 4, Small 8, Medium 12, Large 16, Large Increased 20, Extra Large 28, Extra Large Increased 32, Extra Extra Large 48, Full 50% — [Shape.md](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Shape.md).
- Biblioteca de formas y morphing: Compose expone `MaterialShapes` con polígonos redondeados normalizados y morphing entre ellos — [Android Developers Blog](https://android-developers.googleblog.com/2025/05/androidify-building-delightful-ui-with-compose.html), [referencia Compose](https://composables.com/docs/androidx.compose.material3/material3/classes/MaterialShapes). El número "35" no se pudo confirmar y el listado cambia por versión (no confirmado).

### C4. Movimiento (springs)
- Valores publicados en material-components-android (damping / stiffness): Spatial rápido 0,9 / 1400; spatial por defecto 0,9 / 700; spatial lento 0,9 / 300; Effects rápido 1 / 3800; effects por defecto 1 / 1600; effects lento 1 / 800 — [Motion.md](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md). Spatial mueve posición/tamaño y puede rebotar; effects anima color y opacidad sin rebote (misma fuente).
- Hay discrepancia: paquetes de terceros listan spatial por defecto en stiffness 380 con damping 0,8 o 0,73 — [pub.dev material_expressive](https://pub.dev/documentation/material_expressive/0.8.0/). Para el clon, usá los de material-components-android (más oficiales) y dejalos como tokens ajustables.

### C5. Componentes relevantes
- Button groups: tipos estándar y conectado; el conectado usa 2dp de separación y esquina interna de 8dp, y reemplaza al segmented button (deprecado); los botones crecen 15% al presionar — [ButtonGroup.md](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/components/ButtonGroup.md). Tamaños XS a XL (misma fuente).
- Progreso ondulado (wavy) lineal y circular, determinado e indeterminado — [ProgressIndicator.md](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/components/ProgressIndicator.md). Loading indicator con morph, split button, FAB menu, toolbars, icon button toggle con morph y switch con ícono: no confirmado en las fuentes que leí.

## Fuentes
- https://dataconomy.com/2025/10/13/instagram-tests-reels-first-redesign-with-dms-at-the-center
- https://techbriefly.com/2025/10/13/instagram-tests-reels-first-ui-with-new-tab-layout/
- https://storrito.com/resources/what-instagrams-navigation-redesign-actually-changed/
- https://designcompass.org/en/2025/10/01/instagram-testing-reels-focused-tab-layout/
- https://www.digit.in/news/apps/instagram-web-ui-gets-a-user-friendly-facelift-here-is-what-has-changed-65885.html
- https://techcrunch.com/2022/11/08/instagram-is-updating-its-web-interface-to-take-advantage-of-large-screens
- https://www.idownloadblog.com/?p=927102
- https://userstyles.world/style/7842/instagram-com-bigger-feed-on-desktop
- https://buffer.com/resources/instagram-grid/
- https://www.planoly.com/blog/guide-to-instagrams-new-vertical-grid
- https://socialbu.com/blog/instagram-new-grid-update
- https://help.latest.instagram.com/iphone-app/899271546851408
- https://rfgcreative.com/misc/how-do-instagram-stories-work.html
- https://transparency.meta.com/features/explaining-ranking/ig-stories/
- https://freedom.to/blog/this-is-how-instagram-keeps-you-addicted/
- https://shorensteincenter.org/wp-content/uploads/2023/11/Discussion-Paper_Youth-Online-Harms-and-Project-Daisy_For-Shorenstein-Publication.pdf
- https://design.google/library/expressive-material-design-google-research
- https://github.com/material-foundation/material-color-utilities
- https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/typescript/dynamiccolor/variant.ts
- https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/typescript/dynamiccolor/color_spec.ts
- https://docs.rs/mcu-scheme/0.2.2/mcu_scheme/enum.Variant.html
- https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Typography.md
- https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Shape.md
- https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md
- https://raw.githubusercontent.com/material-components/material-components-android/master/docs/components/ButtonGroup.md
- https://raw.githubusercontent.com/material-components/material-components-android/master/docs/components/ProgressIndicator.md
- https://android-developers.googleblog.com/2025/05/androidify-building-delightful-ui-with-compose.html
- https://composables.com/docs/androidx.compose.material3/material3/classes/MaterialShapes
- https://pub.dev/documentation/material_expressive/0.8.0/
