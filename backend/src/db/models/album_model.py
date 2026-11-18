from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from src.db.connection import Base


# EXTRA: álbumes compartidos
class Album(Base):
    __tablename__ = "album"

    id = Column(Integer, primary_key=True)
    creador_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    titulo = Column(String(60), nullable=False)
    descripcion = Column(String(255))
    portada_url = Column(String)
    fecha_creacion = Column(DateTime, nullable=False, server_default=func.now())


class AlbumMiembro(Base):
    __tablename__ = "album_miembro"

    album_id = Column(Integer, ForeignKey("album.id", ondelete="CASCADE"), primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), primary_key=True)
    rol = Column(String(10), nullable=False, server_default="miembro")  # 'admin' | 'miembro'
    estado = Column(String(10), nullable=False, server_default="pendiente")  # 'pendiente' | 'aceptado'
    fecha = Column(DateTime, nullable=False, server_default=func.now())


class AlbumItem(Base):
    __tablename__ = "album_item"

    id = Column(Integer, primary_key=True)
    album_id = Column(Integer, ForeignKey("album.id", ondelete="CASCADE"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    url_imagen = Column(String, nullable=False)
    descripcion = Column(String(500))
    fecha = Column(DateTime, nullable=False, server_default=func.now())
