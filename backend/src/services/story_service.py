from sqlalchemy.orm import Session

from src.dtos.story_dto import HashtagTendenciaDTO, StoriesDeUsuarioDTO, StoryDTO, VistaDTO
from src.dtos.usuario_dto import UsuarioResumenDTO
from src.repositories.story_repository import StoryRepository
from src.services.permisos_service import PermisosService
from src.utils.errors import ForbiddenError, NotFoundError


class StoryService:
    def __init__(self, db: Session):
        self.repo = StoryRepository(db)
        self.permisos = PermisosService(db)

    def _story_visible(self, story_id: int, yo: int):
        """404 si no existe, venció, hay bloqueo o es de mejores amigos sin estar en la lista; 403 si es privada."""
        story = self.repo.buscar_por_id(story_id)
        if story is None:
            raise NotFoundError("Story no encontrada")
        if story.usuario_id != yo:
            self.permisos.exigir_ver_contenido(story.usuario_id, yo)
            if not self.repo.es_vigente(story_id) or not self.repo.permite_mejores_amigos(story_id, yo):
                raise NotFoundError("Story no encontrada")
        return story

    def publicar(self, yo: int, url_imagen: str, solo_mejores_amigos: bool) -> StoryDTO:
        return StoryDTO.model_validate(self.repo.crear(yo, url_imagen, solo_mejores_amigos))

    def de_seguidos(self, yo: int) -> list[StoriesDeUsuarioDTO]:
        """Agrupadas por usuario; primero los que tienen stories sin ver, luego por la más reciente (HU7)."""
        grupos: dict[int, StoriesDeUsuarioDTO] = {}
        for f in self.repo.de_seguidos(yo):
            g = grupos.get(f["usuario_id"])
            if g is None:
                g = grupos[f["usuario_id"]] = StoriesDeUsuarioDTO(
                    usuario=UsuarioResumenDTO(id=f["usuario_id"], username=f["username"], nombre=f["nombre"]),
                    todas_vistas=True, stories=[])
            g.stories.append(StoryDTO(**f))
            g.todas_vistas = g.todas_vistas and f["vista"]
        return sorted(grupos.values(), key=lambda g: (g.todas_vistas, -g.stories[-1].fecha_publicacion.timestamp()))

    def vigentes_de(self, usuario_id: int, yo: int) -> list[StoryDTO]:
        self.permisos.exigir_ver_contenido(usuario_id, yo)
        return [StoryDTO(**f) for f in self.repo.vigentes_de(usuario_id, yo)]

    def archivo(self, yo: int, limit: int, offset: int) -> list[StoryDTO]:
        return [StoryDTO(**f) for f in self.repo.archivo(yo, limit, offset)]

    def ver(self, story_id: int, yo: int) -> None:
        story = self._story_visible(story_id, yo)
        if story.usuario_id != yo:  # el dueño no cuenta como vista (HU9)
            self.repo.registrar_vista(yo, story_id)

    def vistas(self, story_id: int, yo: int, limit: int, offset: int) -> list[VistaDTO]:
        story = self.repo.buscar_por_id(story_id)
        if story is None:
            raise NotFoundError("Story no encontrada")
        if story.usuario_id != yo:
            raise ForbiddenError("Solo el dueño puede ver quién vio la story")
        return [VistaDTO(**f) for f in self.repo.vistas(story_id, limit, offset)]

    def eliminar(self, story_id: int, yo: int) -> None:
        story = self.repo.buscar_por_id(story_id)
        if story is None:
            raise NotFoundError("Story no encontrada")
        if story.usuario_id != yo:
            raise ForbiddenError("Solo el dueño puede borrar la story")
        self.repo.eliminar(story)

    def hashtags_tendencia(self) -> list[HashtagTendenciaDTO]:
        return [HashtagTendenciaDTO(**f) for f in self.repo.hashtags_tendencia()]
