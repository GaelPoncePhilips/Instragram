from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from src.db.connection import Base


class Post(Base):
    __tablename__ = "post"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    url_imagen = Column(String(500), nullable=False)
    descripcion = Column(Text, nullable=True)
    fecha_publicacion = Column(DateTime, nullable=False, server_default=func.now())
