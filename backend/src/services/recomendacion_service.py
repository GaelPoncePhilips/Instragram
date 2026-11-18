"""Recomendador híbrido + colaborativo con decaimiento temporal (docs/RECOMENDACIONES.md).

Cada categoría tiene su propio ranking y después se INTERCALAN con un patrón fijo:
    amigo → interés → cercano → celebridad → amigo → …
Si una categoría se queda sin posts se saltea. Los conocidos (amigos, cercanos) tienen
ventana de 36 h y decaimiento fuerte; celebridades 72 h; interés hasta 7 días.
"""
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.db.models.usuario_model import Usuario
from src.dtos.post_dto import PostDetalleDTO
from src.repositories.recomendacion_repository import RecomendacionRepository
from src.repositories.sql import POST_COLUMNAS, POST_FROM
from src.utils.errors import ForbiddenError

PATRON_FEED = ("amigo", "interes", "cercano", "popular")
PATRON_EXPLORAR = ("interes", "interes", "popular")


def intercalar(colas: dict[str, list[tuple]], patron: tuple[str, ...], hasta: int) -> list[tuple]:
    """Toma de cada cola según el patrón, salteando vacías y posts repetidos."""
    colas = {k: list(v) for k, v in colas.items()}
    vistos: set[int] = set()
    salida: list[tuple] = []
    while len(salida) < hasta and any(colas.get(c) for c in patron):
        for cat in patron:
            cola = colas.get(cat) or []
            while cola and cola[0][0] in vistos:
                cola.pop(0)
            if cola and len(salida) < hasta:
                item = cola.pop(0)
                vistos.add(item[0])
                salida.append(item)
    return salida


class RecomendacionService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = RecomendacionRepository(db)

    def _detalles(self, items: list[tuple], yo: int) -> list[PostDetalleDTO]:
        if not items:
            return []
        filas = self.db.execute(
            text(f"SELECT {POST_COLUMNAS} {POST_FROM} WHERE p.id = ANY(:ids)"),
            {"ids": [i[0] for i in items], "yo": yo},
        ).mappings().all()
        por_id = {f["id"]: dict(f) for f in filas}
        return [PostDetalleDTO(**por_id[i], motivo=motivo) for i, _, motivo in items if i in por_id]

    def _mezcla(self, actual: Usuario, tipo: str | None, sin_reels: bool, limit: int, offset: int):
        n = limit + offset
        colas = self.repo.de_seguidos(actual.id, tipo, sin_reels, n)
        descubrir = self.repo.descubrir(actual.id, tipo, sin_reels, n)
        colas["interes"] = descubrir["interes"]
        # Conocidos primero: celebridades que sigo, después populares que no sigo.
        colas["popular"] = colas["popular"] + descubrir["popular"]
        return self._detalles(intercalar(colas, PATRON_FEED, n)[offset:], actual.id)

    def feed(self, actual: Usuario, limit: int, offset: int) -> list[PostDetalleDTO]:
        return self._mezcla(actual, None, actual.reels_desactivados, limit, offset)

    def reels(self, actual: Usuario, limit: int, offset: int) -> list[PostDetalleDTO]:
        if actual.reels_desactivados:
            raise ForbiddenError("Tenés los reels desactivados")
        return self._mezcla(actual, "reel", False, limit, offset)

    def explorar(self, actual: Usuario, limit: int, offset: int) -> list[PostDetalleDTO]:
        n = limit + offset
        colas = self.repo.descubrir(actual.id, None, actual.reels_desactivados, n)
        return self._detalles(intercalar(colas, PATRON_EXPLORAR, n)[offset:], actual.id)
