from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    # Application
    app_name: str = "ICEPac API"
    debug: bool = False
    allowed_origins: str = "http://localhost:3000,http://localhost:8000"

    # Database
    database_url: str = "postgresql://icepac:icepac_dev_password@localhost:5432/icepac"

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    redis_cache_ttl: int = 3600  # 1 hour default

    # AWS
    aws_region: str = "us-east-1"
    s3_bucket_name: str = "icepac-uploads"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""

    # File Upload
    max_upload_size_mb: int = 100
    allowed_file_types: List[str] = ["mpp", "mpx", "xml"]

    # MPXJ/JPype
    jpype_jvm_path: str = ""  # Auto-detect if empty
    mpxj_jar_path: str = ""  # Auto-detect if empty

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
    )

    @property
    def cors_origins(self) -> List[str]:
        """Parse ALLOWED_ORIGINS into list"""
        return [origin.strip() for origin in self.allowed_origins.split(",")]


# Global settings instance
settings = Settings()
