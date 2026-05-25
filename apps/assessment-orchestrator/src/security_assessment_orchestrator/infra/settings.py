from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "local"
    log_level: str = "INFO"

    auth_token: str = "change-me"
    jwt_secret: str = "local-only-gateway-secret"
    allowed_targets: str = "localhost,127.0.0.1"

    database_url: str = "sqlite:///./assessment_orchestrator.db"

    # Optional
    redis_url: str | None = "memory://"
    zap_base_url: str = 'http://zap:8090'
    cloud_demo_mode: bool = False
    enable_nmap: bool = True
    enable_zap: bool = True
    enable_trivy: bool = False
    trivy_image: str = "alpine:3.20"
    subprocess_timeout_seconds: int = 120
    celery_task_always_eager: bool = False

    def allowed_targets_list(self) -> list[str]:
        return [t.strip() for t in self.allowed_targets.split(",") if t.strip()]
