from pydantic import BaseModel, EmailStr, Field


class LoginSchema(BaseModel):
    email: EmailStr
    password: str


class RefreshSchema(BaseModel):
    refresh_token: str = Field(min_length=20)


class CambiarPasswordSchema(BaseModel):
    actual: str
    nueva: str = Field(min_length=8, max_length=72)


class BorrarCuentaSchema(BaseModel):
    password: str
