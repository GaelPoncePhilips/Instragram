from fastapi import Depends, Header
from sqlalchemy.orm import Session

from src.db.connection import get_db
from src.db.models.usuario_model import Usuario
from src.repositories.usuario_repository import UsuarioRepository
from src.utils.errors import ForbiddenError, UnauthorizedError
from src.utils.jwt import decode_token


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> Usuario:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise UnauthorizedError("Falta el header Authorization: Bearer <token>")

    payload = decode_token(authorization.split(" ", 1)[1].strip())
    usuario_id = payload.get("sub")
    if usuario_id is None:
        raise UnauthorizedError("Token inválido")

    usuario = UsuarioRepository(db).buscar_por_id(int(usuario_id))
    if usuario is None:
        raise UnauthorizedError("El usuario ya no existe")
    return usuario


def verificar_dueno(usuario_id: int, actual: Usuario) -> None:
    """Para rutas /usuarios/{id}/... que solo puede usar el propio dueño."""
    if actual.id != usuario_id:
        raise ForbiddenError("Solo el dueño de la cuenta puede hacer esto")
