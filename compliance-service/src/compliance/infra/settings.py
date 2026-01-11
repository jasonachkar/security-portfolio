"""Settings for Compliance Service."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/compliance_db"

    # App
    app_env: str = "local"
    log_level: str = "INFO"
    allowed_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost"

    # JWT
    jwt_secret: str = "dev-jwt-secret-change-in-production"

    # Report storage
    report_storage_path: str = "/app/reports"

    def allowed_origins_list(self) -> list[str]:
        """Get allowed origins as a list."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]
