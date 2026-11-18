from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.db.connection import get_db
from src.services.seguidor_service import SeguidorService
from src.schemas.seguidor_schema import SeguidorResponse, SeguidorEstadoUpdate

# Reemplazar este import por el de autenticación de tu proyecto
from src.auth.dependencies import get_current_user


router = APIRouter(
    prefix="/seguidores",
    tags=["Seguidores"]
)


# Seguir a un usuario
@router.post("/{seguido_id}", response_model=SeguidorResponse)
def seguir_usuario(
    seguido_id: int,
    db: Session = Depends(get_db),
    usuario_actual=Depends(get_current_user)
):
    service = SeguidorService(db)

    try:
        return service.seguir_usuario(
            usuario_actual.id,
            seguido_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# Consultar solicitudes pendientes
@router.get("/solicitudes", response_model=list[SeguidorResponse])
def listar_solicitudes(
    db: Session = Depends(get_db),
    usuario_actual=Depends(get_current_user)
):
    service = SeguidorService(db)

    return service.listar_solicitudes(usuario_actual.id)


# Aceptar o rechazar una solicitud
@router.patch("/solicitudes/{seguidor_id}")
def responder_solicitud(
    seguidor_id: int,
    datos: SeguidorEstadoUpdate,
    db: Session = Depends(get_db),
    usuario_actual=Depends(get_current_user)
):
    service = SeguidorService(db)

    try:
        return service.responder_solicitud(
            seguidor_id,
            usuario_actual.id,
            datos.estado
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

