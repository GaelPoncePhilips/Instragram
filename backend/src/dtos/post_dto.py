from datetime import datetime

from pydantic import BaseModel


class CreatePostDTO(BaseModel):
    usuario_id: int
    tipo: str = "foto"
    url_imagen: str
    url_video: str | None = None
    duracion_seg: int | None = None
    descripcion: str | None = None


class PostResponseDTO(BaseModel):
    id: int
    usuario_id: int
    tipo: str
    url_imagen: str
    url_video: str | None
    duracion_seg: int | None
    descripcion: str | None
    fecha_publicacion: datetime

    model_config = {"from_attributes": True}


class PostDetalleDTO(BaseModel):
    """Post con autor y contadores (HU6). `motivo` solo en recomendaciones."""
    id: int
    usuario_id: int
    autor_username: str
    autor_nombre: str
    tipo: str
    url_imagen: str
    url_video: str | None
    duracion_seg: int | None
    descripcion: str | None
    fecha_publicacion: datetime
    cantidad_likes: int
    cantidad_comentarios: int
    me_gusta: bool
    motivo: str | None = None


class ComentarioDTO(BaseModel):
    id: int
    post_id: int
    usuario_id: int
    autor_username: str
    texto: str
    fecha: datetime
