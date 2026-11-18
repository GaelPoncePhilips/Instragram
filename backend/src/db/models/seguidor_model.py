from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from src.db.connection import Base


class Seguidor(Base):
    __tablename__ = "seguidores"

    seguidor_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), primary_key=True)
    seguido_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), primary_key=True)
    estado = Column(String(10), nullable=False)  # 'pendiente' | 'aceptado'
    fecha = Column(DateTime, nullable=False, server_default=func.now())
