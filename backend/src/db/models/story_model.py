from sqlalchemy import FetchedValue, Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from src.db.connection import Base


class Story(Base):
    __tablename__ = "story"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    url_imagen = Column(String, nullable=False)
    solo_mejores_amigos = Column(Boolean, nullable=False, server_default="false")
    fecha_publicacion = Column(DateTime, nullable=False, server_default=func.now())
    # La base la calcula: fecha_publicacion + 24 h
    fecha_vencimiento = Column(DateTime, nullable=False, server_default=FetchedValue())


class VistaStory(Base):
    __tablename__ = "vistas_story"

    usuario_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), primary_key=True)
    story_id = Column(Integer, ForeignKey("story.id", ondelete="CASCADE"), primary_key=True)
    fecha = Column(DateTime, nullable=False, server_default=func.now())
