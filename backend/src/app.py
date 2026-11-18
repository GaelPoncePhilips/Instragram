from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import src.db.models  # noqa: F401  registra todos los modelos
from src.config.env import settings
from src.middlewares.error_middleware import app_error_handler
from src.routers import (
    auth_router, extra_router, media_router, notificacion_router, post_router, seguidor_router,
    social_router, story_router, usuario_router,
)
from src.utils.errors import AppError

app = FastAPI(title="Instagram API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_exception_handler(AppError, app_error_handler)

for r in (auth_router, usuario_router, seguidor_router, social_router, post_router, story_router,
          extra_router, media_router, notificacion_router):
    app.include_router(r.router, prefix="/api")

Path(settings.MEDIA_DIR).mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.MEDIA_DIR), name="media")


@app.get("/health")
def health():
    return {"status": "ok"}
