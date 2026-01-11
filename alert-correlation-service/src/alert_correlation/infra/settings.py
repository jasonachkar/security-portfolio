"""Settings for Alert Correlation Service."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/alert_correlation_db"

    # Redis
    redis_url: str = "redis://localhost:6379/3"

    # App
    app_env: str = "local"
    log_level: str = "INFO"
    allowed_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost"

    # JWT
    jwt_secret: str = "dev-jwt-secret-change-in-production"

    def allowed_origins_list(self) -> list[str]:
        """Get allowed origins as a list."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]
