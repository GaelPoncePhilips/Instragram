from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from src.db.connection import Base


class HashtagPost(Base):
    __tablename__ = "hashtags_post"

    post_id = Column(Integer, ForeignKey("post.id", ondelete="CASCADE"), primary_key=True)
    hashtag_id = Column(Integer, ForeignKey("hashtag.id", ondelete="CASCADE"), primary_key=True)
