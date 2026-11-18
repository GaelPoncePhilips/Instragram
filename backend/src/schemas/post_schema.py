from typing import Literal

from pydantic import BaseModel, Field, model_validator


class CreatePostSchema(BaseModel):
    tipo: Literal["foto", "reel"] = "foto"
    url_imagen: str = Field(min_length=1)
    url_video: str | None = Field(default=None, min_length=1)
    duracion_seg: int | None = Field(default=None, gt=0)
    descripcion: str | None = Field(default=None, max_length=2200)

    @model_validator(mode="after")
    def validar_reel(self):
        if self.tipo == "reel" and not self.url_video:
            raise ValueError("Un reel necesita url_video")
        if self.tipo == "foto" and (self.url_video or self.duracion_seg):
            raise ValueError("url_video y duracion_seg son solo para reels")
        return self


class CreateComentarioSchema(BaseModel):
    texto: str = Field(min_length=1, max_length=300)

    @model_validator(mode="after")
    def no_vacio(self):
        if not self.texto.strip():
            raise ValueError("El comentario no puede estar vacío")
        self.texto = self.texto.strip()
        return self
