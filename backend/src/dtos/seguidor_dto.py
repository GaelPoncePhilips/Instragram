from datetime import datetime

from pydantic import BaseModel


class SeguidorResponseDTO(BaseModel):
    seguidor_id: int
    seguido_id: int
    estado: str
    fecha: datetime

    model_config = {"from_attributes": True}
