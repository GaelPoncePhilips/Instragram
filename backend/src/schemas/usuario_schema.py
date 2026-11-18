from pydantic import BaseModel, EmailStr, Field


class CreateUsuarioSchema(BaseModel):
    username: str = Field(min_length=1, max_length=30, pattern=r"^[a-z0-9._]+$")
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)  # bcrypt usa hasta 72 bytes
    nombre: str = Field(min_length=1, max_length=100)
    bio: str | None = Field(default=None, max_length=255)


class UpdateUsuarioSchema(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    bio: str | None = Field(default=None, max_length=255)
    es_privada: bool | None = None
    reels_desactivados: bool | None = None
