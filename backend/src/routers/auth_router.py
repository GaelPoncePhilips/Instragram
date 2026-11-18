from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.db.connection import get_db
from src.db.models.usuario_model import Usuario
from src.dtos.auth_dto import LoginDTO, TokenDTO
from src.dtos.usuario_dto import UsuarioResponseDTO
from src.mappers.usuario_mapper import to_usuario_response
from src.middlewares.auth_middleware import get_current_user, verificar_dueno
from src.schemas.auth_schema import BorrarCuentaSchema, CambiarPasswordSchema, LoginSchema, RefreshSchema
from src.services.auth_service import AuthService

router = APIRouter(tags=["auth"])


@router.post("/auth/login", response_model=TokenDTO)
def login(payload: LoginSchema, db: Session = Depends(get_db)):
    return AuthService(db).login(LoginDTO(**payload.model_dump()))


@router.post("/auth/refresh", response_model=TokenDTO)
def refresh(payload: RefreshSchema, db: Session = Depends(get_db)):
    """Cambia un refresh token por un access token nuevo y un refresh token nuevo (rotación)."""
    return AuthService(db).refresh(payload.refresh_token)


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: RefreshSchema, db: Session = Depends(get_db)):
    AuthService(db).logout(payload.refresh_token)


@router.get("/auth/me", response_model=UsuarioResponseDTO)
def me(actual: Usuario = Depends(get_current_user)):
    return to_usuario_response(actual)


@router.patch("/usuarios/{usuario_id}/password", response_model=TokenDTO, tags=["usuarios"])
def cambiar_password(usuario_id: int, payload: CambiarPasswordSchema, db: Session = Depends(get_db),
                     actual: Usuario = Depends(get_current_user)):
    """Cierra las demás sesiones y devuelve tokens nuevos para la sesión actual."""
    verificar_dueno(usuario_id, actual)
    return AuthService(db).cambiar_password(actual, payload.actual, payload.nueva)


@router.delete("/usuarios/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["usuarios"])
def borrar_cuenta(usuario_id: int, payload: BorrarCuentaSchema, db: Session = Depends(get_db),
                  actual: Usuario = Depends(get_current_user)):
    verificar_dueno(usuario_id, actual)
    AuthService(db).borrar_cuenta(actual, payload.password)
