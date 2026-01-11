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
COPY threat-intel-service/pyproject.toml /app/
COPY threat-intel-service/src /app/src
COPY threat-intel-service/alembic /app/alembic
COPY threat-intel-service/alembic.ini /app/

# Install build dependencies and application
RUN pip install --no-cache-dir hatchling && \
    pip install --no-cache-dir -e .

# Run migrations and start server
CMD alembic upgrade head && \
    uvicorn threat_intel.api.main:app --host 0.0.0.0 --port 8084
