from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from src.db.connection import Base


# EXTRA: destacadas ordenables
class Destacada(Base):
    __tablename__ = "destacada"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    titulo = Column(String(50), nullable=False)
    portada_url = Column(String)
    orden = Column(Integer, nullable=False, server_default="0")
    fecha_creacion = Column(DateTime, nullable=False, server_default=func.now())


class DestacadaStory(Base):
    __tablename__ = "destacada_story"

    destacada_id = Column(Integer, primary_key=True)
    story_id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, nullable=False)  # FK compuestas en tables.sql
    orden = Column(Integer, nullable=False, server_default="0")
