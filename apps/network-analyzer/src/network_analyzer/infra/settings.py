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

    database_url: str = "sqlite:///./network_analyzer.db"

    # Optional
    redis_url: str | None = None
    capture_interface: str = 'any'
    capture_bpf: str = ''
    cloud_demo_mode: bool = False

    def allowed_targets_list(self) -> list[str]:
        return [t.strip() for t in self.allowed_targets.split(",") if t.strip()]
