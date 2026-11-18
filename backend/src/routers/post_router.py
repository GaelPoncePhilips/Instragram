from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from src.db.connection import get_db
from src.db.models.usuario_model import Usuario
from src.dtos.post_dto import CreatePostDTO, PostResponseDTO
from src.middlewares.auth_middleware import get_current_user
from src.schemas.post_schema import CreatePostSchema
from src.services.post_service import PostService

router = APIRouter(tags=["posts"])


@router.post("/posts", response_model=PostResponseDTO, status_code=status.HTTP_201_CREATED)
def publicar(payload: CreatePostSchema, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    return PostService(db).publicar(CreatePostDTO(usuario_id=actual.id, **payload.model_dump()))


@router.get("/posts/{post_id}", response_model=PostResponseDTO)
def obtener(post_id: int, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    return PostService(db).obtener(post_id, actual.id)


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(post_id: int, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    PostService(db).eliminar(post_id, actual.id)


@router.get("/usuarios/{usuario_id}/posts", response_model=list[PostResponseDTO])
def listar_de_usuario(
    usuario_id: int,
    tipo: Literal["foto", "reel"] | None = None,
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    actual: Usuario = Depends(get_current_user),
):
    return PostService(db).listar_de_usuario(usuario_id, actual.id, tipo, limit, offset)


@router.get("/usuarios/{usuario_id}/reels", response_model=list[PostResponseDTO])
def listar_reels_de_usuario(
    usuario_id: int,
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    actual: Usuario = Depends(get_current_user),
):
    return PostService(db).listar_de_usuario(usuario_id, actual.id, "reel", limit, offset)
