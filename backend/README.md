# Instagram — Backend (FastAPI + SQLAlchemy + PostgreSQL)

API de la red social: usuarios, posts y reels, seguidores con cuentas privadas, likes, comentarios, feed,
stories, mejores amigos, bloqueos, hashtags, estadísticas y las extras (destacadas ordenables, álbumes
compartidos, DMs y recomendaciones).

- Endpoints: [`docs/API.md`](../docs/API.md) (y Swagger en `/docs` con el server levantado)
- Modelo de datos: [`docs/MODELO_DATOS.md`](../docs/MODELO_DATOS.md)
- Algoritmo de recomendaciones: [`docs/RECOMENDACIONES.md`](../docs/RECOMENDACIONES.md)

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate              # Windows: venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
cp .env.example .env                  # completar DATABASE_URL y JWT_SECRET
```

### Base de datos

Base nueva:

```bash
psql "<url>" -f src/db/tables.sql
```

Una base creada con una versión anterior del script se actualiza aplicando, en orden, los archivos de `src/db/migrations/` que le falten.
El esquema lo define `tables.sql`; los modelos de SQLAlchemy solo lo mapean (no hay `create_all`).

### Levantar

```bash
python -m src.main                    # http://localhost:8000/docs
```

## Tests

End-to-end contra una base PostgreSQL de prueba que **se borra en cada test** (el nombre tiene que terminar en `_test`):

```bash
createdb instagram_test
TEST_DATABASE_URL=postgresql+psycopg2://postgres@/instagram_test pytest
```

`tests/test_consigna.py` tiene un test por historia de usuario (HU1–HU12); `tests/test_extras.py`, las extras.

## Estructura

```
src/
├── app.py                 # FastAPI + routers
├── db/
│   ├── tables.sql         # esquema (fuente de verdad)
│   ├── migrations/
│   └── models/            # SQLAlchemy
├── routers/               # HTTP: valida con schemas, auth, llama al service
├── schemas/               # Pydantic de entrada
├── dtos/                  # Pydantic de salida / entre capas
├── services/              # reglas de negocio (permisos_service: privacidad y bloqueos)
├── repositories/          # acceso a datos (sql.py: fragmentos SQL compartidos)
├── mappers/               # Model → DTO
├── middlewares/           # auth (JWT) y errores
└── utils/                 # errores, hash, jwt
```

Flujo: **Router → Schema → DTO → Service → Repository → Model**. Los errores se lanzan como
`AppError` (`NotFoundError` 404, `ForbiddenError` 403, …) y el middleware los convierte en
`{"error": ..., "message": ...}`.

Autenticación: `POST /api/auth/login` devuelve un access token (JWT, 15 min) y un refresh token (30 días);
el resto de las rutas piden `Authorization: Bearer <access_token>` y `/api/auth/refresh` renueva los dos.

Recomendador: correr `python -m src.jobs.recalcular_afinidad` periódicamente (ver `docs/RECOMENDACIONES.md`).

Archivos: `POST /api/media` los guarda en `MEDIA_DIR` y se sirven en `/media/...`.
