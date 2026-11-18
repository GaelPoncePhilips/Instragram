from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session

from src.db.connection import get_db
from src.repositories.usuario_repository import UsuarioRepository
from src.schemas.usuario_schema import (
    UsuarioCreateSchema,
    UsuarioResponseSchema,
    UsuarioPerfilSchema,
    UsuarioPrivacidadSchema
)
from src.services.usuario_service import UsuarioService

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


@router.post(
    "",
    response_model=UsuarioResponseSchema,
    status_code=status.HTTP_201_CREATED
)
def registrar_usuario(
    payload: UsuarioCreateSchema,
    db: Session = Depends(get_db)
):
    repository = UsuarioRepository(db)
    service = UsuarioService(repository)

    try:
        return service.registrar_usuario(payload)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )


@router.get(
    "/{username}",
    response_model=UsuarioPerfilSchema
)
def obtener_perfil(
    username: str,
    db: Session = Depends(get_db)
):
    repository = UsuarioRepository(db)
    service = UsuarioService(repository)

    try:
        return service.obtener_perfil(username)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.patch("/{usuario_id}/privacidad")
def cambiar_privacidad(
    usuario_id: int,
    payload: UsuarioPrivacidadSchema,
    db: Session = Depends(get_db)
):
    repository = UsuarioRepository(db)
    service = UsuarioService(repository)

    try:
        return service.cambiar_privacidad(
            usuario_id,
            payload.es_privada
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

