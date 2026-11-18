"""EXTRA: destacadas, álbumes compartidos y DMs."""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from src.db.connection import get_db
from src.db.models.usuario_model import Usuario
from src.dtos.extra_dto import AlbumDTO, AlbumItemDTO, ConversacionDTO, DestacadaDTO, MensajeDTO
from src.middlewares.auth_middleware import get_current_user, verificar_dueno
from src.routers.deps import Pagina
from src.schemas.extra_schema import (
    AgregarStorySchema, CreateAlbumItemSchema, CreateAlbumSchema, CreateConversacionSchema,
    CreateDestacadaSchema, CreateMensajeSchema, InvitarSchema, OrdenDestacadasSchema,
    OrdenStoriesSchema, UpdateAlbumSchema, UpdateDestacadaSchema,
)
from src.services.album_service import AlbumService
from src.services.destacada_service import DestacadaService
from src.services.dm_service import DMService

router = APIRouter()
DB = Depends(get_db)
YO = Depends(get_current_user)
NO_CONTENT = {"status_code": status.HTTP_204_NO_CONTENT}

# ======================= Destacadas
t = ["destacadas"]


@router.get("/usuarios/{usuario_id}/destacadas", response_model=list[DestacadaDTO], tags=t)
def destacadas_de(usuario_id: int, db: Session = DB, actual: Usuario = YO):
    return DestacadaService(db).listar(usuario_id, actual.id)


@router.put("/usuarios/{usuario_id}/destacadas/orden", response_model=list[DestacadaDTO], tags=t)
def ordenar_destacadas(usuario_id: int, payload: OrdenDestacadasSchema, db: Session = DB, actual: Usuario = YO):
    verificar_dueno(usuario_id, actual)
    return DestacadaService(db).ordenar_destacadas(actual.id, payload.destacada_ids)


@router.post("/destacadas", response_model=DestacadaDTO, status_code=status.HTTP_201_CREATED, tags=t)
def crear_destacada(payload: CreateDestacadaSchema, db: Session = DB, actual: Usuario = YO):
    return DestacadaService(db).crear(actual.id, payload.titulo, payload.portada_url, payload.story_ids)


@router.get("/destacadas/{destacada_id}", response_model=DestacadaDTO, tags=t)
def obtener_destacada(destacada_id: int, db: Session = DB, actual: Usuario = YO):
    return DestacadaService(db).obtener(destacada_id, actual.id)


@router.patch("/destacadas/{destacada_id}", response_model=DestacadaDTO, tags=t)
def actualizar_destacada(destacada_id: int, payload: UpdateDestacadaSchema, db: Session = DB, actual: Usuario = YO):
    return DestacadaService(db).actualizar(destacada_id, actual.id, payload.model_dump(exclude_unset=True))


@router.delete("/destacadas/{destacada_id}", **NO_CONTENT, tags=t)
def eliminar_destacada(destacada_id: int, db: Session = DB, actual: Usuario = YO):
    DestacadaService(db).eliminar(destacada_id, actual.id)


@router.post("/destacadas/{destacada_id}/stories", response_model=DestacadaDTO, tags=t)
def agregar_story(destacada_id: int, payload: AgregarStorySchema, db: Session = DB, actual: Usuario = YO):
    return DestacadaService(db).agregar_story(destacada_id, actual.id, payload.story_id)


@router.delete("/destacadas/{destacada_id}/stories/{story_id}", **NO_CONTENT, tags=t)
def quitar_story(destacada_id: int, story_id: int, db: Session = DB, actual: Usuario = YO):
    DestacadaService(db).quitar_story(destacada_id, actual.id, story_id)


@router.put("/destacadas/{destacada_id}/orden", response_model=DestacadaDTO, tags=t)
def ordenar_stories(destacada_id: int, payload: OrdenStoriesSchema, db: Session = DB, actual: Usuario = YO):
    return DestacadaService(db).ordenar_stories(destacada_id, actual.id, payload.story_ids)


# ======================= Álbumes
t = ["albums"]


@router.post("/albums", response_model=AlbumDTO, status_code=status.HTTP_201_CREATED, tags=t)
def crear_album(payload: CreateAlbumSchema, db: Session = DB, actual: Usuario = YO):
    return AlbumService(db).crear(actual.id, payload.model_dump())


@router.get("/albums/{album_id}", response_model=AlbumDTO, tags=t)
def obtener_album(album_id: int, db: Session = DB, actual: Usuario = YO):
    return AlbumService(db).obtener(album_id, actual.id)


@router.patch("/albums/{album_id}", response_model=AlbumDTO, tags=t)
def actualizar_album(album_id: int, payload: UpdateAlbumSchema, db: Session = DB, actual: Usuario = YO):
    return AlbumService(db).actualizar(album_id, actual.id, payload.model_dump(exclude_unset=True))


