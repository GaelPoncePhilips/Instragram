from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.sql import func

from src.db.connection import Base


class Seguidor(Base):
    __tablename__ = "seguidores"

    __table_args__ = (
        CheckConstraint(
            "estado IN ('pendiente', 'aceptado')",
            name="ck_seguidores_estado"
        ),
    )

    seguidor_id = Column(
        Integer,
        ForeignKey("Usuario.id", ondelete="CASCADE"),
        primary_key=True
    )

    seguido_id = Column(
        Integer,
        ForeignKey("Usuario.id", ondelete="CASCADE"),
        primary_key=True
    )

    estado = Column(String(10), nullable=False)

    fecha = Column(DateTime, nullable=False, server_default=func.now())