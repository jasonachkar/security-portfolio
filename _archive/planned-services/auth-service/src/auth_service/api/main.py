"""Main FastAPI application for Auth Service."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from shared_security_core.logging import configure_logging, get_logger

from auth_service.api.routes import health, auth, users, roles, audit
from auth_service.infra.settings import Settings

# Configure logging
settings = Settings()
configure_logging("auth-service", settings.log_level)
log = get_logger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Auth Service",
    description="Authentication and authorization service for security platform",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(roles.router, prefix="/api")
app.include_router(audit.router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    """Startup event handler"""
    log.info("auth_service_starting", version="0.1.0")


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler"""
    log.info("auth_service_stopping")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8083)
