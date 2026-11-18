# Algoritmo de recomendaciones

Para qué: `GET /usuarios/{id}/explorar` (posts), `/reels/feed` (reels) y `/sugerencias` (cuentas).

## Opciones

| # | Enfoque | Cómo funciona | A favor | En contra |
|---|---|---|---|---|
| 1 | **Popularidad** | Ranking por likes/comentarios recientes con decaimiento por antigüedad (`score / (horas + 2)^1.5`) | Una sola query SQL, funciona sin historial | Igual para todos, no personaliza |
| 2 | **Por contenido (hashtags)** | Perfil del usuario = hashtags de los posts que likeó; se recomiendan posts con hashtags parecidos | Personaliza, explicable ("porque te gusta #futbol") | Depende de que la gente use hashtags; burbuja |
| 3 | **Grafo social** | "Amigos de amigos": lo que likean/siguen las cuentas que vos seguís | Muy relevante en una red social, SQL puro | Usuario nuevo sin seguidos → vacío |
| 4 | **Filtrado colaborativo** | "Usuarios que likearon lo mismo que vos también likearon…" (matriz usuario×post, similitud coseno o factorización) | El más preciso con muchos datos | Necesita volumen, cómputo offline, difícil de explicar y depurar |
| 5 | **Embeddings / ML** | Vectores de imagen/texto (CLIP, etc.) + búsqueda por similitud (pgvector) | Entiende el contenido real de la foto | Infraestructura, modelos, costo; excesivo para el proyecto |
| 6 | **Híbrido ponderado** | Combina 1 + 2 + 3 en un score con pesos | Lo mejor de cada uno, se ajustan pesos | Hay que calibrar pesos |

## Recomendación: híbrido ponderado (1 + 2 + 3) en SQL

Es lo que mejor encaja con este proyecto porque:

- **Ya tenemos los datos**: `likes`, `seguidores`, `hashtags_post` y `comentario` alcanzan; no hace falta trackear nada nuevo.
- **Todo en PostgreSQL**: una query con CTEs; sin servicios extra, sin entrenar modelos.
- **Arranque en frío resuelto**: un usuario nuevo sin likes ni seguidos recibe la parte de popularidad.
- **Explicable y testeable**: cada post trae el motivo (`"popular"`, `"#viajes"`, `"le gusta a @ana"`).
- **Respeta las reglas** fácilmente en el `WHERE`: solo cuentas públicas que no sigo, sin bloqueos, sin mis posts, sin reels si `reels_desactivados`.

El filtrado colaborativo (4) queda como mejora futura si el volumen crece; no vale la pena con pocos usuarios.

### Score por post candidato

```
score = 0.40 * social      -- cuántos de mis seguidos likearon el post (normalizado)
      + 0.35 * contenido   -- afinidad: suma de mis pesos en los hashtags del post
      + 0.25 * popularidad -- (likes + 2*comentarios) de las últimas 72 h
score_final = score / (horas_desde_publicacion + 2) ^ 1.2
```

- Candidatos: posts de los últimos 7 días, de cuentas **públicas**, que no sigo, sin `Bloqueo` en ningún sentido y que no likeé todavía.
- Afinidad por hashtag: likes que di en los últimos 30 días a posts con ese hashtag.
- Diversidad: como mucho 2 posts por autor por página (`ROW_NUMBER() OVER (PARTITION BY usuario_id)`).
- **Reels**: mismo score filtrando `tipo = 'reel'`.
- **Sugerencias de cuentas**: cantidad de seguidos míos que siguen a esa cuenta (amigos en común) + afinidad de hashtags de sus posts; excluye bloqueos, ya seguidos y pendientes.

Índices que ya cubren estas queries: `idx_likes_post`, `idx_hashtags_post_hashtag`, `idx_post_tipo_fecha`, `idx_seguidores_seguido`.
