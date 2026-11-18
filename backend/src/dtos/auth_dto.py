from pydantic import BaseModel


class LoginDTO(BaseModel):
    email: str
    password: str


class TokenDTO(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expira_en_segundos: int
