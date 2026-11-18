"""Login, refresh tokens con rotación, cambio de contraseña y borrado lógico de la cuenta.

Rotación: cada /auth/refresh revoca el token usado y entrega uno nuevo de la misma "familia".
Si alguien presenta un token ya revocado (posible robo), se revoca toda la familia.
"""
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from src.config.env import settings
from src.db.models.usuario_model import Usuario
from src.dtos.auth_dto import LoginDTO, TokenDTO
from src.repositories.refresh_token_repository import RefreshTokenRepository
from src.repositories.usuario_repository import UsuarioRepository
from src.utils.errors import BadRequestError, UnauthorizedError
from src.utils.hash import hash_password, verify_password
from src.utils.jwt import create_access_token


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = UsuarioRepository(db)
        self.tokens = RefreshTokenRepository(db)

    def _emitir(self, usuario_id: int, familia=None) -> TokenDTO:
        return TokenDTO(
            access_token=create_access_token({"sub": str(usuario_id)}),
            refresh_token=self.tokens.emitir(usuario_id, settings.REFRESH_TOKEN_DIAS, familia),
            expira_en_segundos=settings.ACCESS_TOKEN_MINUTOS * 60,
        )

    def login(self, dto: LoginDTO) -> TokenDTO:
        usuario = self.repo.buscar_por_email(dto.email)
        if not usuario or usuario.eliminado_en is not None or not verify_password(dto.password, usuario.password_hash):
            raise UnauthorizedError("Email o contraseña incorrectos")
        return self._emitir(usuario.id)

    def refresh(self, token: str) -> TokenDTO:
        rt = self.tokens.buscar(token)
        if rt is None:
            raise UnauthorizedError("Refresh token inválido")
        if rt.revocado_en is not None:
            self.tokens.revocar_familia(rt.familia)  # reuso: alguien más lo tiene
            raise UnauthorizedError("Refresh token revocado")
        if rt.expira_en <= datetime.now() or self.repo.buscar_activo(rt.usuario_id) is None:
            raise UnauthorizedError("Refresh token vencido")
        self.tokens.revocar(rt)
        return self._emitir(rt.usuario_id, rt.familia)

    def logout(self, token: str) -> None:
        rt = self.tokens.buscar(token)
        if rt is not None:
            self.tokens.revocar_familia(rt.familia)

    def cambiar_password(self, usuario: Usuario, actual: str, nueva: str) -> TokenDTO:
        if not verify_password(actual, usuario.password_hash):
            raise BadRequestError("La contraseña actual no es correcta")
        if actual == nueva:
            raise BadRequestError("La contraseña nueva tiene que ser distinta")
        usuario.password_hash = hash_password(nueva)
        self.db.commit()
        self.tokens.revocar_todos(usuario.id)  # cierra las otras sesiones
        return self._emitir(usuario.id)

    def borrar_cuenta(self, usuario: Usuario, password: str) -> None:
        """Borrado lógico: la cuenta y todo su contenido dejan de verse, pero los datos quedan."""
        if not verify_password(password, usuario.password_hash):
            raise BadRequestError("La contraseña no es correcta")
        usuario.eliminado_en = func.localtimestamp()
        self.db.commit()
        self.tokens.revocar_todos(usuario.id)
