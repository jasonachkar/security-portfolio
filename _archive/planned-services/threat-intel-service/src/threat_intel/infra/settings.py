from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "local"
    log_level: str = "INFO"

    # Database
    database_url: str

    # Redis
    redis_url: str = "redis://localhost:6379/2"

    # NVD API Configuration
    nvd_api_key: str = ""  # Optional - rate limit is higher with API key
    nvd_api_url: str = "https://services.nvd.nist.gov/rest/json/cves/2.0"

    # MITRE ATT&CK
    mitre_github_url: str = "https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json"

    # Threat Feed URLs (free sources)
    alienvault_otx_url: str = "https://otx.alienvault.com/api/v1/pulses/subscribed"
    abuse_ch_url: str = "https://urlhaus-api.abuse.ch/v1/urls/recent/"

    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost"

    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]
