from sqlalchemy import Column, Integer, ForeignKey
from src.db.connection import Base


class HashtagPost(Base):
    __tablename__ = "hashtags_post"

    post_id = Column(
        Integer,
        ForeignKey("post.id"),
        primary_key=True
    )

    hashtag_id = Column(
        Integer,
        ForeignKey("hashtag.id"),
        primary_key=True
    )
