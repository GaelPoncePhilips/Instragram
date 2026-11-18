from sqlalchemy.orm import Session

from src.dtos.seguidor_dto import SeguidorResponseDTO
from src.mappers.seguidor_mapper import to_seguidor_response
from src.repositories.seguidor_repository import SeguidorRepository
from src.services.permisos_service import PermisosService
from src.utils.errors import BadRequestError, ConflictError, NotFoundError


class SeguidorService:
    def __init__(self, db: Session):
        self.repo = SeguidorRepository(db)
        self.permisos = PermisosService(db)

    def seguir(self, seguidor_id: int, seguido_id: int) -> SeguidorResponseDTO:
        if seguidor_id == seguido_id:
            raise BadRequestError("No podés seguirte a vos mismo")
        seguido = self.permisos.usuario_visible(seguido_id, seguidor_id)  # 404 si hay bloqueo
        if self.repo.obtener(seguidor_id, seguido_id):
            raise ConflictError("Ya seguís a este usuario o tenés una solicitud pendiente")
        estado = "pendiente" if seguido.es_privada else "aceptado"
        return to_seguidor_response(self.repo.crear(seguidor_id, seguido_id, estado))

    def dejar_de_seguir(self, seguidor_id: int, seguido_id: int) -> None:
        seguimiento = self.repo.obtener(seguidor_id, seguido_id)
        if seguimiento is None:
            raise NotFoundError("No seguís a este usuario")
        self.repo.eliminar(seguimiento)

    def solicitudes(self, usuario_id: int) -> list[SeguidorResponseDTO]:
        return [to_seguidor_response(s) for s in self.repo.pendientes(usuario_id)]

    def responder(self, usuario_id: int, seguidor_id: int, accion: str) -> SeguidorResponseDTO | None:
        solicitud = self.repo.obtener(seguidor_id, usuario_id)
        if solicitud is None or solicitud.estado != "pendiente":
            raise NotFoundError("No hay una solicitud pendiente de ese usuario")
        if accion == "rechazar":
            self.repo.eliminar(solicitud)
            return None
        return to_seguidor_response(self.repo.aceptar(solicitud))
