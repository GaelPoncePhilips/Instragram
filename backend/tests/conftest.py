"""Tests end-to-end contra una base PostgreSQL de prueba.

    createdb instagram_test
    TEST_DATABASE_URL=postgresql+psycopg2://postgres@/instagram_test pytest

La base se BORRA y se recrea con db/tables.sql en cada test: por seguridad
el nombre tiene que terminar en "_test".
"""
import os
from pathlib import Path

import pytest

URL = os.environ.get("TEST_DATABASE_URL", "")
if not URL.rsplit("/", 1)[-1].split("?")[0].endswith("_test"):
    pytest.exit("Definí TEST_DATABASE_URL apuntando a una base cuyo nombre termine en _test", returncode=2)
os.environ["DATABASE_URL"] = URL
os.environ.setdefault("JWT_SECRET", "test")

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from src.app import app  # noqa: E402
from src.db.connection import engine  # noqa: E402

SCHEMA = (Path(__file__).parent.parent / "src" / "db" / "tables.sql").read_text()


@pytest.fixture(autouse=True)
def base_limpia():
    with engine.begin() as c:
        c.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
        c.exec_driver_sql(SCHEMA)
    yield


def sql(query: str, **params):
    with engine.begin() as c:
        return c.execute(text(query), params)


class Usuario:
    def __init__(self, client: TestClient, username: str):
        self.c = client
        r = client.post("/api/usuarios", json={"username": username, "email": f"{username}@x.com",
                                               "password": "secreta123", "nombre": username.title()})
        assert r.status_code == 201, r.text
        self.id = r.json()["id"]
        self.username = username
        tok = client.post("/api/auth/login", json={"email": f"{username}@x.com", "password": "secreta123"})
        self.h = {"Authorization": f"Bearer {tok.json()['access_token']}"}

    def get(self, url, **kw): return self.c.get("/api" + url, headers=self.h, **kw)
    def post(self, url, json=None): return self.c.post("/api" + url, headers=self.h, json=json)
    def patch(self, url, json=None): return self.c.patch("/api" + url, headers=self.h, json=json)
    def put(self, url, json=None): return self.c.put("/api" + url, headers=self.h, json=json)
    def delete(self, url): return self.c.delete("/api" + url, headers=self.h)

    def seguir(self, otro: "Usuario"):
        return self.post(f"/usuarios/{otro.id}/seguir")

    def publicar(self, descripcion="", **extra):
        r = self.post("/posts", {"url_imagen": "foto.jpg", "descripcion": descripcion, **extra})
        assert r.status_code == 201, r.text
        return r.json()["id"]


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def usuarios(client):
    """ana, beto, caro, dani."""
    return [Usuario(client, n) for n in ("ana", "beto", "caro", "dani")]
