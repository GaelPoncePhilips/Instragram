from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from src.db.connection import Base

U = "usuario.id"


# EXTRA: notificaciones
class Notificacion(Base):
    __tablename__ = "notificacion"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey(U, ondelete="CASCADE"), nullable=False)  # destinatario
    actor_id = Column(Integer, ForeignKey(U, ondelete="CASCADE"), nullable=False)
    tipo = Column(String(20), nullable=False)
    post_id = Column(Integer, ForeignKey("post.id", ondelete="CASCADE"))
    comentario_id = Column(Integer, ForeignKey("comentario.id", ondelete="CASCADE"))
    album_id = Column(Integer, ForeignKey("album.id", ondelete="CASCADE"))
    leida = Column(Boolean, nullable=False, server_default="false")
    fecha = Column(DateTime, nullable=False, server_default=func.now())


# EXTRA: refresh tokens (se guarda el sha256, nunca el token)
class RefreshToken(Base):
    __tablename__ = "refresh_token"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey(U, ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(64), nullable=False, unique=True)
    familia = Column(UUID(as_uuid=True), nullable=False)
    expira_en = Column(DateTime, nullable=False)
    revocado_en = Column(DateTime)
    creado_en = Column(DateTime, nullable=False, server_default=func.now())
