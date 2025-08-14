#!/usr/bin/env bash
set -e

# show the DB host (redacts password automatically in our echo)
echo "Running alembic upgrade head..."
alembic upgrade head || { echo "Alembic failed"; exit 1; }

# start app (use the port Spaces injects)
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}