@router.delete("/albums/{album_id}", **NO_CONTENT, tags=t)
def eliminar_album(album_id: int, db: Session = DB, actual: Usuario = YO):
    AlbumService(db).eliminar(album_id, actual.id)


@router.get("/usuarios/{usuario_id}/albums", response_model=list[AlbumDTO], tags=t)
def albums_de(usuario_id: int, db: Session = DB, actual: Usuario = YO):
    return AlbumService(db).de_usuario(usuario_id, actual.id)


@router.post("/albums/{album_id}/invitaciones", response_model=AlbumDTO, tags=t)
def invitar(album_id: int, payload: InvitarSchema, db: Session = DB, actual: Usuario = YO):
    return AlbumService(db).invitar(album_id, actual.id, payload.usuario_id)


@router.get("/usuarios/{usuario_id}/invitaciones-album", response_model=list[AlbumDTO], tags=t)
def invitaciones(usuario_id: int, db: Session = DB, actual: Usuario = YO):
    verificar_dueno(usuario_id, actual)
    return AlbumService(db).invitaciones(actual.id)


@router.post("/albums/{album_id}/invitaciones/aceptar", response_model=AlbumDTO, tags=t)
def aceptar_invitacion(album_id: int, db: Session = DB, actual: Usuario = YO):
    return AlbumService(db).aceptar(album_id, actual.id)


@router.delete("/albums/{album_id}/miembros/{usuario_id}", **NO_CONTENT, tags=t)
def quitar_miembro(album_id: int, usuario_id: int, db: Session = DB, actual: Usuario = YO):
    AlbumService(db).quitar_miembro(album_id, actual.id, usuario_id)


@router.get("/albums/{album_id}/items", response_model=list[AlbumItemDTO], tags=t)
def items(album_id: int, pag: Pagina = Depends(), db: Session = DB, actual: Usuario = YO):
    return AlbumService(db).items(album_id, actual.id, pag.limit, pag.offset)


@router.post("/albums/{album_id}/items", response_model=AlbumItemDTO, status_code=status.HTTP_201_CREATED, tags=t)
def subir_item(album_id: int, payload: CreateAlbumItemSchema, db: Session = DB, actual: Usuario = YO):
    return AlbumService(db).subir(album_id, actual.id, payload.model_dump())


@router.delete("/albums/{album_id}/items/{item_id}", **NO_CONTENT, tags=t)
def borrar_item(album_id: int, item_id: int, db: Session = DB, actual: Usuario = YO):
    AlbumService(db).borrar_item(album_id, actual.id, item_id)


# ======================= DMs
t = ["dms"]


@router.get("/conversaciones", response_model=list[ConversacionDTO], tags=t)
def conversaciones(db: Session = DB, actual: Usuario = YO):
    return DMService(db).conversaciones(actual.id)


@router.get("/conversaciones/solicitudes", response_model=list[ConversacionDTO], tags=t)
def solicitudes(db: Session = DB, actual: Usuario = YO):
    return DMService(db).solicitudes(actual.id)


@router.post("/conversaciones", response_model=ConversacionDTO, tags=t)
def crear_conversacion(payload: CreateConversacionSchema, db: Session = DB, actual: Usuario = YO):
    return DMService(db).crear(actual.id, payload.participantes, payload.nombre)


@router.get("/conversaciones/{conv_id}/mensajes", response_model=list[MensajeDTO], tags=t)
def mensajes(conv_id: int, limit: int = Query(30, ge=1, le=100), antes_de: int | None = None,
             db: Session = DB, actual: Usuario = YO):
    return DMService(db).mensajes(conv_id, actual.id, limit, antes_de)


@router.post("/conversaciones/{conv_id}/mensajes", response_model=MensajeDTO,
             status_code=status.HTTP_201_CREATED, tags=t)
def enviar(conv_id: int, payload: CreateMensajeSchema, db: Session = DB, actual: Usuario = YO):
    return DMService(db).enviar(conv_id, actual.id, payload.texto, payload.post_id)


@router.post("/conversaciones/{conv_id}/aceptar", response_model=ConversacionDTO, tags=t)
def aceptar_conversacion(conv_id: int, db: Session = DB, actual: Usuario = YO):
    return DMService(db).aceptar(conv_id, actual.id)


@router.post("/conversaciones/{conv_id}/leido", **NO_CONTENT, tags=t)
def marcar_leido(conv_id: int, db: Session = DB, actual: Usuario = YO):
    DMService(db).marcar_leido(conv_id, actual.id)


@router.delete("/mensajes/{mensaje_id}", **NO_CONTENT, tags=t)
def anular(mensaje_id: int, db: Session = DB, actual: Usuario = YO):
    DMService(db).anular(mensaje_id, actual.id)


@router.delete("/conversaciones/{conv_id}", **NO_CONTENT, tags=t)
def salir(conv_id: int, db: Session = DB, actual: Usuario = YO):
    DMService(db).salir(conv_id, actual.id)
