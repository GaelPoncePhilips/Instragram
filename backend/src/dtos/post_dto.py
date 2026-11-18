from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class PostDTO:
    id: Optional[int]
    usuario_id: int
    url_imagen: str
    descripcion: Optional[str]
    fecha_publicacion: Optional[datetime]
