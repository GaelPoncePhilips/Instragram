from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from datetime import datetime

# Usar el mismo import de Base que tienen los otros Models
from src.db.connection import Base


class Like(Base):
    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    post_id = Column(Integer, ForeignKey("post.id"), nullable=False)
    fecha = Column(DateTime, default=datetime.now)

    __table_args__ = (
        UniqueConstraint(
            "usuario_id",
            "post_id",
            name="uq_like_usuario_post"
        ),
    )