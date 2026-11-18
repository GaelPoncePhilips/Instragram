from fastapi import APIRouter, Depends, File, UploadFile, status
from pydantic import BaseModel

from src.db.models.usuario_model import Usuario
from src.middlewares.auth_middleware import get_current_user
from src.services.media_service import MediaService

router = APIRouter(tags=["media"])


class MediaDTO(BaseModel):
    url: str
    tipo: str  # 'imagen' | 'video'
    tamano_bytes: int


@router.post("/media", response_model=MediaDTO, status_code=status.HTTP_201_CREATED)
async def subir(archivo: UploadFile = File(...), actual: Usuario = Depends(get_current_user)):
    """Sube una imagen o un video y devuelve la URL para usar en posts, stories, álbumes, etc."""
    return await MediaService().guardar(archivo, actual.id)
