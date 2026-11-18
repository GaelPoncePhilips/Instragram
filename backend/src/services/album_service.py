"""EXTRA: álbumes compartidos.

Visibles para miembros (los invitados pendientes también, para decidir) y para seguidores aceptados de cualquier miembro aceptado,
salvo bloqueo con el creador. Solo los miembros aceptados suben items.
"""
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.db.models.album_model import Album, AlbumItem, AlbumMiembro
from src.dtos.extra_dto import AlbumDTO, AlbumItemDTO, AlbumMiembroDTO
from src.repositories.notificacion_repository import NotificacionRepository
from src.repositories.usuario_repository import UsuarioRepository
from src.utils.errors import BadRequestError, ConflictError, ForbiddenError, NotFoundError

VISIBLE = """(
    EXISTS (SELECT 1 FROM album_miembro m WHERE m.album_id = a.id AND m.usuario_id = :yo)
    OR EXISTS (SELECT 1 FROM album_miembro m JOIN seguidores s ON s.seguido_id = m.usuario_id
               WHERE m.album_id = a.id AND m.estado = 'aceptado' AND s.seguidor_id = :yo AND s.estado = 'aceptado')
  ) AND NOT EXISTS (SELECT 1 FROM bloqueo b WHERE (b.bloqueador_id = a.creador_id AND b.bloqueado_id = :yo)
                                              OR (b.bloqueador_id = :yo AND b.bloqueado_id = a.creador_id))"""


