#!/usr/bin/env bash
set -euo pipefail

echo "Running alembic upgrade head..."
alembic upgrade head

PORT_TO_USE="${PORT:-7860}"
echo "Starting server on port ${PORT_TO_USE}"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT_TO_USE}"
