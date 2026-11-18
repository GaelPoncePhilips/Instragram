from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from src.config.env import settings
from src.utils.errors import UnauthorizedError

ALGORITHM = "HS256"


def create_access_token(data: dict) -> str:
    to_encode = data | {
        "typ": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_MINUTOS),
    }
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError as e:
        raise UnauthorizedError("Token inválido o vencido") from e
    if payload.get("typ") != "access":
        raise UnauthorizedError("Token inválido")
    return payload
