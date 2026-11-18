from src.db.models.usuario_model import Usuario
from src.dtos.usuario_dto import UsuarioResponseDTO, UsuarioResumenDTO


def to_usuario_response(usuario: Usuario) -> UsuarioResponseDTO:
    return UsuarioResponseDTO.model_validate(usuario)


def to_usuario_resumen(usuario: Usuario) -> UsuarioResumenDTO:
    return UsuarioResumenDTO.model_validate(usuario)
