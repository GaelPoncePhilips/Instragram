from sqlalchemy import or_, text
from sqlalchemy.orm import Session

from src.db.models.bloqueo_model import Bloqueo, MejorAmigo
from src.db.models.seguidor_model import Seguidor


class BloqueoRepository:
    def __init__(self, db: Session):
        self.db = db

    # ---------- bloqueos (HU10)
    def obtener(self, bloqueador_id: int, bloqueado_id: int) -> Bloqueo | None:
        return self.db.query(Bloqueo).filter(
            Bloqueo.bloqueador_id == bloqueador_id, Bloqueo.bloqueado_id == bloqueado_id
        ).first()

    def bloquear(self, yo: int, otro: int) -> Bloqueo:
        """Crea el bloqueo y borra seguimientos y mejores amigos en ambos sentidos, todo junto."""
        par = lambda a, b: or_((a == yo) & (b == otro), (a == otro) & (b == yo))  # noqa: E731
        self.db.query(Seguidor).filter(par(Seguidor.seguidor_id, Seguidor.seguido_id)).delete(synchronize_session=False)
        self.db.query(MejorAmigo).filter(par(MejorAmigo.usuario_id, MejorAmigo.amigo_id)).delete(synchronize_session=False)
        bloqueo = Bloqueo(bloqueador_id=yo, bloqueado_id=otro)
        self.db.add(bloqueo)
        self.db.commit()
        self.db.refresh(bloqueo)
        return bloqueo

    def desbloquear(self, bloqueo: Bloqueo) -> None:
        self.db.delete(bloqueo)
        self.db.commit()

    def bloqueados_por(self, yo: int, limit: int, offset: int) -> list[dict]:
        return [dict(r) for r in self.db.execute(text(
            """SELECT u.id, u.username, u.nombre FROM bloqueo b JOIN usuario u ON u.id = b.bloqueado_id AND u.eliminado_en IS NULL
               WHERE b.bloqueador_id = :yo ORDER BY b.fecha DESC LIMIT :limit OFFSET :offset"""),
            {"yo": yo, "limit": limit, "offset": offset}).mappings().all()]

    # ---------- mejores amigos (HU8)
    def es_mejor_amigo(self, usuario_id: int, amigo_id: int) -> bool:
        return self.db.get(MejorAmigo, (usuario_id, amigo_id)) is not None

    def agregar_mejor_amigo(self, usuario_id: int, amigo_id: int) -> None:
        self.db.execute(text(
            "INSERT INTO mejores_amigos (usuario_id, amigo_id) VALUES (:u, :a) ON CONFLICT DO NOTHING"),
            {"u": usuario_id, "a": amigo_id})
        self.db.commit()

    def quitar_mejor_amigo(self, usuario_id: int, amigo_id: int) -> None:
        self.db.query(MejorAmigo).filter(
            MejorAmigo.usuario_id == usuario_id, MejorAmigo.amigo_id == amigo_id).delete()
        self.db.commit()

    def mejores_amigos(self, usuario_id: int, limit: int, offset: int) -> list[dict]:
        return [dict(r) for r in self.db.execute(text(
            """SELECT u.id, u.username, u.nombre FROM mejores_amigos m JOIN usuario u ON u.id = m.amigo_id AND u.eliminado_en IS NULL
               WHERE m.usuario_id = :uid ORDER BY u.username LIMIT :limit OFFSET :offset"""),
            {"uid": usuario_id, "limit": limit, "offset": offset}).mappings().all()]
