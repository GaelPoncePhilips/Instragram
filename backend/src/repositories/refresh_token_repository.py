import hashlib
import secrets
import uuid
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from src.db.models.notificacion_model import RefreshToken


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


class RefreshTokenRepository:
    def __init__(self, db: Session):
        self.db = db

    def emitir(self, usuario_id: int, dias: int, familia: uuid.UUID | None = None) -> str:
        """Crea un refresh token y devuelve el valor en claro (en la base solo queda el hash)."""
        token = secrets.token_urlsafe(48)
        self.db.add(RefreshToken(
            usuario_id=usuario_id, token_hash=_hash(token), familia=familia or uuid.uuid4(),
            expira_en=datetime.now() + timedelta(days=dias),
        ))
        self.db.commit()
        return token

    def buscar(self, token: str) -> RefreshToken | None:
        return self.db.query(RefreshToken).filter(RefreshToken.token_hash == _hash(token)).first()

    def revocar(self, rt: RefreshToken) -> None:
        rt.revocado_en = func.localtimestamp()
        self.db.commit()

    def revocar_familia(self, familia: uuid.UUID) -> None:
        self.db.query(RefreshToken).filter(
            RefreshToken.familia == familia, RefreshToken.revocado_en.is_(None)
        ).update({"revocado_en": func.localtimestamp()}, synchronize_session=False)
        self.db.commit()

    def revocar_todos(self, usuario_id: int) -> None:
        self.db.query(RefreshToken).filter(
            RefreshToken.usuario_id == usuario_id, RefreshToken.revocado_en.is_(None)
        ).update({"revocado_en": func.localtimestamp()}, synchronize_session=False)
        self.db.commit()
