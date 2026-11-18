"""Listas de seguidores, bloqueos (HU10), mejores amigos (HU8), estadísticas (HU12) y sugerencias."""
from datetime import datetime

from sqlalchemy.orm import Session

from src.dtos.usuario_dto import EstadisticasDTO, SugerenciaDTO, UsuarioResumenDTO
from src.repositories.bloqueo_repository import BloqueoRepository
from src.repositories.seguidor_repository import SeguidorRepository
from src.repositories.usuario_repository import UsuarioRepository
from src.services.permisos_service import PermisosService
from src.utils.errors import BadRequestError, ConflictError, NotFoundError


def _resumenes(filas: list[dict]) -> list[UsuarioResumenDTO]:
    return [UsuarioResumenDTO(**f) for f in filas]


class SocialService:
    def __init__(self, db: Session):
        self.seguidores = SeguidorRepository(db)
        self.bloqueos = BloqueoRepository(db)
        self.usuarios = UsuarioRepository(db)
        self.permisos = PermisosService(db)

    # ---------- listas
    def seguidores_de(self, usuario_id: int, yo: int, limit: int, offset: int):
        self.permisos.exigir_ver_contenido(usuario_id, yo)
        return _resumenes(self.seguidores.seguidores_de(usuario_id, limit, offset))

    def seguidos_de(self, usuario_id: int, yo: int, limit: int, offset: int):
        self.permisos.exigir_ver_contenido(usuario_id, yo)
        return _resumenes(self.seguidores.seguidos_de(usuario_id, limit, offset))

    def quitar_seguidor(self, yo: int, seguidor_id: int) -> None:
        seguimiento = self.seguidores.obtener(seguidor_id, yo)
        if seguimiento is None:
            raise NotFoundError("Ese usuario no te sigue")
        self.seguidores.eliminar(seguimiento)

    def no_me_siguen(self, yo: int, limit: int, offset: int):
        return _resumenes(self.seguidores.no_me_siguen(yo, limit, offset))

    def sugerencias(self, yo: int, limit: int, offset: int):
        return [SugerenciaDTO(**f) for f in self.seguidores.sugerencias(yo, limit, offset)]

    def estadisticas(self, yo: int, desde: datetime | None, hasta: datetime | None) -> EstadisticasDTO:
        if desde and hasta and desde >= hasta:
            raise BadRequestError("'desde' tiene que ser anterior a 'hasta'")
        return EstadisticasDTO(**self.usuarios.estadisticas(yo, desde, hasta))

    # ---------- bloqueos
    def bloquear(self, yo: int, otro_id: int) -> None:
        if yo == otro_id:
            raise BadRequestError("No podés bloquearte a vos mismo")
        if self.usuarios.buscar_activo(otro_id) is None:
            raise NotFoundError("Usuario no encontrado")
        if self.bloqueos.obtener(yo, otro_id):
            raise ConflictError("Ya bloqueaste a este usuario")
        self.bloqueos.bloquear(yo, otro_id)

    def desbloquear(self, yo: int, otro_id: int) -> None:
        bloqueo = self.bloqueos.obtener(yo, otro_id)
        if bloqueo is None:
            raise NotFoundError("No bloqueaste a este usuario")
        self.bloqueos.desbloquear(bloqueo)

    def bloqueados(self, yo: int, limit: int, offset: int):
        return _resumenes(self.bloqueos.bloqueados_por(yo, limit, offset))

    # ---------- mejores amigos
    def mejores_amigos(self, yo: int, limit: int, offset: int):
        return _resumenes(self.bloqueos.mejores_amigos(yo, limit, offset))

    def agregar_mejor_amigo(self, yo: int, amigo_id: int) -> None:
        if not self.seguidores.es_seguidor_aceptado(amigo_id, yo):
            raise BadRequestError("Solo podés agregar a mejores amigos a alguien que te sigue")
        self.bloqueos.agregar_mejor_amigo(yo, amigo_id)

    def quitar_mejor_amigo(self, yo: int, amigo_id: int) -> None:
        if not self.bloqueos.es_mejor_amigo(yo, amigo_id):
            raise NotFoundError("No está en tu lista de mejores amigos")
        self.bloqueos.quitar_mejor_amigo(yo, amigo_id)
