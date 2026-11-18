from src.repositories.seguidor_repository import SeguidorRepository
from src.repositories.usuario_repository import UsuarioRepository
from src.db.models.seguidor import Seguidor


class SeguidorService:

    def __init__(self, db):
        self.seguidor_repository = SeguidorRepository(db)
        self.usuario_repository = UsuarioRepository(db)

    # Seguir a un usuario
    def seguir_usuario(self, seguidor_id: int, seguido_id: int):

        # No permitir seguirse a uno mismo
        if seguidor_id == seguido_id:
            raise ValueError("No podes seguirte a vos mismo")

        # Comprobar que ambos usuarios existan
        seguidor = self.usuario_repository.obtener_por_id(seguidor_id)
        seguido = self.usuario_repository.obtener_por_id(seguido_id)

        if not seguidor or not seguido:
            raise ValueError("Uno de los usuarios no existe")

        # Comprobar si ya existe el seguimiento
        existente = self.seguidor_repository.obtener_seguimiento(
            seguidor_id, seguido_id
        )

        if existente:
            raise ValueError("Ya estas siguiendo a este usuario o tenes una solicitud pendiente")

        # Determinar el estado según la privacidad
        if seguido.es_privada:
            estado = "pendiente"
        else:
            estado = "aceptado"

        nuevo_seguimiento = Seguidor(
            seguidor_id=seguidor_id,
            seguido_id=seguido_id,
            estado=estado
        )

        return self.seguidor_repository.crear_seguimiento(nuevo_seguimiento)

    # Aceptar o rechazar una solicitud
    def responder_solicitud(self, seguidor_id: int, seguido_id: int, estado: str):

        if estado not in ["aceptado", "rechazado"]:
            raise ValueError("Estado no valido")

        solicitud = self.seguidor_repository.obtener_seguimiento(
            seguidor_id, seguido_id
        )

        if not solicitud:
            raise ValueError("La solicitud no existe")

        if solicitud.estado != "pendiente":
            raise ValueError("La solicitud ya fue respondida")

        if estado == "rechazado":
            return self.seguidor_repository.eliminar_seguimiento(
                seguidor_id, seguido_id
            )

        return self.seguidor_repository.actualizar_estado(
            seguidor_id, seguido_id, "aceptado"
        )

    # Listar solicitudes pendientes
    def listar_solicitudes(self, usuario_id: int):

        return self.seguidor_repository.obtener_solicitudes_pendientes(
            usuario_id
        )
