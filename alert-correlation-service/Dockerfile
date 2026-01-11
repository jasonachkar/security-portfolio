FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy shared package first
COPY shared-security-core /app/shared-security-core

# Copy service files
COPY alert-correlation-service/pyproject.toml /app/
COPY alert-correlation-service/src /app/src
COPY alert-correlation-service/alembic /app/alembic
COPY alert-correlation-service/alembic.ini /app/

# Install dependencies
RUN pip install --no-cache-dir -e .

# Run migrations and start server
CMD alembic upgrade head && \
    uvicorn alert_correlation.api.main:app --host 0.0.0.0 --port 8085
