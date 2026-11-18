from datetime import datetime

from pydantic import BaseModel


class CreateUsuarioDTO(BaseModel):
    username: str
    email: str
    password: str
    nombre: str
    bio: str | None = None


class UpdateUsuarioDTO(BaseModel):
    nombre: str | None = None
    bio: str | None = None
    es_privada: bool | None = None
    reels_desactivados: bool | None = None


class UsuarioResponseDTO(BaseModel):
    """Sin password_hash."""
    id: int
    username: str
    email: str
    nombre: str
    bio: str | None
    es_privada: bool
    reels_desactivados: bool
    fecha_registro: datetime

    model_config = {"from_attributes": True}


class UsuarioResumenDTO(BaseModel):
    id: int
    username: str
    nombre: str

    model_config = {"from_attributes": True}


class PerfilDTO(BaseModel):
    id: int
    username: str
    nombre: str
    bio: str | None
    es_privada: bool
    cantidad_posts: int
    cantidad_seguidores: int
    cantidad_seguidos: int
    relacion: str  # 'yo' | 'siguiendo' | 'pendiente' | 'ninguna'


class SugerenciaDTO(UsuarioResumenDTO):
    en_comun: int
    te_sigue: bool


class TopPostDTO(BaseModel):
    id: int
    url_imagen: str
    fecha_publicacion: datetime
    likes: int


class TopSeguidorDTO(UsuarioResumenDTO):
    likes: int


class EstadisticasDTO(BaseModel):
    cantidad_posts: int
    promedio_likes_por_post: float
    post_con_mas_likes: TopPostDTO | None
    seguidor_que_mas_likes_dio: TopSeguidorDTO | None
