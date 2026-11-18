from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from src.db.connection import Base


# EXTRA: DMs
class Conversacion(Base):
    __tablename__ = "conversacion"

    id = Column(Integer, primary_key=True)
    es_grupal = Column(Boolean, nullable=False, server_default="false")
    nombre = Column(String(60))
    fecha_creacion = Column(DateTime, nullable=False, server_default=func.now())


class ConversacionParticipante(Base):
    __tablename__ = "conversacion_participante"

    conversacion_id = Column(Integer, ForeignKey("conversacion.id", ondelete="CASCADE"), primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), primary_key=True)
    estado = Column(String(10), nullable=False, server_default="aceptada")  # 'solicitud' | 'aceptada'
    ultima_lectura = Column(DateTime)
    fecha_ingreso = Column(DateTime, nullable=False, server_default=func.now())


class Mensaje(Base):
    __tablename__ = "mensaje"

    id = Column(Integer, primary_key=True)
    conversacion_id = Column(Integer, ForeignKey("conversacion.id", ondelete="CASCADE"), nullable=False)
    emisor_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    texto = Column(String(1000))
    post_id = Column(Integer, ForeignKey("post.id", ondelete="SET NULL"))
    fecha = Column(DateTime, nullable=False, server_default=func.now())
