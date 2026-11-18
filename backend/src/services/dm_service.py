"""EXTRA: mensajes directos.

- 1 a 1 único por par. Si el destinatario no sigue al emisor, le llega como 'solicitud'.
- Con bloqueo entre cualquier par no se puede crear ni escribir.
- Responder en una conversación la acepta.
"""
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.db.models.conversacion_model import Conversacion, ConversacionParticipante, Mensaje
from src.dtos.extra_dto import ConversacionDTO, MensajeDTO
from src.dtos.usuario_dto import UsuarioResumenDTO
from src.repositories.seguidor_repository import SeguidorRepository
from src.repositories.usuario_repository import UsuarioRepository
from src.services.post_service import PostService
from src.utils.errors import BadRequestError, ForbiddenError, NotFoundError


class DMService:
    def __init__(self, db: Session):
        self.db = db
        self.usuarios = UsuarioRepository(db)
        self.seguidores = SeguidorRepository(db)

    # ---------- helpers
    def _participante(self, conv_id: int, yo: int) -> ConversacionParticipante:
        p = self.db.get(ConversacionParticipante, (conv_id, yo))
        if p is None:
            raise NotFoundError("Conversación no encontrada")
        return p

    def _otros(self, conv_id: int, yo: int) -> list[int]:
        return [uid for (uid,) in self.db.query(ConversacionParticipante.usuario_id).filter(
            ConversacionParticipante.conversacion_id == conv_id,
            ConversacionParticipante.usuario_id != yo)]

    def _dto(self, conv_id: int, yo: int) -> ConversacionDTO:
        c = self.db.get(Conversacion, conv_id)
        yo_p = self._participante(conv_id, yo)
        participantes = self.db.execute(text(
            """SELECT u.id, u.username, u.nombre FROM conversacion_participante cp JOIN usuario u ON u.id = cp.usuario_id AND u.eliminado_en IS NULL
               WHERE cp.conversacion_id = :c ORDER BY u.username"""), {"c": conv_id}).mappings().all()
        ultimo = self.db.query(Mensaje).filter(Mensaje.conversacion_id == conv_id).order_by(Mensaje.id.desc()).first()
        no_leidos = self.db.execute(text(
            """SELECT count(*) FROM mensaje WHERE conversacion_id = :c AND emisor_id <> :yo
               AND (CAST(:ul AS timestamp) IS NULL OR fecha > :ul)"""),
            {"c": conv_id, "yo": yo, "ul": yo_p.ultima_lectura}).scalar()
        return ConversacionDTO(id=c.id, es_grupal=c.es_grupal, nombre=c.nombre, estado=yo_p.estado,
                               participantes=[UsuarioResumenDTO(**p) for p in participantes],
                               ultimo_mensaje=MensajeDTO.model_validate(ultimo) if ultimo else None,
                               no_leidos=no_leidos)

    def _listar(self, yo: int, estado: str) -> list[ConversacionDTO]:
        ids = self.db.execute(text(
            """SELECT cp.conversacion_id FROM conversacion_participante cp
               LEFT JOIN LATERAL (SELECT max(m.fecha) AS f FROM mensaje m WHERE m.conversacion_id = cp.conversacion_id) u ON true
               JOIN conversacion c ON c.id = cp.conversacion_id
               WHERE cp.usuario_id = :yo AND cp.estado = :estado
               ORDER BY coalesce(u.f, c.fecha_creacion) DESC"""), {"yo": yo, "estado": estado}).scalars().all()
        return [self._dto(i, yo) for i in ids]

    # ---------- casos de uso
    def conversaciones(self, yo: int) -> list[ConversacionDTO]:
        return self._listar(yo, "aceptada")

    def solicitudes(self, yo: int) -> list[ConversacionDTO]:
        return self._listar(yo, "solicitud")

    def crear(self, yo: int, participantes: list[int], nombre: str | None) -> ConversacionDTO:
        otros = list(dict.fromkeys(p for p in participantes if p != yo))
        if not otros:
            raise BadRequestError("Necesitás al menos otro participante")
        for uid in otros:
            if self.usuarios.buscar_activo(uid) is None or self.usuarios.hay_bloqueo(uid, yo):
                raise NotFoundError(f"Usuario {uid} no encontrado")
        es_grupal = len(otros) > 1
        if not es_grupal:
            existente = self.db.execute(text(
                """SELECT c.id FROM conversacion c
                   JOIN conversacion_participante a ON a.conversacion_id = c.id AND a.usuario_id = :yo
                   JOIN conversacion_participante b ON b.conversacion_id = c.id AND b.usuario_id = :otro
                   WHERE NOT c.es_grupal LIMIT 1"""), {"yo": yo, "otro": otros[0]}).scalar()
            if existente:
                return self._dto(existente, yo)
        c = Conversacion(es_grupal=es_grupal, nombre=nombre if es_grupal else None)
        self.db.add(c)
        self.db.flush()
        self.db.add(ConversacionParticipante(conversacion_id=c.id, usuario_id=yo, estado="aceptada"))
        for uid in otros:
            estado = "aceptada" if self.seguidores.es_seguidor_aceptado(uid, yo) else "solicitud"
            self.db.add(ConversacionParticipante(conversacion_id=c.id, usuario_id=uid, estado=estado))
        self.db.commit()
        return self._dto(c.id, yo)

    def mensajes(self, conv_id: int, yo: int, limit: int, antes_de: int | None) -> list[MensajeDTO]:
        self._participante(conv_id, yo)
        q = self.db.query(Mensaje).filter(Mensaje.conversacion_id == conv_id)
        if antes_de:
            q = q.filter(Mensaje.id < antes_de)
        return [MensajeDTO.model_validate(m) for m in q.order_by(Mensaje.id.desc()).limit(limit).all()]

    def enviar(self, conv_id: int, yo: int, texto: str | None, post_id: int | None) -> MensajeDTO:
        p = self._participante(conv_id, yo)
        otros = self._otros(conv_id, yo)
        if any(self.usuarios.hay_bloqueo(o, yo) for o in otros) or not any(self.usuarios.buscar_activo(o) for o in otros):
            raise ForbiddenError("No podés escribir en esta conversación")
        if post_id is not None:
            PostService(self.db).obtener(post_id, yo)  # 404/403 si no puede ver el post
        p.estado = "aceptada"  # responder acepta la solicitud
        m = Mensaje(conversacion_id=conv_id, emisor_id=yo, texto=texto, post_id=post_id)
        self.db.add(m)
        self.db.flush()
        p.ultima_lectura = m.fecha  # lo que escribo ya lo leí
        self.db.commit()
        self.db.refresh(m)
        return MensajeDTO.model_validate(m)

    def aceptar(self, conv_id: int, yo: int) -> ConversacionDTO:
        self._participante(conv_id, yo).estado = "aceptada"
        self.db.commit()
        return self._dto(conv_id, yo)

    def marcar_leido(self, conv_id: int, yo: int) -> None:
        self._participante(conv_id, yo)
        self.db.execute(text(
            """UPDATE conversacion_participante SET ultima_lectura = LOCALTIMESTAMP
               WHERE conversacion_id = :c AND usuario_id = :yo"""), {"c": conv_id, "yo": yo})
        self.db.commit()

    def anular(self, mensaje_id: int, yo: int) -> None:
        m = self.db.get(Mensaje, mensaje_id)
        if m is None or self.db.get(ConversacionParticipante, (m.conversacion_id, yo)) is None:
            raise NotFoundError("Mensaje no encontrado")
        if m.emisor_id != yo:
            raise ForbiddenError("Solo quien lo envió puede anularlo")
        self.db.delete(m)
        self.db.commit()

    def salir(self, conv_id: int, yo: int) -> None:
        self.db.delete(self._participante(conv_id, yo))
        self.db.flush()
        if not self._otros(conv_id, yo):
            self.db.delete(self.db.get(Conversacion, conv_id))
        self.db.commit()
