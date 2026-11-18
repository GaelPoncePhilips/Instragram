from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from src.db.connection import Base


class Like(Base):
    __tablename__ = "likes"

    usuario_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), primary_key=True)
    post_id = Column(Integer, ForeignKey("post.id", ondelete="CASCADE"), primary_key=True)
    fecha = Column(DateTime, nullable=False, server_default=func.now())
