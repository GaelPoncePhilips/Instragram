# Algoritmo de recomendaciones

Implementado: **híbrido + colaborativo con decaimiento temporal**, con las categorías **intercaladas**.

| Endpoint | Qué usa |
|---|---|
| `GET /usuarios/{id}/feed?modo=recomendado` | Mezcla intercalada (todas las categorías) |
| `GET /usuarios/{id}/reels/feed` | La misma mezcla, solo reels |
| `GET /usuarios/{id}/explorar` | Solo descubrimiento: interés, interés, popular, … |
| `GET /usuarios/{id}/sugerencias` | Grafo social + un poco de popularidad |
| `GET /usuarios/{id}/feed` (default `cronologico`) | Sin algoritmo: lo que pide la HU6 |

Código: `repositories/recomendacion_repository.py` (consultas), `services/recomendacion_service.py` (intercalado),
`jobs/recalcular_afinidad.py` (señal colaborativa).

## Categorías

| Categoría | Quién | Ventana | Decaimiento | Score (normalizado 0–1 en cada señal) |
|---|---|---|---|---|
| **amigo** | Cuentas que sigo y me siguen | **36 h** | fuerte `(h+2)^1.8` | `1 + 2·afinidad_con_autor + 0.5·popularidad` |
| **cercano** ("familia") | Cuentas en mi lista de mejores amigos | **36 h** | fuerte `(h+2)^1.8` | igual que amigo |
| **popular** (celebridad) | Cuentas que sigo y no me siguen; después, populares públicas que no sigo | 72 h | medio `(h+2)^1.3` | `0.1 + 0.7·popularidad + 0.3·afinidad_con_autor` |
| **interés** | Cuentas públicas que no sigo, posts que no likeé | 7 días | suave `(h+2)^1.2` | `0.40·colaborativo + 0.30·hashtags + 0.15·likes_de_seguidos + 0.15·popularidad` |

- `afinidad_con_autor`: mis likes + comentarios a ese autor en los últimos 30 días (peso del grafo social).
- `popularidad`: likes + 2·comentarios de las últimas 72 h.
- `colaborativo`: suma de la similitud de los usuarios parecidos a mí que likearon el post.
- `hashtags`: cuánto likeé esos hashtags en los últimos 30 días.
- Interés y popular de descubrimiento: máximo 2 posts por autor.
- Siempre se excluyen cuentas privadas que no sigo, bloqueos en cualquier sentido y cuentas borradas.

**Conocidos con prioridad y ventana corta**: un post de un amigo de hace 37 h ya no aparece, aunque tenga muchos likes.

## Intercalado

Cada categoría se ordena por su score y después se toman en el patrón:

```
amigo → interés → cercano → celebridad → amigo → interés → …
```

Si una categoría no tiene más posts, se saltea; un post nunca aparece dos veces. La paginación
(`limit`/`offset`) se aplica sobre la mezcla, así que las páginas son consistentes.

## Señal colaborativa

`afinidad_usuario` guarda, para cada usuario, sus 50 usuarios más parecidos:

```
similitud(A, B) = likes en común / sqrt(likes de A · likes de B)      (últimos 30 días, mínimo 2 en común)
```

Se precalcula porque comparar todos contra todos en cada request es caro. Hay que correrlo periódicamente:

```bash
python -m src.jobs.recalcular_afinidad       # por ejemplo, con cron cada 1 h
```

Con usuarios generados en masa conviene correrlo después de cargar los datos de prueba.

## Personas a seguir

```
score = 3·seguidos_en_común + 2·(me sigue) + 0.5·ln(1 + seguidores)
```

Solo grafo social y un poco de popularidad; excluye a quien ya sigo, solicitudes pendientes, bloqueos y cuentas borradas.

## Ajustar

Las ventanas y exponentes están en las constantes `CONOCIDOS`, `POPULARES` e `INTERES` de
`recomendacion_repository.py`; el patrón, en `PATRON_FEED` / `PATRON_EXPLORAR` del service.

## Alternativas que se evaluaron

Popularidad sola (igual para todos), solo hashtags (depende de que se usen), solo grafo social (vacío para
usuarios nuevos), solo colaborativo (necesita volumen), embeddings con ML (infraestructura excesiva).
El híbrido combina las señales y la parte de popularidad cubre a los usuarios nuevos.
