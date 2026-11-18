"""Reglas de visibilidad compartidas por todos los services (HU4, HU10)."""
from sqlalchemy.orm import Session

from src.db.models.usuario_model import Usuario
from src.repositories.seguidor_repository import SeguidorRepository
from src.repositories.usuario_repository import UsuarioRepository
from src.utils.errors import ForbiddenError, NotFoundError


class PermisosService:
    def __init__(self, db: Session):
        self.usuarios = UsuarioRepository(db)
        self.seguidores = SeguidorRepository(db)

    def usuario_visible(self, usuario_id: int, visitante_id: int) -> Usuario:
        """Devuelve el usuario o 404 si no existe o hay bloqueo entre ambos."""
        usuario = self.usuarios.buscar_por_id(usuario_id)
        if usuario is None or (
            usuario.id != visitante_id and self.usuarios.hay_bloqueo(usuario.id, visitante_id)
        ):
            raise NotFoundError("Usuario no encontrado")
        return usuario

    def puede_ver_contenido(self, dueno: Usuario, visitante_id: int) -> bool:
        return (
            dueno.id == visitante_id
            or not dueno.es_privada
            or self.seguidores.es_seguidor_aceptado(visitante_id, dueno.id)
        )

    def exigir_ver_contenido(self, dueno_id: int, visitante_id: int) -> Usuario:
        dueno = self.usuario_visible(dueno_id, visitante_id)
        if not self.puede_ver_contenido(dueno, visitante_id):
            raise ForbiddenError("Esta cuenta es privada")
        return dueno
