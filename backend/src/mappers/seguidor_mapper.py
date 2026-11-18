from src.db.models.seguidor_model import Seguidor
from src.dtos.seguidor_dto import SeguidorResponseDTO


def to_seguidor_response(seguidor: Seguidor) -> SeguidorResponseDTO:
    return SeguidorResponseDTO.model_validate(seguidor)
