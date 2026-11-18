from src.db.models.post_model import Post
from src.dtos.post_dto import PostResponseDTO


def to_post_response(post: Post) -> PostResponseDTO:
    return PostResponseDTO.model_validate(post)
