import re

from sqlalchemy.orm import Session

from src.dtos.post_dto import CreatePostDTO, PostResponseDTO
from src.mappers.post_mapper import to_post_response
from src.repositories.post_repository import PostRepository
from src.services.permisos_service import PermisosService
from src.utils.errors import ForbiddenError, NotFoundError

# '#' no precedido por letra/número (evita "a#b"); \w incluye acentos y ñ.
HASHTAG_RE = re.compile(r"(?<!\w)#(\w{1,100})")


def extraer_hashtags(texto: str | None) -> list[str]:
    """Hashtags en minúscula, sin repetir y en orden de aparición (HU2)."""
    return list(dict.fromkeys(h.lower() for h in HASHTAG_RE.findall(texto or "")))


class PostService:
    def __init__(self, db: Session):
        self.repo = PostRepository(db)
        self.permisos = PermisosService(db)

    def publicar(self, dto: CreatePostDTO) -> PostResponseDTO:
        post = self.repo.crear_con_hashtags(dto.model_dump(), extraer_hashtags(dto.descripcion))
        return to_post_response(post)

    def obtener(self, post_id: int, visitante_id: int) -> PostResponseDTO:
        post = self.repo.buscar_por_id(post_id)
        if post is None:
            raise NotFoundError("Post no encontrado")
        self.permisos.exigir_ver_contenido(post.usuario_id, visitante_id)
        return to_post_response(post)

    def listar_de_usuario(
        self, usuario_id: int, visitante_id: int, tipo: str | None, limit: int, offset: int
    ) -> list[PostResponseDTO]:
        self.permisos.exigir_ver_contenido(usuario_id, visitante_id)  # 404 bloqueo / 403 privada
        return [to_post_response(p) for p in self.repo.listar_por_usuario(usuario_id, tipo, limit, offset)]

    def eliminar(self, post_id: int, usuario_id: int) -> None:
        post = self.repo.buscar_por_id(post_id)
        if post is None:
            raise NotFoundError("Post no encontrado")
        if post.usuario_id != usuario_id:
            raise ForbiddenError("Solo el autor puede borrar el post")
        self.repo.eliminar(post)
