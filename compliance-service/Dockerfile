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
COPY compliance-service/pyproject.toml /app/
COPY compliance-service/src /app/src
COPY compliance-service/alembic /app/alembic
COPY compliance-service/alembic.ini /app/

# Install dependencies
RUN pip install --no-cache-dir -e .

# Create reports directory
RUN mkdir -p /app/reports

# Run migrations and start server
CMD alembic upgrade head && \
    uvicorn compliance.api.main:app --host 0.0.0.0 --port 8086
