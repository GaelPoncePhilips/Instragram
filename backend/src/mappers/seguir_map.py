
from src.db.models.seguidor import Seguidor
from src.dto.seguidor_dto import SeguidorDTO


def seguidor_model_to_dto(seguidor: Seguidor) -> SeguidorDTO:
    return SeguidorDTO(
        seguidor_id=seguidor.seguidor_id,
        seguido_id=seguidor.seguido_id,
        estado=seguidor.estado,
        fecha=seguidor.fecha
    )


def seguidor_dto_to_model(seguidor_dto: SeguidorDTO) -> Seguidor:
    return Seguidor(
        seguidor_id=seguidor_dto.seguidor_id,
        seguido_id=seguidor_dto.seguido_id,
        estado=seguidor_dto.estado,
        fecha=seguidor_dto.fecha
    )
