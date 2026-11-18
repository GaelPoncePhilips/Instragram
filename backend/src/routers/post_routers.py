from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session

from src.db.connection import get_db
from src.dtos.post_dto import PostDTO
from src.repositories.post_repository import PostRepository
from src.schemas.post_schema import (
    PostCreateSchema,
    PostResponseSchema
)
from src.services.post_service import PostService

router = APIRouter(tags=["posts"])


@router.post(
    "/usuarios/{usuario_id}/posts",
    response_model=PostResponseSchema,
    status_code=status.HTTP_201_CREATED
)
def publicar_post(
    usuario_id: int,
    payload: PostCreateSchema,
    db: Session = Depends(get_db)
):
    repository = PostRepository(db)
    service = PostService(repository)

    dto = PostDTO(
        id=None,
        usuario_id=usuario_id,
        url_imagen=payload.url_imagen,
        descripcion=payload.descripcion,
        fecha_publicacion=None
    )

    try:
        return service.publicar_post(dto)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


# Consultar publicaciones respetando la privacidad
@router.get(
    "/usuarios/{usuario_id}/posts",
    response_model=list[PostResponseSchema]
)
def listar_posts_usuario(
    usuario_id: int,
    visitante_id: int,
    db: Session = Depends(get_db)
):
    repository = PostRepository(db)
    service = PostService(repository)

    try:
        return service.listar_posts_usuario(
            visitante_id,
            usuario_id
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
