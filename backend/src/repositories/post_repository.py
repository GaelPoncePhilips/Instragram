from sqlalchemy import text
from sqlalchemy.orm import Session

from src.db.models.comentario_model import Comentario
from src.db.models.hashtag_model import Hashtag
from src.db.models.hashtag_post_model import HashtagPost
from src.db.models.like_model import Like
from src.db.models.post_model import Post
from src.repositories.sql import NO_BLOQUEADO_POR_DUENO, POST_COLUMNAS, POST_FROM, puede_ver, sin_bloqueo


class PostRepository:
    def __init__(self, db: Session):
        self.db = db

    def _filas(self, sql: str, **params) -> list[dict]:
        return [dict(r) for r in self.db.execute(text(sql), params).mappings().all()]

    # ---------- posts
    def crear_con_hashtags(self, campos: dict, hashtags: list[str]) -> Post:
        """Crea el post y sus hashtags (creando los que no existan) en una sola transacción (HU2)."""
        try:
            post = Post(**campos)
            self.db.add(post)
            self.db.flush()
            for nombre in hashtags:
                hashtag = self.db.query(Hashtag).filter(Hashtag.nombre == nombre).first()
                if hashtag is None:
                    hashtag = Hashtag(nombre=nombre)
                    self.db.add(hashtag)
                    self.db.flush()
                self.db.add(HashtagPost(post_id=post.id, hashtag_id=hashtag.id))
            self.db.commit()
            self.db.refresh(post)
            return post
        except Exception:
            self.db.rollback()
            raise

    def buscar_por_id(self, post_id: int) -> Post | None:
        return self.db.get(Post, post_id)

    def eliminar(self, post: Post) -> None:
        self.db.delete(post)
        self.db.commit()

    def detalle(self, post_id: int, yo: int) -> dict | None:
        filas = self._filas(f"SELECT {POST_COLUMNAS} {POST_FROM} WHERE p.id = :id", id=post_id, yo=yo)
        return filas[0] if filas else None

    def listar_por_usuario(self, usuario_id: int, yo: int, tipo: str | None, limit: int, offset: int) -> list[dict]:
        return self._filas(
            f"""SELECT {POST_COLUMNAS} {POST_FROM}
                WHERE p.usuario_id = :uid AND (CAST(:tipo AS varchar) IS NULL OR p.tipo = :tipo)
                ORDER BY p.fecha_publicacion DESC, p.id DESC LIMIT :limit OFFSET :offset""",
            uid=usuario_id, yo=yo, tipo=tipo, limit=limit, offset=offset,
        )

    def feed(self, yo: int, sin_reels: bool, limit: int, offset: int) -> list[dict]:
        """Posts de los seguidos aceptados, fecha desc (HU6)."""
        return self._filas(
            f"""SELECT {POST_COLUMNAS} {POST_FROM}
                WHERE p.usuario_id IN (SELECT seguido_id FROM seguidores WHERE seguidor_id = :yo AND estado = 'aceptado')
                  AND {sin_bloqueo('u')}
                  AND (NOT :sin_reels OR p.tipo = 'foto')
                ORDER BY p.fecha_publicacion DESC, p.id DESC LIMIT :limit OFFSET :offset""",
            yo=yo, sin_reels=sin_reels, limit=limit, offset=offset,
        )

    def por_hashtag(self, nombre: str, yo: int, limit: int, offset: int) -> list[dict]:
        """Posts públicos con ese hashtag, por likes (HU11)."""
        return self._filas(
            f"""SELECT * FROM (
                  SELECT {POST_COLUMNAS} {POST_FROM}
                  JOIN hashtags_post hp ON hp.post_id = p.id
                  JOIN hashtag h ON h.id = hp.hashtag_id
                  WHERE h.nombre = :nombre AND NOT u.es_privada AND {sin_bloqueo('u')}
                ) x ORDER BY cantidad_likes DESC, fecha_publicacion DESC, id DESC LIMIT :limit OFFSET :offset""",
            nombre=nombre, yo=yo, limit=limit, offset=offset,
        )

    def recomendados(
        self, yo: int, tipo: str | None, sin_reels: bool, incluir_seguidos: bool, limit: int, offset: int
    ) -> list[dict]:
        """Híbrido social + hashtags + popularidad con decaimiento temporal (docs/RECOMENDACIONES.md)."""
        visible = puede_ver("u") if incluir_seguidos else f"(NOT u.es_privada AND {sin_bloqueo('u')})"
        return self._filas(
            f"""
            WITH afinidad AS (
                SELECT hp.hashtag_id, count(*)::float AS peso
                FROM likes l JOIN hashtags_post hp ON hp.post_id = l.post_id
                WHERE l.usuario_id = :yo AND l.fecha > LOCALTIMESTAMP - INTERVAL '30 days'
                GROUP BY hp.hashtag_id
            ),
            candidatos AS (
                SELECT p.id, p.usuario_id, p.fecha_publicacion,
                    (SELECT count(*) FROM likes l JOIN seguidores s
                       ON s.seguido_id = l.usuario_id AND s.seguidor_id = :yo AND s.estado = 'aceptado'
                     WHERE l.post_id = p.id)::float AS social,
                    (SELECT coalesce(sum(a.peso), 0) FROM hashtags_post hp JOIN afinidad a ON a.hashtag_id = hp.hashtag_id
                     WHERE hp.post_id = p.id)::float AS contenido,
                    ((SELECT count(*) FROM likes l WHERE l.post_id = p.id AND l.fecha > LOCALTIMESTAMP - INTERVAL '72 hours')
                     + 2 * (SELECT count(*) FROM comentario c WHERE c.post_id = p.id AND c.fecha > LOCALTIMESTAMP - INTERVAL '72 hours')
                    )::float AS popularidad
                FROM post p JOIN usuario u ON u.id = p.usuario_id
                WHERE p.usuario_id <> :yo
                  AND p.fecha_publicacion > LOCALTIMESTAMP - INTERVAL '7 days'
                  AND {visible}
                  AND (:incluir_seguidos OR NOT EXISTS (
                        SELECT 1 FROM seguidores s WHERE s.seguidor_id = :yo AND s.seguido_id = u.id))
                  AND NOT EXISTS (SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.usuario_id = :yo)
                  AND (CAST(:tipo AS varchar) IS NULL OR p.tipo = :tipo)
                  AND (NOT :sin_reels OR p.tipo = 'foto')
            ),
            puntuados AS (
                SELECT c.*,
                    (0.40 * social / greatest(max(social) OVER (), 1)
                   + 0.35 * contenido / greatest(max(contenido) OVER (), 1)
                   + 0.25 * popularidad / greatest(max(popularidad) OVER (), 1))
                   / power(extract(epoch FROM LOCALTIMESTAMP - fecha_publicacion) / 3600 + 2, 1.2) AS score
                FROM candidatos c
            ),
            diversos AS (
                SELECT pu.*, row_number() OVER (PARTITION BY usuario_id ORDER BY score DESC, id DESC) AS n
                FROM puntuados pu
            )
            SELECT {POST_COLUMNAS},
                CASE WHEN d.social > 0 THEN 'le gusta a cuentas que seguís'
                     WHEN d.contenido > 0 THEN 'por hashtags que te gustan'
                     ELSE 'popular' END AS motivo
            FROM diversos d JOIN post p ON p.id = d.id JOIN usuario u ON u.id = p.usuario_id
            WHERE d.n <= 2
            ORDER BY d.score DESC, p.fecha_publicacion DESC, p.id DESC
            LIMIT :limit OFFSET :offset""",
            yo=yo, tipo=tipo, sin_reels=sin_reels, incluir_seguidos=incluir_seguidos, limit=limit, offset=offset,
        )

    # ---------- likes (HU5)
    def dar_like(self, usuario_id: int, post_id: int) -> None:
        self.db.execute(
            text("INSERT INTO likes (usuario_id, post_id) VALUES (:u, :p) ON CONFLICT DO NOTHING"),
            {"u": usuario_id, "p": post_id},
        )
        self.db.commit()

    def quitar_like(self, usuario_id: int, post_id: int) -> None:
        self.db.query(Like).filter(Like.usuario_id == usuario_id, Like.post_id == post_id).delete()
        self.db.commit()

    def usuarios_que_dieron_like(self, post_id: int, limit: int, offset: int) -> list[dict]:
        return self._filas(
            f"""SELECT u.id, u.username, u.nombre FROM likes l
                JOIN usuario u ON u.id = l.usuario_id JOIN post p ON p.id = l.post_id
                WHERE l.post_id = :pid AND {NO_BLOQUEADO_POR_DUENO('l.usuario_id')}
                ORDER BY l.fecha DESC LIMIT :limit OFFSET :offset""",
            pid=post_id, limit=limit, offset=offset,
        )

    # ---------- comentarios (HU5)
    def comentar(self, usuario_id: int, post_id: int, texto: str) -> Comentario:
        c = Comentario(usuario_id=usuario_id, post_id=post_id, texto=texto)
        self.db.add(c)
        self.db.commit()
        self.db.refresh(c)
        return c

    def comentarios(self, post_id: int, limit: int, offset: int) -> list[dict]:
        return self._filas(
            f"""SELECT c.id, c.post_id, c.usuario_id, u.username AS autor_username, c.texto, c.fecha
                FROM comentario c JOIN usuario u ON u.id = c.usuario_id JOIN post p ON p.id = c.post_id
                WHERE c.post_id = :pid AND {NO_BLOQUEADO_POR_DUENO('c.usuario_id')}
                ORDER BY c.fecha, c.id LIMIT :limit OFFSET :offset""",
            pid=post_id, limit=limit, offset=offset,
        )

    def buscar_comentario(self, comentario_id: int) -> Comentario | None:
        return self.db.get(Comentario, comentario_id)

    def eliminar_comentario(self, c: Comentario) -> None:
        self.db.delete(c)
        self.db.commit()
