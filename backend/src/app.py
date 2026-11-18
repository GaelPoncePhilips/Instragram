from fastapi import FastAPI

import src.db.models  # noqa: F401  registra todos los modelos
from src.middlewares.error_middleware import app_error_handler
from src.routers import (
    auth_router, extra_router, post_router, seguidor_router, social_router, story_router, usuario_router,
)
from src.utils.errors import AppError

app = FastAPI(title="Instagram API")

app.add_exception_handler(AppError, app_error_handler)

for r in (auth_router, usuario_router, seguidor_router, social_router, post_router, story_router, extra_router):
    app.include_router(r.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
