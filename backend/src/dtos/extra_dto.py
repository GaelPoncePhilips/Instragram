"""DTOs de las features EXTRA: destacadas, álbumes y DMs."""
from datetime import datetime

from pydantic import BaseModel

from src.dtos.story_dto import StoryDTO
from src.dtos.usuario_dto import UsuarioResumenDTO


# ---------- Destacadas
class DestacadaDTO(BaseModel):
    id: int
    usuario_id: int
    titulo: str
    portada_url: str | None
    orden: int
    stories: list[StoryDTO]


# ---------- Álbumes
class AlbumMiembroDTO(UsuarioResumenDTO):
    rol: str
    estado: str


class AlbumDTO(BaseModel):
    id: int
    creador_id: int
    titulo: str
    descripcion: str | None
    portada_url: str | None
    fecha_creacion: datetime
    miembros: list[AlbumMiembroDTO]


class AlbumItemDTO(BaseModel):
    id: int
    album_id: int
    usuario_id: int
    url_imagen: str
    descripcion: str | None
    fecha: datetime

    model_config = {"from_attributes": True}


# ---------- DMs
class MensajeDTO(BaseModel):
    id: int
    conversacion_id: int
    emisor_id: int
    texto: str | None
    post_id: int | None
    fecha: datetime

    model_config = {"from_attributes": True}


class ConversacionDTO(BaseModel):
    id: int
    es_grupal: bool
    nombre: str | None
    estado: str  # mi estado: 'solicitud' | 'aceptada'
    participantes: list[UsuarioResumenDTO]
    ultimo_mensaje: MensajeDTO | None
    no_leidos: int
