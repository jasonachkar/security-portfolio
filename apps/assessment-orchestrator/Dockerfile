FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates nmap \
    && rm -rf /var/lib/apt/lists/*

COPY apps/assessment-orchestrator/pyproject.toml /app/pyproject.toml
COPY apps/assessment-orchestrator/src /app/src
RUN pip install --no-cache-dir -U pip && pip install --no-cache-dir -e ".[dev]"
COPY apps/assessment-orchestrator/alembic.ini /app/alembic.ini
COPY apps/assessment-orchestrator/alembic /app/alembic
COPY apps/assessment-orchestrator/scripts /app/scripts

EXPOSE 8082

CMD ["uvicorn", "security_assessment_orchestrator.api.main:app", "--host", "0.0.0.0", "--port", "8082"]
