from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class SeguidorDTO:
    seguidor_id: int
    seguido_id: int
    estado: str
    fecha: Optional[datetime] = None
