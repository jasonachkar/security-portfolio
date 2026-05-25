#!/usr/bin/env sh
set -eu

echo "Running migrations..."
alembic upgrade head

echo "Starting API..."
exec "$@"
