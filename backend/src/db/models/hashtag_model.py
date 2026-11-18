from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from src.db.connection import Base


class Hashtag(Base):
    __tablename__ = "hashtag"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(100), unique=True, nullable=False)
