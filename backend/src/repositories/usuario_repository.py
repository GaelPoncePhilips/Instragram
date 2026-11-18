from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session

from src.db.models.bloqueo_model import Bloqueo
from src.db.models.post_model import Post
from src.db.models.seguidor_model import Seguidor
from src.db.models.usuario_model import Usuario
from src.repositories.notificacion_repository import NotificacionRepository
from src.repositories.sql import sin_bloqueo


class UsuarioRepository:
    def __init__(self, db: Session):
        self.db = db

    def crear(self, **campos) -> Usuario:
        usuario = Usuario(**campos)
        self.db.add(usuario)
        self.db.commit()
        self.db.refresh(usuario)
        return usuario

    def buscar_por_id(self, usuario_id: int) -> Usuario | None:
        return self.db.get(Usuario, usuario_id)

    def buscar_activo(self, usuario_id: int) -> Usuario | None:
        u = self.db.get(Usuario, usuario_id)
        return u if u is not None and u.eliminado_en is None else None

    def buscar_por_username(self, username: str) -> Usuario | None:
        return self.db.query(Usuario).filter(Usuario.username == username).first()

    def buscar_por_email(self, email: str) -> Usuario | None:
        return self.db.query(Usuario).filter(func.lower(Usuario.email) == email.lower()).first()

    def actualizar(self, usuario: Usuario, campos: dict) -> Usuario:
        """Si la cuenta pasa a pública, acepta las solicitudes pendientes en la misma transacción (HU4)."""
        pasa_a_publica = usuario.es_privada and campos.get("es_privada") is False
        for campo, valor in campos.items():
            setattr(usuario, campo, valor)
        if pasa_a_publica:

            notis = NotificacionRepository(self.db)
            for (sid,) in self.db.query(Seguidor.seguidor_id).filter(
                    Seguidor.seguido_id == usuario.id, Seguidor.estado == "pendiente"):
                notis.borrar(usuario.id, sid, "solicitud")
                notis.crear(usuario.id, sid, "seguidor_nuevo")
                notis.crear(sid, usuario.id, "solicitud_aceptada")
            self.db.query(Seguidor).filter(
                Seguidor.seguido_id == usuario.id, Seguidor.estado == "pendiente"
            ).update({"estado": "aceptado"}, synchronize_session=False)
        self.db.commit()
        self.db.refresh(usuario)
        return usuario

    def contadores(self, usuario_id: int) -> dict:
        posts = self.db.query(func.count(Post.id)).filter(Post.usuario_id == usuario_id).scalar()
        seguidores = self.db.query(func.count()).select_from(Seguidor).join(
            Usuario, Usuario.id == Seguidor.seguidor_id).filter(
            Seguidor.seguido_id == usuario_id, Seguidor.estado == "aceptado", Usuario.eliminado_en.is_(None)
        ).scalar()
        seguidos = self.db.query(func.count()).select_from(Seguidor).join(
            Usuario, Usuario.id == Seguidor.seguido_id).filter(
            Seguidor.seguidor_id == usuario_id, Seguidor.estado == "aceptado", Usuario.eliminado_en.is_(None)
        ).scalar()
        return {"cantidad_posts": posts, "cantidad_seguidores": seguidores, "cantidad_seguidos": seguidos}

    def hay_bloqueo(self, a_id: int, b_id: int) -> bool:
        """True si alguno de los dos bloqueó al otro (HU10)."""
        return self.db.query(Bloqueo.id).filter(or_(
            (Bloqueo.bloqueador_id == a_id) & (Bloqueo.bloqueado_id == b_id),
            (Bloqueo.bloqueador_id == b_id) & (Bloqueo.bloqueado_id == a_id),
        )).first() is not None

    def estadisticas(self, usuario_id: int, desde, hasta) -> dict:
        """HU12. El rango filtra por fecha del post (promedio y top post) y por fecha del like (top seguidor)."""
        p = {"uid": usuario_id, "desde": desde, "hasta": hasta}
        rango_post = ("(CAST(:desde AS timestamp) IS NULL OR p.fecha_publicacion >= :desde) AND "
                      "(CAST(:hasta AS timestamp) IS NULL OR p.fecha_publicacion < :hasta)")
        likes_validos = ("NOT EXISTS (SELECT 1 FROM bloqueo b WHERE b.bloqueador_id = p.usuario_id "
                         "AND b.bloqueado_id = l.usuario_id)")
        por_post = f"""SELECT p.id, p.url_imagen, p.fecha_publicacion,
                         count(l.usuario_id) FILTER (WHERE {likes_validos}) AS likes
                       FROM post p LEFT JOIN likes l ON l.post_id = p.id
                       WHERE p.usuario_id = :uid AND {rango_post}
                       GROUP BY p.id"""
        resumen = self.db.execute(text(
            f"SELECT count(*) AS posts, coalesce(avg(likes), 0) AS promedio FROM ({por_post}) x"), p).mappings().one()
        top_post = self.db.execute(text(
            f"SELECT * FROM ({por_post}) x ORDER BY likes DESC, fecha_publicacion DESC LIMIT 1"), p).mappings().first()
        top_seguidor = self.db.execute(text(
            """SELECT u.id, u.username, u.nombre, count(*) AS likes
               FROM likes l JOIN post p ON p.id = l.post_id JOIN usuario u ON u.id = l.usuario_id AND u.eliminado_en IS NULL
               JOIN seguidores s ON s.seguidor_id = l.usuario_id AND s.seguido_id = :uid AND s.estado = 'aceptado'
               WHERE p.usuario_id = :uid
                 AND (CAST(:desde AS timestamp) IS NULL OR l.fecha >= :desde)
                 AND (CAST(:hasta AS timestamp) IS NULL OR l.fecha < :hasta)
               GROUP BY u.id ORDER BY likes DESC, min(l.fecha) LIMIT 1"""), p).mappings().first()
        return {
            "cantidad_posts": resumen["posts"],
            "promedio_likes_por_post": round(float(resumen["promedio"]), 2),
            "post_con_mas_likes": dict(top_post) if top_post and top_post["likes"] > 0 else None,
            "seguidor_que_mas_likes_dio": dict(top_seguidor) if top_seguidor else None,
        }

    def buscar(self, q: str, yo: int, limit: int, offset: int) -> list[dict]:
        """Prefijo de username o nombre. Orden: coincidencia exacta, a quién sigo, popularidad."""

        patron = q.lower().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        return [dict(r) for r in self.db.execute(text(
            f"""SELECT u.id, u.username, u.nombre FROM usuario u
                WHERE (u.username LIKE :patron OR lower(u.nombre) LIKE :patron OR lower(u.nombre) LIKE '% ' || :patron)
                  AND {sin_bloqueo('u')}
                ORDER BY (u.username = :q) DESC,
                  EXISTS (SELECT 1 FROM seguidores s WHERE s.seguidor_id = :yo AND s.seguido_id = u.id
                          AND s.estado = 'aceptado') DESC,
                  (SELECT count(*) FROM seguidores s WHERE s.seguido_id = u.id AND s.estado = 'aceptado') DESC,
                  u.username
                LIMIT :limit OFFSET :offset"""),
            {"patron": patron, "q": q.lower(), "yo": yo, "limit": limit, "offset": offset}).mappings().all()]
