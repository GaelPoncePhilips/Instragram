from sqlalchemy import text
from sqlalchemy.orm import Session

from src.db.models.bloqueo_model import MejorAmigo
from src.db.models.seguidor_model import Seguidor
from src.repositories.notificacion_repository import NotificacionRepository
from src.repositories.sql import sin_bloqueo


class SeguidorRepository:
    def __init__(self, db: Session):
        self.db = db

    def obtener(self, seguidor_id: int, seguido_id: int) -> Seguidor | None:
        return self.db.get(Seguidor, (seguidor_id, seguido_id))

    def es_seguidor_aceptado(self, seguidor_id: int, seguido_id: int) -> bool:
        s = self.obtener(seguidor_id, seguido_id)
        return s is not None and s.estado == "aceptado"

    def crear(self, seguidor_id: int, seguido_id: int, estado: str) -> Seguidor:
        seguimiento = Seguidor(seguidor_id=seguidor_id, seguido_id=seguido_id, estado=estado)
        self.db.add(seguimiento)
        NotificacionRepository(self.db).crear(
            seguido_id, seguidor_id, "solicitud" if estado == "pendiente" else "seguidor_nuevo")
        self.db.commit()
        self.db.refresh(seguimiento)
        return seguimiento

    def aceptar(self, seguimiento: Seguidor) -> Seguidor:
        seguimiento.estado = "aceptado"
        notis = NotificacionRepository(self.db)
        notis.borrar(seguimiento.seguido_id, seguimiento.seguidor_id, "solicitud")
        notis.crear(seguimiento.seguido_id, seguimiento.seguidor_id, "seguidor_nuevo")
        notis.crear(seguimiento.seguidor_id, seguimiento.seguido_id, "solicitud_aceptada")
        self.db.commit()
        self.db.refresh(seguimiento)
        return seguimiento

    def eliminar(self, seguimiento: Seguidor) -> None:
        """Borra el seguimiento y, como deja de seguir, sale de los mejores amigos del seguido (HU8)."""
        self.db.query(MejorAmigo).filter(
            MejorAmigo.usuario_id == seguimiento.seguido_id,
            MejorAmigo.amigo_id == seguimiento.seguidor_id,
        ).delete(synchronize_session=False)
        if seguimiento.estado == "pendiente":
            NotificacionRepository(self.db).borrar(seguimiento.seguido_id, seguimiento.seguidor_id, "solicitud")
        self.db.delete(seguimiento)
        self.db.commit()

    def pendientes(self, usuario_id: int) -> list[Seguidor]:
        return self.db.query(Seguidor).filter(
            Seguidor.seguido_id == usuario_id, Seguidor.estado == "pendiente"
        ).order_by(Seguidor.fecha).all()

    def _usuarios(self, sql: str, **params) -> list[dict]:
        return [dict(r) for r in self.db.execute(text(sql), params).mappings().all()]

    def seguidores_de(self, usuario_id: int, limit: int, offset: int) -> list[dict]:
        return self._usuarios(
            """SELECT u.id, u.username, u.nombre FROM seguidores s JOIN usuario u ON u.id = s.seguidor_id AND u.eliminado_en IS NULL
               WHERE s.seguido_id = :uid AND s.estado = 'aceptado' ORDER BY s.fecha DESC LIMIT :limit OFFSET :offset""",
            uid=usuario_id, limit=limit, offset=offset)

    def seguidos_de(self, usuario_id: int, limit: int, offset: int) -> list[dict]:
        return self._usuarios(
            """SELECT u.id, u.username, u.nombre FROM seguidores s JOIN usuario u ON u.id = s.seguido_id AND u.eliminado_en IS NULL
               WHERE s.seguidor_id = :uid AND s.estado = 'aceptado' ORDER BY s.fecha DESC LIMIT :limit OFFSET :offset""",
            uid=usuario_id, limit=limit, offset=offset)

    def no_me_siguen(self, usuario_id: int, limit: int, offset: int) -> list[dict]:
        """A quiénes sigo (aceptado) y no me siguen (HU12)."""
        return self._usuarios(
            """SELECT u.id, u.username, u.nombre FROM seguidores s JOIN usuario u ON u.id = s.seguido_id AND u.eliminado_en IS NULL
               WHERE s.seguidor_id = :uid AND s.estado = 'aceptado'
                 AND NOT EXISTS (SELECT 1 FROM seguidores r WHERE r.seguidor_id = s.seguido_id
                                 AND r.seguido_id = :uid AND r.estado = 'aceptado')
               ORDER BY u.username LIMIT :limit OFFSET :offset""",
            uid=usuario_id, limit=limit, offset=offset)

    def sugerencias(self, yo: int, limit: int, offset: int) -> list[dict]:
        """Cuentas para seguir: amigos en común, si me sigue y popularidad (docs/RECOMENDACIONES.md)."""
        return self._usuarios(
            f"""SELECT id, username, nombre, en_comun, te_sigue FROM (
                  SELECT u.id, u.username, u.nombre,
                    (SELECT count(*) FROM seguidores s1 JOIN seguidores s2 ON s2.seguidor_id = s1.seguido_id
                      WHERE s1.seguidor_id = :yo AND s1.estado = 'aceptado'
                        AND s2.seguido_id = u.id AND s2.estado = 'aceptado') AS en_comun,
                    EXISTS (SELECT 1 FROM seguidores s3 WHERE s3.seguidor_id = u.id AND s3.seguido_id = :yo
                            AND s3.estado = 'aceptado') AS te_sigue,
                    (SELECT count(*) FROM seguidores s4 WHERE s4.seguido_id = u.id AND s4.estado = 'aceptado') AS populares
                  FROM usuario u
                  WHERE u.id <> :yo AND u.eliminado_en IS NULL AND {sin_bloqueo('u')}
                    AND NOT EXISTS (SELECT 1 FROM seguidores s WHERE s.seguidor_id = :yo AND s.seguido_id = u.id)
                ) x
                ORDER BY 3 * en_comun + 2 * te_sigue::int + ln(1 + populares) DESC, id
                LIMIT :limit OFFSET :offset""",
            yo=yo, limit=limit, offset=offset)
