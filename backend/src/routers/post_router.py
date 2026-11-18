from typing import Literal

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.db.connection import get_db
from src.db.models.usuario_model import Usuario
from src.dtos.post_dto import ComentarioDTO, CreatePostDTO, PostDetalleDTO
from src.dtos.usuario_dto import UsuarioResumenDTO
from src.middlewares.auth_middleware import get_current_user, verificar_dueno
from src.routers.deps import Pagina
from src.schemas.post_schema import CreateComentarioSchema, CreatePostSchema, UpdatePostSchema
from src.services.post_service import PostService
from src.services.recomendacion_service import RecomendacionService

router = APIRouter(tags=["posts"])


@router.post("/posts", response_model=PostDetalleDTO, status_code=status.HTTP_201_CREATED)
def publicar(payload: CreatePostSchema, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    return PostService(db).publicar(CreatePostDTO(usuario_id=actual.id, **payload.model_dump()))


@router.get("/posts/{post_id}", response_model=PostDetalleDTO)
def obtener(post_id: int, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    return PostService(db).obtener(post_id, actual.id)


@router.patch("/posts/{post_id}", response_model=PostDetalleDTO)
def editar(post_id: int, payload: UpdatePostSchema, db: Session = Depends(get_db),
           actual: Usuario = Depends(get_current_user)):
    return PostService(db).editar(post_id, actual.id, payload.descripcion)


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(post_id: int, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    PostService(db).eliminar(post_id, actual.id)


@router.get("/usuarios/{usuario_id}/posts", response_model=list[PostDetalleDTO])
def listar_de_usuario(usuario_id: int, tipo: Literal["foto", "reel"] | None = None, pag: Pagina = Depends(),
                      db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    return PostService(db).listar_de_usuario(usuario_id, actual.id, tipo, pag.limit, pag.offset)


@router.get("/usuarios/{usuario_id}/reels", response_model=list[PostDetalleDTO])
def listar_reels_de_usuario(usuario_id: int, pag: Pagina = Depends(),
                            db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    return PostService(db).listar_de_usuario(usuario_id, actual.id, "reel", pag.limit, pag.offset)


# ---------- Feed y recomendaciones (HU6, EXTRA)
@router.get("/usuarios/{usuario_id}/feed", response_model=list[PostDetalleDTO])
def feed(usuario_id: int, modo: Literal["cronologico", "recomendado"] = "cronologico", pag: Pagina = Depends(),
         db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    """cronologico (HU6): seguidos por fecha. recomendado: intercala amigos, intereses, cercanos y celebridades."""
    verificar_dueno(usuario_id, actual)
    if modo == "recomendado":
        return RecomendacionService(db).feed(actual, pag.limit, pag.offset)
    return PostService(db).feed(actual, pag.limit, pag.offset)


@router.get("/usuarios/{usuario_id}/explorar", response_model=list[PostDetalleDTO])
def explorar(usuario_id: int, pag: Pagina = Depends(), db: Session = Depends(get_db),
             actual: Usuario = Depends(get_current_user)):
    verificar_dueno(usuario_id, actual)
    return RecomendacionService(db).explorar(actual, pag.limit, pag.offset)


@router.get("/usuarios/{usuario_id}/reels/feed", response_model=list[PostDetalleDTO])
def feed_reels(usuario_id: int, pag: Pagina = Depends(), db: Session = Depends(get_db),
               actual: Usuario = Depends(get_current_user)):
    verificar_dueno(usuario_id, actual)
    return RecomendacionService(db).reels(actual, pag.limit, pag.offset)


# ---------- Likes (HU5)
@router.post("/posts/{post_id}/like", response_model=PostDetalleDTO)
def dar_like(post_id: int, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    return PostService(db).dar_like(post_id, actual.id)


@router.delete("/posts/{post_id}/like", status_code=status.HTTP_204_NO_CONTENT)
def quitar_like(post_id: int, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    PostService(db).quitar_like(post_id, actual.id)


@router.get("/posts/{post_id}/likes", response_model=list[UsuarioResumenDTO])
def likes(post_id: int, pag: Pagina = Depends(), db: Session = Depends(get_db),
          actual: Usuario = Depends(get_current_user)):
    return PostService(db).likes(post_id, actual.id, pag.limit, pag.offset)


# ---------- Comentarios (HU5)
@router.get("/posts/{post_id}/comentarios", response_model=list[ComentarioDTO])
def comentarios(post_id: int, pag: Pagina = Depends(), db: Session = Depends(get_db),
                actual: Usuario = Depends(get_current_user)):
    return PostService(db).comentarios(post_id, actual.id, pag.limit, pag.offset)


@router.post("/posts/{post_id}/comentarios", response_model=ComentarioDTO, status_code=status.HTTP_201_CREATED)
def comentar(post_id: int, payload: CreateComentarioSchema, db: Session = Depends(get_db),
             actual: Usuario = Depends(get_current_user)):
    return PostService(db).comentar(post_id, actual.id, payload.texto)


@router.patch("/comentarios/{comentario_id}", response_model=ComentarioDTO)
def editar_comentario(comentario_id: int, payload: CreateComentarioSchema, db: Session = Depends(get_db),
                      actual: Usuario = Depends(get_current_user)):
    return PostService(db).editar_comentario(comentario_id, actual.id, payload.texto)


@router.delete("/comentarios/{comentario_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_comentario(comentario_id: int, db: Session = Depends(get_db),
                        actual: Usuario = Depends(get_current_user)):
    PostService(db).eliminar_comentario(comentario_id, actual.id)
