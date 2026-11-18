"""Consultas del recomendador. La lógica de intercalado está en services/recomendacion_service.py.

Todas devuelven [(post_id, score, motivo)] ya ordenadas por score dentro de su categoría.
Las ventanas y curvas de decaimiento están en las constantes de abajo.
"""
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.repositories.sql import sin_bloqueo

# (ventana en horas, exponente del decaimiento: score / (horas + 2) ^ exp)
CONOCIDOS = (36, 1.8)   # amigos y cercanos: muy recientes, caen rápido
POPULARES = (72, 1.3)   # celebridades / populares
INTERES = (168, 1.2)    # descubrimiento: hasta 7 días, caen más lento

FILTRO_TIPO = "(CAST(:tipo AS varchar) IS NULL OR p.tipo = :tipo) AND (NOT :sin_reels OR p.tipo = 'foto')"
HORAS = "(extract(epoch FROM LOCALTIMESTAMP - p.fecha_publicacion) / 3600)"

# Cuántas veces interactué (like/comentario) con cada autor en los últimos 30 días: peso del grafo social.
AFINIDAD_AUTOR = """afinidad_autor AS (
    SELECT p.usuario_id AS autor, count(*)::float AS n FROM (
        SELECT post_id FROM likes WHERE usuario_id = :yo AND fecha > LOCALTIMESTAMP - INTERVAL '30 days'
        UNION ALL
        SELECT post_id FROM comentario WHERE usuario_id = :yo AND fecha > LOCALTIMESTAMP - INTERVAL '30 days'
    ) x JOIN post p ON p.id = x.post_id GROUP BY p.usuario_id
)"""

# Likes + 2 * comentarios de las últimas 72 h
POPULARIDAD = """((SELECT count(*) FROM likes l WHERE l.post_id = p.id AND l.fecha > LOCALTIMESTAMP - INTERVAL '72 hours')
  + 2 * (SELECT count(*) FROM comentario c WHERE c.post_id = p.id AND c.fecha > LOCALTIMESTAMP - INTERVAL '72 hours'))::float"""


