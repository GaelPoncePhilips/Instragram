from sqlalchemy.orm import Session

from src.dtos.usuario_dto import (
    CreateUsuarioDTO, PerfilDTO, UpdateUsuarioDTO, UsuarioResponseDTO, UsuarioResumenDTO,
)
from src.mappers.usuario_mapper import to_usuario_response
from src.repositories.seguidor_repository import SeguidorRepository
from src.repositories.usuario_repository import UsuarioRepository
from src.utils.errors import ConflictError, NotFoundError
from src.utils.hash import hash_password


class UsuarioService:
    def __init__(self, db: Session):
        self.repo = UsuarioRepository(db)
        self.seguidores = SeguidorRepository(db)

    def registrar(self, dto: CreateUsuarioDTO) -> UsuarioResponseDTO:
        if self.repo.buscar_por_username(dto.username):
            raise ConflictError("El username ya está registrado")
        if self.repo.buscar_por_email(dto.email):
            raise ConflictError("El email ya está registrado")
        usuario = self.repo.crear(
            username=dto.username,
            email=dto.email.lower(),
            password_hash=hash_password(dto.password),
            nombre=dto.nombre,
            bio=dto.bio,
        )
        return to_usuario_response(usuario)

    def perfil(self, username: str, visitante_id: int) -> PerfilDTO:
        usuario = self.repo.buscar_por_username(username)
        if usuario is None or usuario.eliminado_en is not None or (
            usuario.id != visitante_id and self.repo.hay_bloqueo(usuario.id, visitante_id)
        ):
            raise NotFoundError("Usuario no encontrado")

        if usuario.id == visitante_id:
            relacion = "yo"
        else:
            s = self.seguidores.obtener(visitante_id, usuario.id)
            relacion = {"aceptado": "siguiendo", "pendiente": "pendiente"}.get(s.estado if s else "", "ninguna")

        return PerfilDTO(
            id=usuario.id,
            username=usuario.username,
            nombre=usuario.nombre,
            bio=usuario.bio,
            es_privada=usuario.es_privada,
            relacion=relacion,
            **self.repo.contadores(usuario.id),
        )

    def buscar(self, q: str, yo: int, limit: int, offset: int) -> list[UsuarioResumenDTO]:
        return [UsuarioResumenDTO(**f) for f in self.repo.buscar(q.strip().lstrip("@"), yo, limit, offset)]

    def actualizar(self, usuario_id: int, dto: UpdateUsuarioDTO) -> UsuarioResponseDTO:
        usuario = self.repo.buscar_por_id(usuario_id)
        if usuario is None:
            raise NotFoundError("Usuario no encontrado")
        campos = dto.model_dump(exclude_unset=True, exclude_none=True)
        return to_usuario_response(self.repo.actualizar(usuario, campos))
