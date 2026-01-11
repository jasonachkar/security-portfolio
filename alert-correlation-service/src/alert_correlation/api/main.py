"""Main FastAPI application for Alert Correlation Service."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from shared_security_core.logging import configure_logging, get_logger
from shared_security_core.models import HealthResponse

from alert_correlation.infra.settings import Settings
from alert_correlation.api.routes import alerts, incidents

settings = Settings()
configure_logging("alert-correlation-service", settings.log_level)
log = get_logger(__name__)

app = FastAPI(
    title="Alert Correlation Service",
    description="Alert ingestion, correlation, and incident management",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(alerts.router, prefix="/api")
app.include_router(incidents.router, prefix="/api")

@app.get("/api/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="healthy", service="alert-correlation-service", version="0.1.0")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8085)
