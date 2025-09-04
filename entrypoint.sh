#!/usr/bin/env sh
set -eu

PORT="${PORT:-7860}"

cd /app
echo "Starting Uvicorn on 0.0.0.0:${PORT}"
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
