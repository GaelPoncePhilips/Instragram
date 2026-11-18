from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from src.db.connection import Base


class Usuario(Base):
    __tablename__ = "usuario"

    id = Column(Integer, primary_key=True)
    username = Column(String(30), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    nombre = Column(String(100), nullable=False)
    bio = Column(String(255))
    es_privada = Column(Boolean, nullable=False, server_default="false")
    reels_desactivados = Column(Boolean, nullable=False, server_default="false")  # EXTRA
    eliminado_en = Column(DateTime)  # EXTRA: borrado lógico
    fecha_registro = Column(DateTime, nullable=False, server_default=func.now())
