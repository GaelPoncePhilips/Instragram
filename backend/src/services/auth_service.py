from sqlalchemy.orm import Session

from src.dtos.auth_dto import LoginDTO, TokenDTO
from src.repositories.usuario_repository import UsuarioRepository
from src.utils.errors import UnauthorizedError
from src.utils.hash import verify_password
from src.utils.jwt import create_access_token


class AuthService:
    def __init__(self, db: Session):
        self.repo = UsuarioRepository(db)

    def login(self, dto: LoginDTO) -> TokenDTO:
        usuario = self.repo.buscar_por_email(dto.email)
        if not usuario or not verify_password(dto.password, usuario.password_hash):
            raise UnauthorizedError("Email o contraseña incorrectos")
        return TokenDTO(access_token=create_access_token({"sub": str(usuario.id)}))
