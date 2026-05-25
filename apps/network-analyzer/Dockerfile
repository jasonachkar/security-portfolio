FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates tshark \
    && rm -rf /var/lib/apt/lists/*

COPY apps/network-analyzer/pyproject.toml /app/pyproject.toml
COPY apps/network-analyzer/src /app/src
RUN pip install --no-cache-dir -U pip && pip install --no-cache-dir -e ".[dev]"
COPY apps/network-analyzer/alembic.ini /app/alembic.ini
COPY apps/network-analyzer/alembic /app/alembic
COPY apps/network-analyzer/scripts /app/scripts

EXPOSE 8081

CMD ["uvicorn", "network_analyzer.api.main:app", "--host", "0.0.0.0", "--port", "8081"]
