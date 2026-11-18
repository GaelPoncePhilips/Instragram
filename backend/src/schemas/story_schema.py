from pydantic import BaseModel, Field


class CreateStorySchema(BaseModel):
    url_imagen: str = Field(min_length=1)
    solo_mejores_amigos: bool = False
