from datetime import datetime

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.db.connection import get_db
from src.db.models.usuario_model import Usuario
from src.dtos.usuario_dto import UsuarioResumenDTO
from src.middlewares.auth_middleware import get_current_user
from src.repositories.notificacion_repository import NotificacionRepository
from src.routers.deps import Pagina
from src.utils.errors import NotFoundError

router = APIRouter(prefix="/notificaciones", tags=["notificaciones"])


class NotificacionDTO(BaseModel):
    id: int
    tipo: str  # seguidor_nuevo | solicitud | solicitud_aceptada | like | comentario | invitacion_album
    actor: UsuarioResumenDTO
    post_id: int | None
    comentario_id: int | None
    album_id: int | None
    leida: bool
    fecha: datetime


class NoLeidasDTO(BaseModel):
    no_leidas: int


@router.get("", response_model=list[NotificacionDTO])
def listar(solo_no_leidas: bool = False, pag: Pagina = Depends(), db: Session = Depends(get_db),
           actual: Usuario = Depends(get_current_user)):
    filas = NotificacionRepository(db).listar(actual.id, solo_no_leidas, pag.limit, pag.offset)
    return [NotificacionDTO(
        **{k: v for k, v in f.items() if not k.startswith("actor_")},
        actor=UsuarioResumenDTO(id=f["actor_id"], username=f["actor_username"], nombre=f["actor_nombre"]),
    ) for f in filas]


@router.get("/no-leidas", response_model=NoLeidasDTO)
def no_leidas(db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    return NoLeidasDTO(no_leidas=NotificacionRepository(db).no_leidas(actual.id))


@router.post("/leidas", status_code=status.HTTP_204_NO_CONTENT)
def marcar_todas(db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    NotificacionRepository(db).marcar_leidas(actual.id)


@router.post("/{notificacion_id}/leida", status_code=status.HTTP_204_NO_CONTENT)
def marcar_una(notificacion_id: int, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    if NotificacionRepository(db).marcar_leidas(actual.id, notificacion_id) == 0:
        raise NotFoundError("Notificación no encontrada o ya leída")
