# Checklist del frontend

Estado contra el **mock** (`VITE_USE_MOCK=true`). Contra el backend real no se probó nada.
"Verificado" = recorrido en el navegador (DOM y llamadas) o prueba directa del mock. "Implementado" = código hecho que compila, sin recorrido manual completo.

| Ítem | Estado | Detalle |
|---|---|---|
| HU1 Registro / login / perfil | Implementado | Validación en vivo del username y 409 en el campo correcto. Login verificado; perfil verificado (encabezado, contadores, pestañas). Registro sin recorrido manual. |
| HU2 Publicar con hashtags | Implementado | Publicación con MediaPicker (archivo o muestra). Hashtags automáticos en el mock; clickeables en la descripción. |
| HU3 Seguir | Implementado | Seguir / Solicitado / Siguiendo con morph de forma. Solicitudes con Confirmar/Eliminar (pantalla verificada con datos). |
| HU4 Privacidad | Verificado | `ines_lee` → encabezado + "Esta cuenta es privada" (403 del mock verificado). Cambiar privada → pública acepta las pendientes (mock). |
| HU5 Likes y comentarios | Implementado | Doble tap con corazón, like optimista, lista de likes, comentarios con 300 caracteres y borrado por autor o dueño. Mock verificado; doble tap táctil sin probar en un dispositivo real. |
| HU6 Feed | Verificado | Columna de 470px, scroll infinito por limit/offset; orden del post como Instagram (verificado en el DOM). |
| HU7 Stories | Implementado | Fila con anillos, visor 9:16 con barras, 5 s, taps, pausa, subir y archivo con vencidas. El visor carga (verificado); tiempos y gestos sin probar a mano. |
| HU8 Mejores amigos | Implementado | Lista con toggle, etiqueta verde en el visor y anillo verde en la fila; regla "solo seguidores aceptados" en el mock. |
| HU9 Vistas | Implementado | Registrar vista al abrir una story ajena; "Visto por N" con lista en las propias. |
| HU10 Bloqueos | Verificado | `kike.troll` → "Perfil no disponible" (404). Lista con Desbloquear (verificada con datos). |
| HU11 Hashtags | Verificado | Tendencias top 10 de 24 h en Buscar; `/hashtags/viajes` con grilla de 3 columnas. |
| HU12 Estadísticas | Verificado | Filtros desde/hasta y atajos; frases simples, sin dashboard. "No me siguen" muestra a juli.run. |
| Reels | Implementado | Visor vertical con snap, mute, doble tap, comentarios en sheet, Seguir; 403 propio si `reels_desactivados`. El visor carga (verificado); autoplay sin probar a mano. |
| DMs | Implementado | Bandeja, solicitudes (2), grupos, chat con cursor `antes_de`, compartir posts, anular envío, leído y bloqueo. Bandeja y solicitudes verificadas con datos; envío sin recorrido manual. |
| Destacadas | Implementado | Fila bajo la bio y visor (verificado). Crear desde el archivo, editar, reordenar y borrar sin recorrido manual. |
| Notificaciones | Verificado | Todos los tipos; las de álbum se generaron en el recorrido obligatorio. |
| Álbumes compartidos | Verificado | Recorrido obligatorio completo en el navegador: crear (4 pasos) → invitar → cambiar a gabi → aceptar en la pestaña → subir → visible en los perfiles de ana y gabi, con notificaciones para ana. |
| Responsive | Parcial | Verificado por DOM en 375, 768 y 1280 px: barra inferior, barra lateral de 72px, feed de 470px, grilla 1:1 y sin scroll horizontal. Inspección visual limitada porque las capturas del panel salían desactualizadas. 360 px no se midió aparte. |
| Build / tsc / lint | Verificado | Los tres pasan. Lint deja warnings (no errores) en `src/lib/hooks.ts` y algunas páginas. |