class RecomendacionRepository:
    def __init__(self, db: Session):
        self.db = db

    def de_seguidos(self, yo: int, tipo: str | None, sin_reels: bool, n: int) -> dict[str, list[tuple]]:
        """Posts de cuentas que sigo, clasificados:
        - cercano: está en mi lista de mejores amigos
        - amigo: nos seguimos mutuamente
        - popular: la sigo pero no me sigue (celebridad)
        """
        filas = self.db.execute(text(f"""
            WITH {AFINIDAD_AUTOR},
            seguidos AS (
                SELECT s.seguido_id AS autor,
                    CASE WHEN EXISTS (SELECT 1 FROM mejores_amigos m WHERE m.usuario_id = :yo AND m.amigo_id = s.seguido_id)
                              THEN 'cercano'
                         WHEN EXISTS (SELECT 1 FROM seguidores r WHERE r.seguidor_id = s.seguido_id
                                      AND r.seguido_id = :yo AND r.estado = 'aceptado')
                              THEN 'amigo'
                         ELSE 'popular' END AS cat
                FROM seguidores s WHERE s.seguidor_id = :yo AND s.estado = 'aceptado'
            ),
            candidatos AS (
                SELECT p.id, sg.cat, {HORAS} AS h, coalesce(af.n, 0) AS afinidad, {POPULARIDAD} AS pop
                FROM post p
                JOIN seguidos sg ON sg.autor = p.usuario_id
                JOIN usuario u ON u.id = p.usuario_id AND u.eliminado_en IS NULL
                LEFT JOIN afinidad_autor af ON af.autor = p.usuario_id
                WHERE {FILTRO_TIPO}
                  AND ((sg.cat IN ('cercano', 'amigo') AND p.fecha_publicacion > LOCALTIMESTAMP - make_interval(hours => :v_con))
                    OR (sg.cat = 'popular' AND p.fecha_publicacion > LOCALTIMESTAMP - make_interval(hours => :v_pop)))
            ),
            puntuados AS (
                SELECT id, cat,
                    CASE WHEN cat = 'popular' THEN
                        (0.10 + 0.70 * pop / greatest(max(pop) OVER (), 1) + 0.30 * afinidad / greatest(max(afinidad) OVER (), 1))
                        / power(h + 2, :e_pop)
                    ELSE
                        (1.0 + 2.0 * afinidad / greatest(max(afinidad) OVER (), 1) + 0.5 * pop / greatest(max(pop) OVER (), 1))
                        / power(h + 2, :e_con)
                    END AS score
                FROM candidatos
            )
            SELECT id, cat, score FROM (
                SELECT *, row_number() OVER (PARTITION BY cat ORDER BY score DESC, id DESC) AS rk FROM puntuados
            ) x WHERE rk <= :n ORDER BY cat, rk"""),
            {"yo": yo, "tipo": tipo, "sin_reels": sin_reels, "n": n,
             "v_con": CONOCIDOS[0], "e_con": CONOCIDOS[1], "v_pop": POPULARES[0], "e_pop": POPULARES[1]},
        ).all()
        motivos = {"cercano": "de tus mejores amigos", "amigo": "de un amigo", "popular": "de una cuenta que seguís"}
        out: dict[str, list[tuple]] = {"cercano": [], "amigo": [], "popular": []}
        for id_, cat, score in filas:
            out[cat].append((id_, score, motivos[cat]))
        return out

    def descubrir(self, yo: int, tipo: str | None, sin_reels: bool, n: int) -> dict[str, list[tuple]]:
        """Posts de cuentas públicas que NO sigo, en dos listas:
        - interes: colaborativo 40% + hashtags 30% + likes de mis seguidos 15% + popularidad 15% (7 días)
        - popular: popularidad pura (72 h), para intercalar celebridades que no sigo
        """
        filas = self.db.execute(text(f"""
            WITH hashtags_afines AS (
                SELECT hp.hashtag_id, count(*)::float AS peso
                FROM likes l JOIN hashtags_post hp ON hp.post_id = l.post_id
                WHERE l.usuario_id = :yo AND l.fecha > LOCALTIMESTAMP - INTERVAL '30 days'
                GROUP BY hp.hashtag_id
            ),
            candidatos AS (
                SELECT p.id, p.usuario_id, {HORAS} AS h,
                    (SELECT coalesce(sum(au.score), 0) FROM likes l
                       JOIN afinidad_usuario au ON au.similar_id = l.usuario_id AND au.usuario_id = :yo
                     WHERE l.post_id = p.id)::float AS colab,
                    (SELECT coalesce(sum(ha.peso), 0) FROM hashtags_post hp
                       JOIN hashtags_afines ha ON ha.hashtag_id = hp.hashtag_id WHERE hp.post_id = p.id)::float AS tags,
                    (SELECT count(*) FROM likes l JOIN seguidores s ON s.seguido_id = l.usuario_id
                       AND s.seguidor_id = :yo AND s.estado = 'aceptado' WHERE l.post_id = p.id)::float AS social,
                    {POPULARIDAD} AS pop
                FROM post p JOIN usuario u ON u.id = p.usuario_id
                WHERE p.usuario_id <> :yo AND NOT u.es_privada AND {sin_bloqueo('u')}
                  AND NOT EXISTS (SELECT 1 FROM seguidores s WHERE s.seguidor_id = :yo AND s.seguido_id = u.id)
                  AND NOT EXISTS (SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.usuario_id = :yo)
                  AND p.fecha_publicacion > LOCALTIMESTAMP - make_interval(hours => :v_int)
                  AND {FILTRO_TIPO}
            ),
            puntuados AS (
                SELECT id, usuario_id, h, colab, tags, social, pop,
                    (0.40 * colab / greatest(max(colab) OVER (), 0.0001)
                   + 0.30 * tags / greatest(max(tags) OVER (), 1)
                   + 0.15 * social / greatest(max(social) OVER (), 1)
                   + 0.15 * pop / greatest(max(pop) OVER (), 1)) / power(h + 2, :e_int) AS s_interes,
                    CASE WHEN h <= :v_pop THEN (0.05 + pop / greatest(max(pop) OVER (), 1)) / power(h + 2, :e_pop) END AS s_popular
                FROM candidatos
            ),
            diversos AS (  -- máximo 2 posts por autor en cada lista
                SELECT *, row_number() OVER (PARTITION BY usuario_id ORDER BY s_interes DESC, id DESC) AS n_int,
                          row_number() OVER (PARTITION BY usuario_id ORDER BY s_popular DESC NULLS LAST, id DESC) AS n_pop
                FROM puntuados
            )
            (SELECT 'interes' AS lista, id, s_interes AS score,
                CASE WHEN colab > 0 THEN 'le gustó a gente con tus gustos'
                     WHEN tags > 0 THEN 'por hashtags que te gustan'
                     WHEN social > 0 THEN 'le gusta a cuentas que seguís'
                     ELSE 'popular' END AS motivo
             FROM diversos WHERE n_int <= 2 AND (colab > 0 OR tags > 0 OR social > 0)
             ORDER BY s_interes DESC, id DESC LIMIT :n)
            UNION ALL
            (SELECT 'popular', id, s_popular, 'popular ahora'
             FROM diversos WHERE n_pop <= 2 AND s_popular IS NOT NULL
             ORDER BY s_popular DESC, id DESC LIMIT :n)"""),
            {"yo": yo, "tipo": tipo, "sin_reels": sin_reels, "n": n,
             "v_int": INTERES[0], "e_int": INTERES[1], "v_pop": POPULARES[0], "e_pop": POPULARES[1]},
        ).all()
        out: dict[str, list[tuple]] = {"interes": [], "popular": []}
        for lista, id_, score, motivo in filas:
            out[lista].append((id_, score, motivo))
        return out
