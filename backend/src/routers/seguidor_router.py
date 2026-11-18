from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from src.db.connection import get_db
from src.db.models.usuario_model import Usuario
from src.dtos.seguidor_dto import SeguidorResponseDTO
from src.middlewares.auth_middleware import get_current_user, verificar_dueno
from src.schemas.seguidor_schema import ResponderSolicitudSchema
from src.services.seguidor_service import SeguidorService

router = APIRouter(prefix="/usuarios", tags=["seguidores"])


@router.post("/{usuario_id}/seguir", response_model=SeguidorResponseDTO, status_code=status.HTTP_201_CREATED)
def seguir(usuario_id: int, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    return SeguidorService(db).seguir(actual.id, usuario_id)


@router.delete("/{usuario_id}/seguir", status_code=status.HTTP_204_NO_CONTENT)
def dejar_de_seguir(usuario_id: int, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    SeguidorService(db).dejar_de_seguir(actual.id, usuario_id)


@router.get("/{usuario_id}/solicitudes", response_model=list[SeguidorResponseDTO])
def solicitudes(usuario_id: int, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    verificar_dueno(usuario_id, actual)
    return SeguidorService(db).solicitudes(usuario_id)


@router.patch("/{usuario_id}/solicitudes/{seguidor_id}", response_model=SeguidorResponseDTO | None)
def responder(
    usuario_id: int,
    seguidor_id: int,
    payload: ResponderSolicitudSchema,
    db: Session = Depends(get_db),
    actual: Usuario = Depends(get_current_user),
):
    verificar_dueno(usuario_id, actual)
    resultado = SeguidorService(db).responder(usuario_id, seguidor_id, payload.accion)
    return resultado if resultado is not None else Response(status_code=status.HTTP_204_NO_CONTENT)
