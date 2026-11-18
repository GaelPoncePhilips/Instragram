from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class PostCreateSchema(BaseModel):
    url_imagen: str = Field(min_length=1, max_length=500)
    descripcion: Optional[str] = Field(default=None, max_length=2200)


class PostResponseSchema(BaseModel):
    id: int
    usuario_id: int
    url_imagen: str
    descripcion: Optional[str]
    fecha_publicacion: datetime

    model_config = ConfigDict(from_attributes=True)
