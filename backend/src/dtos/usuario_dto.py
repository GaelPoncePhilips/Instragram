
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class UsuarioDTO:
    id: Optional[int]
    username: str
    email: str
    password_hash: str
    nombre: str
    bio: Optional[str]
    es_privada: bool
    fecha_registro: Optional[datetime]
    cantidad_posts: int = 0
    cantidad_seguidores: int = 0
    cantidad_seguidos: int = 0
