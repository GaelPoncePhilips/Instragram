
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime


class UsuarioCreateSchema(BaseModel):
    username: str = Field(
        min_length=1,
        max_length=30,
        pattern=r"^[a-z0-9._]+$"
    )
    email: EmailStr
    password: str = Field(min_length=8)
    nombre: str = Field(min_length=1, max_length=100)
    bio: Optional[str] = Field(default=None, max_length=255)


class UsuarioResponseSchema(BaseModel):
    id: int
    username: str
    email: str
    nombre: str
    bio: Optional[str]
    es_privada: bool
    fecha_registro: datetime

    model_config = ConfigDict(from_attributes=True)


class UsuarioPerfilSchema(BaseModel):
    username: str
    nombre: str
    bio: Optional[str]
    es_privada: bool
    cantidad_posts: int
    cantidad_seguidores: int
    cantidad_seguidos: int

class UsuarioPrivacidadSchema(BaseModel):
    es_privada: bool