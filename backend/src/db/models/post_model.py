from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from src.db.connection import Base


class Post(Base):
    __tablename__ = "post"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    url_imagen = Column(String, nullable=False)  # en un reel es la portada
    descripcion = Column(String(2200))
    fecha_publicacion = Column(DateTime, nullable=False, server_default=func.now())
    tipo = Column(String(5), nullable=False, server_default="foto")  # EXTRA: 'foto' | 'reel'
    url_video = Column(String)  # EXTRA: solo reels
    duracion_seg = Column(Integer)  # EXTRA: solo reels
    fecha_edicion = Column(DateTime)  # EXTRA
