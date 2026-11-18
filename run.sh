#!/usr/bin/env bash
# Levanta backend (FastAPI, :8000) y frontend (Vite, :5173) juntos. Ctrl+C cierra los dos.
#
#   ./run.sh          backend real + frontend contra el backend (vía proxy /api de Vite)
#   ./run.sh --mock   solo el frontend con el backend simulado en memoria
#
# Funciona en Git Bash (Windows), macOS y Linux.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
MODO="${1:-}"

# ---------- Bun
export PATH="$HOME/.bun/bin:$PATH"
if ! command -v bun >/dev/null 2>&1; then
  echo "✗ No encuentro Bun. Instalalo: https://bun.sh (Windows: powershell -c \"irm bun.sh/install.ps1 | iex\")"
  exit 1
fi

# ---------- Frontend: dependencias
if [ ! -d "$FRONTEND/node_modules" ]; then
  echo "→ Instalando dependencias del frontend (bun install)…"
  (cd "$FRONTEND" && bun install)
fi

if [ "$MODO" = "--mock" ]; then
  echo "→ Frontend con mock en http://localhost:5173 (y la IP de tu red)"
  cd "$FRONTEND"
  VITE_USE_MOCK=true exec bun run dev
fi

# ---------- Backend: Python, venv y dependencias
PY=""
for c in python3 python py; do
  if command -v "$c" >/dev/null 2>&1; then PY="$c"; break; fi
done
if [ -z "$PY" ]; then
  echo "✗ No encuentro Python 3. Instalalo o usá ./run.sh --mock"
  exit 1
fi

if [ ! -d "$BACKEND/venv" ]; then
  echo "→ Creando entorno virtual del backend…"
  (cd "$BACKEND" && "$PY" -m venv venv)
fi
if [ -x "$BACKEND/venv/Scripts/python.exe" ]; then
  VPY="$BACKEND/venv/Scripts/python.exe"   # Windows
else
  VPY="$BACKEND/venv/bin/python"           # macOS / Linux
fi
if [ ! -f "$BACKEND/venv/.deps-ok" ] || [ "$BACKEND/requirements.txt" -nt "$BACKEND/venv/.deps-ok" ]; then
  echo "→ Instalando dependencias del backend…"
  "$VPY" -m pip install -q -r "$BACKEND/requirements.txt"
  touch "$BACKEND/venv/.deps-ok"
fi

if [ ! -f "$BACKEND/.env" ]; then
  cp "$BACKEND/.env.example" "$BACKEND/.env"
  echo "⚠ Creé backend/.env a partir de .env.example: completá DATABASE_URL y JWT_SECRET y volvé a correr."
  exit 1
fi

# ---------- Arrancar los dos y cerrarlos juntos
PIDS=()
cleanup() {
  echo
  echo "→ Cerrando…"
  for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null || true; done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "→ Backend en http://localhost:8000 (docs en /docs)"
(cd "$BACKEND" && exec "$VPY" -m src.main) &
PIDS+=($!)

echo "→ Frontend en http://localhost:5173 (y la IP de tu red), contra el backend vía /api"
(cd "$FRONTEND" && VITE_USE_MOCK=false VITE_API_URL=/api BACKEND_URL=http://localhost:8000 exec bun run dev) &
PIDS+=($!)

# Si uno de los dos se cae, cerramos todo.
wait -n
