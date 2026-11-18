from datetime import datetime

from pydantic import BaseModel

from src.dtos.usuario_dto import UsuarioResumenDTO


class StoryDTO(BaseModel):
    id: int
    usuario_id: int
    url_imagen: str
    solo_mejores_amigos: bool
    fecha_publicacion: datetime
    fecha_vencimiento: datetime
    vista: bool = False  # si :yo ya la vio

    model_config = {"from_attributes": True}


class StoriesDeUsuarioDTO(BaseModel):
    usuario: UsuarioResumenDTO
    todas_vistas: bool
    stories: list[StoryDTO]


class VistaDTO(UsuarioResumenDTO):
    fecha: datetime


class HashtagTendenciaDTO(BaseModel):
    nombre: str
    cantidad_posts: int
