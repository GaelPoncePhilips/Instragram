from sqlalchemy import text
from sqlalchemy.orm import Session

from src.db.models.notificacion_model import Notificacion

# Notificaciones visibles: el actor sigue activo y no hay bloqueo entre ambos.
VISIBLE = """u.eliminado_en IS NULL AND NOT EXISTS (SELECT 1 FROM bloqueo b
             WHERE (b.bloqueador_id = n.usuario_id AND b.bloqueado_id = n.actor_id)
                OR (b.bloqueador_id = n.actor_id AND b.bloqueado_id = n.usuario_id))"""


class NotificacionRepository:
    def __init__(self, db: Session):
        self.db = db

    def crear(self, usuario_id: int, actor_id: int, tipo: str, **refs) -> None:
        """No se notifica a uno mismo. No hace commit: va en la transacción del caso de uso."""
        if usuario_id != actor_id:
            self.db.add(Notificacion(usuario_id=usuario_id, actor_id=actor_id, tipo=tipo, **refs))

    def borrar(self, usuario_id: int, actor_id: int, tipo: str, **refs) -> None:
        """Deshace una notificación (quitar like, cancelar/rechazar solicitud)."""
        q = self.db.query(Notificacion).filter(
            Notificacion.usuario_id == usuario_id, Notificacion.actor_id == actor_id, Notificacion.tipo == tipo)
        for campo, valor in refs.items():
            q = q.filter(getattr(Notificacion, campo) == valor)
        q.delete(synchronize_session=False)

    def listar(self, usuario_id: int, solo_no_leidas: bool, limit: int, offset: int) -> list[dict]:
        return [dict(r) for r in self.db.execute(text(
            f"""SELECT n.id, n.tipo, n.post_id, n.comentario_id, n.album_id, n.leida, n.fecha,
                       u.id AS actor_id, u.username AS actor_username, u.nombre AS actor_nombre
                FROM notificacion n JOIN usuario u ON u.id = n.actor_id
                WHERE n.usuario_id = :uid AND (NOT :solo OR NOT n.leida) AND {VISIBLE}
                ORDER BY n.fecha DESC, n.id DESC LIMIT :limit OFFSET :offset"""),
            {"uid": usuario_id, "solo": solo_no_leidas, "limit": limit, "offset": offset}).mappings().all()]

    def no_leidas(self, usuario_id: int) -> int:
        return self.db.execute(text(
            f"""SELECT count(*) FROM notificacion n JOIN usuario u ON u.id = n.actor_id
                WHERE n.usuario_id = :uid AND NOT n.leida AND {VISIBLE}"""), {"uid": usuario_id}).scalar()

    def marcar_leidas(self, usuario_id: int, notificacion_id: int | None = None) -> int:
        q = self.db.query(Notificacion).filter(Notificacion.usuario_id == usuario_id, Notificacion.leida.is_(False))
        if notificacion_id is not None:
            q = q.filter(Notificacion.id == notificacion_id)
        n = q.update({"leida": True}, synchronize_session=False)
        self.db.commit()
        return n
