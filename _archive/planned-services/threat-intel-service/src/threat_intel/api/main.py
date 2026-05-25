"""Main FastAPI application for Threat Intel Service."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from shared_security_core.logging import configure_logging, get_logger
from shared_security_core.models import HealthResponse

from threat_intel.infra.settings import Settings
from threat_intel.api.routes import cve, mitre, indicators, enrichment

settings = Settings()
configure_logging("threat-intel-service", settings.log_level)
log = get_logger(__name__)

app = FastAPI(
    title="Threat Intelligence Service",
    description="CVE enrichment, MITRE ATT&CK mapping, and IOC tracking",
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
app.include_router(cve.router, prefix="/api/intel")
app.include_router(mitre.router, prefix="/api/intel")
app.include_router(indicators.router, prefix="/api/intel")
app.include_router(enrichment.router, prefix="/api/intel")

@app.get("/api/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="healthy", service="threat-intel-service", version="0.1.0")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8084)
