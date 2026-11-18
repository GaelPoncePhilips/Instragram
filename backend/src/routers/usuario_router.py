from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.db.connection import get_db
from src.db.models.usuario_model import Usuario
from src.dtos.usuario_dto import CreateUsuarioDTO, PerfilDTO, UpdateUsuarioDTO, UsuarioResponseDTO
from src.middlewares.auth_middleware import get_current_user, verificar_dueno
from src.schemas.usuario_schema import CreateUsuarioSchema, UpdateUsuarioSchema
from src.services.usuario_service import UsuarioService

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


@router.post("", response_model=UsuarioResponseDTO, status_code=status.HTTP_201_CREATED)
def registrar(payload: CreateUsuarioSchema, db: Session = Depends(get_db)):
    return UsuarioService(db).registrar(CreateUsuarioDTO(**payload.model_dump()))


@router.get("/{username}", response_model=PerfilDTO)
def perfil(username: str, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    return UsuarioService(db).perfil(username, actual.id)


@router.patch("/{usuario_id}", response_model=UsuarioResponseDTO)
def actualizar(
    usuario_id: int,
    payload: UpdateUsuarioSchema,
    db: Session = Depends(get_db),
    actual: Usuario = Depends(get_current_user),
):
    verificar_dueno(usuario_id, actual)
    return UsuarioService(db).actualizar(usuario_id, UpdateUsuarioDTO(**payload.model_dump(exclude_unset=True)))
