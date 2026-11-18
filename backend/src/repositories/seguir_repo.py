from sqlalchemy.orm import Session

from src.db.models.seguidor import Seguidor


class SeguidorRepository:

    def __init__(self, db: Session):
        self.db = db

    # Buscar un seguimiento entre dos usuarios
    def obtener_seguimiento(self, seguidor_id: int, seguido_id: int):
        return self.db.query(Seguidor).filter(
            Seguidor.seguidor_id == seguidor_id,
            Seguidor.seguido_id == seguido_id
        ).first()

    # Crear un nuevo seguimiento
    def crear_seguimiento(self, seguidor: Seguidor):
        self.db.add(seguidor)
        self.db.commit()
        self.db.refresh(seguidor)
        return seguidor

    # Cambiar el estado de una solicitud
    def actualizar_estado(self, seguidor_id: int, seguido_id: int, estado: str):
        seguimiento = self.obtener_seguimiento(seguidor_id, seguido_id)

        if seguimiento:
            seguimiento.estado = estado
            self.db.commit()
            self.db.refresh(seguimiento)

        return seguimiento

    # Obtener las solicitudes pendientes de un usuario
    def obtener_solicitudes_pendientes(self, usuario_id: int):
        return self.db.query(Seguidor).filter(
            Seguidor.seguido_id == usuario_id,
            Seguidor.estado == "pendiente"
        ).all()

    # Obtener los usuarios que sigue una persona
    def obtener_seguidos(self, usuario_id: int):
        return self.db.query(Seguidor).filter(
            Seguidor.seguidor_id == usuario_id,
            Seguidor.estado == "aceptado"
        ).all()

    # Obtener los seguidores de una persona
    def obtener_seguidores(self, usuario_id: int):
        return self.db.query(Seguidor).filter(
            Seguidor.seguido_id == usuario_id,
            Seguidor.estado == "aceptado"
        ).all()

    # Eliminar un seguimiento
    def eliminar_seguimiento(self, seguidor_id: int, seguido_id: int):
        seguimiento = self.obtener_seguimiento(seguidor_id, seguido_id)

        if seguimiento:
            self.db.delete(seguimiento)
            self.db.commit()

        return seguimiento
