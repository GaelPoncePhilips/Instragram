from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    PORT: int = 8000
    JWT_SECRET: str
    ACCESS_TOKEN_MINUTOS: int = 15
    REFRESH_TOKEN_DIAS: int = 30
    # Orígenes permitidos por CORS, separados por coma
    CORS_ORIGINS: str = "http://localhost:3000"
    # Archivos subidos: carpeta en disco y URL pública con la que se sirven
    MEDIA_DIR: str = "media"
    MEDIA_URL: str = "http://localhost:8000/media"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
