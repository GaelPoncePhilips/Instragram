from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SeguidorCreate(BaseModel):
    seguidor_id: int
    seguido_id: int


class SeguidorResponse(BaseModel):
    seguidor_id: int
    seguido_id: int
    estado: str
    fecha: Optional[datetime] = None

    class Config:
        from_attributes = True


class SeguidorEstadoUpdate(BaseModel):
    estado: str
