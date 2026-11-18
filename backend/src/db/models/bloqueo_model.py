from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from src.db.connection import Base


class Bloqueo(Base):
    __tablename__ = "bloqueo"

    id = Column(Integer, primary_key=True)
    bloqueador_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    bloqueado_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    fecha = Column(DateTime, nullable=False, server_default=func.now())


class MejorAmigo(Base):
    __tablename__ = "mejores_amigos"

    usuario_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), primary_key=True)
    amigo_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), primary_key=True)
