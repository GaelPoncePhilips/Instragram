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