class AlbumService:
    def __init__(self, db: Session):
        self.db = db
        self.usuarios = UsuarioRepository(db)

    # ---------- helpers
    def _miembro(self, album_id: int, usuario_id: int) -> AlbumMiembro | None:
        return self.db.get(AlbumMiembro, (album_id, usuario_id))

    def _visible(self, album_id: int, yo: int) -> Album:
        ok = self.db.execute(text(f"SELECT {VISIBLE} FROM album a WHERE a.id = :id"),
                             {"id": album_id, "yo": yo}).scalar()
        if not ok:
            raise NotFoundError("Álbum no encontrado")
        return self.db.get(Album, album_id)

    def _exigir(self, album_id: int, yo: int, admin: bool = False) -> AlbumMiembro:
        m = self._miembro(album_id, yo)
        if m is None or m.estado != "aceptado":
            self._visible(album_id, yo)  # 404 si ni siquiera lo ve
            raise ForbiddenError("Tenés que ser miembro del álbum")
        if admin and m.rol != "admin":
            raise ForbiddenError("Solo un admin del álbum puede hacer esto")
        return m

    def _dto(self, a: Album) -> AlbumDTO:
        miembros = self.db.execute(text(
            """SELECT u.id, u.username, u.nombre, m.rol, m.estado FROM album_miembro m
               JOIN usuario u ON u.id = m.usuario_id AND u.eliminado_en IS NULL WHERE m.album_id = :id ORDER BY m.fecha"""),
            {"id": a.id}).mappings().all()
        portada = a.portada_url or self.db.query(AlbumItem.url_imagen).filter(
            AlbumItem.album_id == a.id).order_by(AlbumItem.fecha, AlbumItem.id).limit(1).scalar()
        return AlbumDTO(id=a.id, creador_id=a.creador_id, titulo=a.titulo, descripcion=a.descripcion,
                        portada_url=portada, fecha_creacion=a.fecha_creacion,
                        miembros=[AlbumMiembroDTO(**m) for m in miembros])

    # ---------- álbum
    def crear(self, yo: int, campos: dict) -> AlbumDTO:
        a = Album(creador_id=yo, **campos)
        self.db.add(a)
        self.db.flush()
        self.db.add(AlbumMiembro(album_id=a.id, usuario_id=yo, rol="admin", estado="aceptado"))
        self.db.commit()
        self.db.refresh(a)
        return self._dto(a)

    def obtener(self, album_id: int, yo: int) -> AlbumDTO:
        return self._dto(self._visible(album_id, yo))

    def actualizar(self, album_id: int, yo: int, campos: dict) -> AlbumDTO:
        self._exigir(album_id, yo, admin=True)
        a = self.db.get(Album, album_id)
        for k, v in campos.items():
            setattr(a, k, v)
        self.db.commit()
        return self._dto(a)

    def eliminar(self, album_id: int, yo: int) -> None:
        self._exigir(album_id, yo, admin=True)
        self.db.delete(self.db.get(Album, album_id))
        self.db.commit()

    def de_usuario(self, usuario_id: int, yo: int) -> list[AlbumDTO]:
        if usuario_id != yo and self.usuarios.hay_bloqueo(usuario_id, yo):
            raise NotFoundError("Usuario no encontrado")
        ids = self.db.execute(text(
            f"""SELECT a.id FROM album a JOIN album_miembro m ON m.album_id = a.id
                WHERE m.usuario_id = :uid AND m.estado = 'aceptado' AND {VISIBLE}
                ORDER BY a.fecha_creacion DESC"""), {"uid": usuario_id, "yo": yo}).scalars().all()
        return [self._dto(self.db.get(Album, i)) for i in ids]

    # ---------- miembros
    def invitar(self, album_id: int, yo: int, invitado_id: int) -> AlbumDTO:
        self._exigir(album_id, yo, admin=True)
        if self.usuarios.buscar_activo(invitado_id) is None:
            raise NotFoundError("Usuario no encontrado")
        a = self.db.get(Album, album_id)
        if self.usuarios.hay_bloqueo(invitado_id, yo) or self.usuarios.hay_bloqueo(invitado_id, a.creador_id):
            raise BadRequestError("No podés invitar a este usuario")
        if self._miembro(album_id, invitado_id):
            raise ConflictError("Ya es miembro o tiene una invitación pendiente")
        self.db.add(AlbumMiembro(album_id=album_id, usuario_id=invitado_id))
        NotificacionRepository(self.db).crear(invitado_id, yo, "invitacion_album", album_id=album_id)
        self.db.commit()
        return self._dto(a)

    def invitaciones(self, yo: int) -> list[AlbumDTO]:
        ids = [i for (i,) in self.db.query(AlbumMiembro.album_id).filter(
            AlbumMiembro.usuario_id == yo, AlbumMiembro.estado == "pendiente")]
        return [self._dto(self.db.get(Album, i)) for i in ids]

    def aceptar(self, album_id: int, yo: int) -> AlbumDTO:
        m = self._miembro(album_id, yo)
        if m is None or m.estado != "pendiente":
            raise NotFoundError("No tenés una invitación pendiente a este álbum")
        m.estado = "aceptado"
        self.db.commit()
        return self._dto(self.db.get(Album, album_id))

    def quitar_miembro(self, album_id: int, yo: int, usuario_id: int) -> None:
        """Rechazar invitación, salir o (admin) expulsar. Si se va el último admin, asciende el más antiguo."""
        objetivo = self._miembro(album_id, usuario_id)
        if objetivo is None:
            raise NotFoundError("No es miembro del álbum")
        if usuario_id != yo:
            self._exigir(album_id, yo, admin=True)
        self.db.delete(objetivo)
        self.db.flush()
        if objetivo.rol == "admin" and objetivo.estado == "aceptado":
            aceptados = self.db.query(AlbumMiembro).filter(
                AlbumMiembro.album_id == album_id, AlbumMiembro.estado == "aceptado"
            ).order_by(AlbumMiembro.fecha).all()
            if not aceptados:
                self.db.delete(self.db.get(Album, album_id))  # nadie más: se borra
            elif not any(m.rol == "admin" for m in aceptados):
                aceptados[0].rol = "admin"
        self.db.commit()

    # ---------- items
    def items(self, album_id: int, yo: int, limit: int, offset: int) -> list[AlbumItemDTO]:
        self._visible(album_id, yo)
        items = self.db.query(AlbumItem).filter(AlbumItem.album_id == album_id).order_by(
            AlbumItem.fecha.desc(), AlbumItem.id.desc()).limit(limit).offset(offset).all()
        return [AlbumItemDTO.model_validate(i) for i in items]

    def subir(self, album_id: int, yo: int, campos: dict) -> AlbumItemDTO:
        self._exigir(album_id, yo)
        item = AlbumItem(album_id=album_id, usuario_id=yo, **campos)
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return AlbumItemDTO.model_validate(item)

    def borrar_item(self, album_id: int, yo: int, item_id: int) -> None:
        m = self._exigir(album_id, yo)
        item = self.db.get(AlbumItem, item_id)
        if item is None or item.album_id != album_id:
            raise NotFoundError("Item no encontrado")
        if item.usuario_id != yo and m.rol != "admin":
            raise ForbiddenError("Solo el autor del item o un admin pueden borrarlo")
        self.db.delete(item)
        self.db.commit()
