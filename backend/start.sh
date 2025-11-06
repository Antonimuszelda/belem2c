#!/bin/sh
set -e

PORT=${PORT:-8000}

exec gunicorn app.main:app \
    --bind "0.0.0.0:$PORT" \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
