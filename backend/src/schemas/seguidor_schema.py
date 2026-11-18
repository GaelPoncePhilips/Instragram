from typing import Literal

from pydantic import BaseModel


class ResponderSolicitudSchema(BaseModel):
    accion: Literal["aceptar", "rechazar"]
