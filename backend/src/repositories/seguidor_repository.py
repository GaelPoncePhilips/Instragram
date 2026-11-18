from sqlalchemy.orm import Session

from src.db.models.bloqueo_model import MejorAmigo
from src.db.models.seguidor_model import Seguidor


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
        self.db.commit()
        self.db.refresh(seguimiento)
        return seguimiento

    def aceptar(self, seguimiento: Seguidor) -> Seguidor:
        seguimiento.estado = "aceptado"
        self.db.commit()
        self.db.refresh(seguimiento)
        return seguimiento

    def eliminar(self, seguimiento: Seguidor) -> None:
        """Borra el seguimiento y, como deja de seguir, sale de los mejores amigos del seguido (HU8)."""
        self.db.query(MejorAmigo).filter(
            MejorAmigo.usuario_id == seguimiento.seguido_id,
            MejorAmigo.amigo_id == seguimiento.seguidor_id,
        ).delete(synchronize_session=False)
        self.db.delete(seguimiento)
        self.db.commit()

    def pendientes(self, usuario_id: int) -> list[Seguidor]:
        return self.db.query(Seguidor).filter(
            Seguidor.seguido_id == usuario_id, Seguidor.estado == "pendiente"
        ).order_by(Seguidor.fecha).all()
