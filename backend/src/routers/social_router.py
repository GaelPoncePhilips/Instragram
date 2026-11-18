from datetime import datetime

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.db.connection import get_db
from src.db.models.usuario_model import Usuario
from src.dtos.usuario_dto import EstadisticasDTO, SugerenciaDTO, UsuarioResumenDTO
from src.middlewares.auth_middleware import get_current_user, verificar_dueno
from src.routers.deps import Pagina
from src.services.social_service import SocialService

router = APIRouter(tags=["social"])
Lista = list[UsuarioResumenDTO]


@router.get("/usuarios/{usuario_id}/seguidores", response_model=Lista)
def seguidores(usuario_id: int, pag: Pagina = Depends(), db: Session = Depends(get_db),
               actual: Usuario = Depends(get_current_user)):
    return SocialService(db).seguidores_de(usuario_id, actual.id, pag.limit, pag.offset)


@router.get("/usuarios/{usuario_id}/seguidos", response_model=Lista)
def seguidos(usuario_id: int, pag: Pagina = Depends(), db: Session = Depends(get_db),
             actual: Usuario = Depends(get_current_user)):
    return SocialService(db).seguidos_de(usuario_id, actual.id, pag.limit, pag.offset)


@router.delete("/usuarios/{usuario_id}/seguidores/{seguidor_id}", status_code=status.HTTP_204_NO_CONTENT)
def quitar_seguidor(usuario_id: int, seguidor_id: int, db: Session = Depends(get_db),
                    actual: Usuario = Depends(get_current_user)):
    verificar_dueno(usuario_id, actual)
    SocialService(db).quitar_seguidor(actual.id, seguidor_id)


@router.get("/usuarios/{usuario_id}/no-me-siguen", response_model=Lista)
def no_me_siguen(usuario_id: int, pag: Pagina = Depends(), db: Session = Depends(get_db),
                 actual: Usuario = Depends(get_current_user)):
    verificar_dueno(usuario_id, actual)
    return SocialService(db).no_me_siguen(actual.id, pag.limit, pag.offset)


@router.get("/usuarios/{usuario_id}/estadisticas", response_model=EstadisticasDTO)
def estadisticas(usuario_id: int, desde: datetime | None = None, hasta: datetime | None = None,
                 db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    verificar_dueno(usuario_id, actual)
    return SocialService(db).estadisticas(actual.id, desde, hasta)


@router.get("/usuarios/{usuario_id}/sugerencias", response_model=list[SugerenciaDTO])
def sugerencias(usuario_id: int, pag: Pagina = Depends(), db: Session = Depends(get_db),
                actual: Usuario = Depends(get_current_user)):
    verificar_dueno(usuario_id, actual)
    return SocialService(db).sugerencias(actual.id, pag.limit, pag.offset)


# ---------- Bloqueos (HU10)
@router.post("/usuarios/{usuario_id}/bloqueo", status_code=status.HTTP_204_NO_CONTENT)
def bloquear(usuario_id: int, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    SocialService(db).bloquear(actual.id, usuario_id)


@router.delete("/usuarios/{usuario_id}/bloqueo", status_code=status.HTTP_204_NO_CONTENT)
def desbloquear(usuario_id: int, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    SocialService(db).desbloquear(actual.id, usuario_id)


@router.get("/bloqueos", response_model=Lista)
def bloqueados(pag: Pagina = Depends(), db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    return SocialService(db).bloqueados(actual.id, pag.limit, pag.offset)


# ---------- Mejores amigos (HU8)
@router.get("/usuarios/{usuario_id}/mejores-amigos", response_model=Lista)
def mejores_amigos(usuario_id: int, pag: Pagina = Depends(), db: Session = Depends(get_db),
                   actual: Usuario = Depends(get_current_user)):
    verificar_dueno(usuario_id, actual)
    return SocialService(db).mejores_amigos(actual.id, pag.limit, pag.offset)


@router.post("/usuarios/{usuario_id}/mejores-amigos/{amigo_id}", status_code=status.HTTP_204_NO_CONTENT)
def agregar_mejor_amigo(usuario_id: int, amigo_id: int, db: Session = Depends(get_db),
                        actual: Usuario = Depends(get_current_user)):
    verificar_dueno(usuario_id, actual)
    SocialService(db).agregar_mejor_amigo(actual.id, amigo_id)


@router.delete("/usuarios/{usuario_id}/mejores-amigos/{amigo_id}", status_code=status.HTTP_204_NO_CONTENT)
def quitar_mejor_amigo(usuario_id: int, amigo_id: int, db: Session = Depends(get_db),
                       actual: Usuario = Depends(get_current_user)):
    verificar_dueno(usuario_id, actual)
    SocialService(db).quitar_mejor_amigo(actual.id, amigo_id)
