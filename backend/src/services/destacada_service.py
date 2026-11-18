"""EXTRA: destacadas ordenables. Ver reglas en docs/MODELO_DATOS.md."""
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from src.db.models.destacada_model import Destacada, DestacadaStory
from src.db.models.story_model import Story
from src.dtos.extra_dto import DestacadaDTO
from src.dtos.story_dto import StoryDTO
from src.repositories.bloqueo_repository import BloqueoRepository
from src.services.permisos_service import PermisosService
from src.utils.errors import BadRequestError, ConflictError, ForbiddenError, NotFoundError


class DestacadaService:
    def __init__(self, db: Session):
        self.db = db
        self.permisos = PermisosService(db)
        self.bloqueos = BloqueoRepository(db)

    # ---------- helpers
    def _propia(self, destacada_id: int, yo: int) -> Destacada:
        d = self.db.get(Destacada, destacada_id)
        if d is None:
            raise NotFoundError("Destacada no encontrada")
        if d.usuario_id != yo:
            raise ForbiddenError("Solo el dueño puede modificar la destacada")
        return d

    def _validar_stories(self, story_ids: list[int], yo: int) -> None:
        if len(set(story_ids)) != len(story_ids):
            raise BadRequestError("Hay stories repetidas")
        propias = self.db.query(func.count(Story.id)).filter(Story.id.in_(story_ids), Story.usuario_id == yo).scalar()
        if propias != len(story_ids):
            raise BadRequestError("Solo podés destacar tus propias stories")

    def _dto(self, d: Destacada, yo: int) -> DestacadaDTO | None:
        """Stories en orden; las de mejores amigos se ocultan a quien no está en la lista. None si queda vacía."""
        ve_mba = d.usuario_id == yo or self.bloqueos.es_mejor_amigo(d.usuario_id, yo)
        filas = self.db.execute(text(
            """SELECT st.*, EXISTS (SELECT 1 FROM vistas_story v WHERE v.story_id = st.id AND v.usuario_id = :yo) AS vista
               FROM destacada_story ds JOIN story st ON st.id = ds.story_id
               WHERE ds.destacada_id = :did AND (:ve_mba OR NOT st.solo_mejores_amigos)
               ORDER BY ds.orden"""), {"did": d.id, "yo": yo, "ve_mba": ve_mba}).mappings().all()
        if not filas and d.usuario_id != yo:
            return None
        stories = [StoryDTO(**f) for f in filas]
        return DestacadaDTO(id=d.id, usuario_id=d.usuario_id, titulo=d.titulo, orden=d.orden, stories=stories,
                            portada_url=d.portada_url or (stories[0].url_imagen if stories else None))

    def _reordenar(self, filas: list, ids_actuales: list[int], nuevos_ids: list[int], campo: str) -> None:
        if sorted(nuevos_ids) != sorted(ids_actuales):
            raise BadRequestError("Tenés que mandar la lista completa, sin repetidos ni ids ajenos")
        posicion = {i: n for n, i in enumerate(nuevos_ids)}
        for f in filas:  # los UNIQUE de orden son DEFERRABLE: no chocan dentro de la transacción
            f.orden = posicion[getattr(f, campo)]
        self.db.commit()

    # ---------- casos de uso
    def listar(self, usuario_id: int, yo: int) -> list[DestacadaDTO]:
        self.permisos.exigir_ver_contenido(usuario_id, yo)
        ds = self.db.query(Destacada).filter(Destacada.usuario_id == usuario_id).order_by(Destacada.orden).all()
        return [dto for d in ds if (dto := self._dto(d, yo)) is not None]

    def obtener(self, destacada_id: int, yo: int) -> DestacadaDTO:
        d = self.db.get(Destacada, destacada_id)
        if d is None:
            raise NotFoundError("Destacada no encontrada")
        self.permisos.exigir_ver_contenido(d.usuario_id, yo)
        dto = self._dto(d, yo)
        if dto is None:
            raise NotFoundError("Destacada no encontrada")
        return dto

    def crear(self, yo: int, titulo: str, portada_url: str | None, story_ids: list[int]) -> DestacadaDTO:
        self._validar_stories(story_ids, yo)
        orden = self.db.query(func.coalesce(func.max(Destacada.orden) + 1, 0)).filter(Destacada.usuario_id == yo).scalar()
        d = Destacada(usuario_id=yo, titulo=titulo, portada_url=portada_url, orden=orden)
        self.db.add(d)
        self.db.flush()
        for n, sid in enumerate(story_ids):
            self.db.add(DestacadaStory(destacada_id=d.id, story_id=sid, usuario_id=yo, orden=n))
        self.db.commit()
        return self._dto(d, yo)

    def actualizar(self, destacada_id: int, yo: int, campos: dict) -> DestacadaDTO:
        d = self._propia(destacada_id, yo)
        for k, v in campos.items():
            setattr(d, k, v)
        self.db.commit()
        return self._dto(d, yo)

    def eliminar(self, destacada_id: int, yo: int) -> None:
        self.db.delete(self._propia(destacada_id, yo))
        self.db.commit()

    def agregar_story(self, destacada_id: int, yo: int, story_id: int) -> DestacadaDTO:
        d = self._propia(destacada_id, yo)
        self._validar_stories([story_id], yo)
        if self.db.get(DestacadaStory, (destacada_id, story_id)):
            raise ConflictError("La story ya está en la destacada")
        orden = self.db.query(func.coalesce(func.max(DestacadaStory.orden) + 1, 0)).filter(
            DestacadaStory.destacada_id == destacada_id).scalar()
        self.db.add(DestacadaStory(destacada_id=destacada_id, story_id=story_id, usuario_id=yo, orden=orden))
        self.db.commit()
        return self._dto(d, yo)

    def quitar_story(self, destacada_id: int, yo: int, story_id: int) -> None:
        self._propia(destacada_id, yo)
        ds = self.db.get(DestacadaStory, (destacada_id, story_id))
        if ds is None:
            raise NotFoundError("La story no está en la destacada")
        self.db.delete(ds)
        self.db.commit()

    def ordenar_destacadas(self, yo: int, destacada_ids: list[int]) -> list[DestacadaDTO]:
        filas = self.db.query(Destacada).filter(Destacada.usuario_id == yo).all()
        self._reordenar(filas, [d.id for d in filas], destacada_ids, "id")
        return self.listar(yo, yo)

    def ordenar_stories(self, destacada_id: int, yo: int, story_ids: list[int]) -> DestacadaDTO:
        d = self._propia(destacada_id, yo)
        filas = self.db.query(DestacadaStory).filter(DestacadaStory.destacada_id == destacada_id).all()
        self._reordenar(filas, [f.story_id for f in filas], story_ids, "story_id")
        return self._dto(d, yo)
