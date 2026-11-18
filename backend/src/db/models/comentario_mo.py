from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime

from src.db.connection import Base


class Comentario(Base):
    __tablename__ = "comentario"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("post.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    texto = Column(String(300), nullable=False)
    fecha = Column(DateTime, default=datetime.now)