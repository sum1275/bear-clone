from pydantic_settings import BaseSettings
from pydantic import Field, ConfigDict
from typing import List, Optional

class Settings(BaseSettings):
    """
    Application configuration.
    Reads from .env file. All values are REQUIRED.

    Usage:
        from config import settings
        print(settings.db_type)
    """
    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        env_ignore_empty=True,
    )

    # Environment
    environment: str  # "development" or "production"

    # Database
    db_type: str  # "sqlite" or "postgres"
    db_path: Optional[str] = None  # SQLite: path to db file
    db_host: Optional[str] = None  # PostgreSQL: host
    db_port: Optional[int] = None  # PostgreSQL: port
    db_name: Optional[str] = None  # PostgreSQL: database name
    db_user: Optional[str] = None  # PostgreSQL: username
    db_password: Optional[str] = None  # PostgreSQL: password

    # API
    api_title: str
    api_version: str
    debug: bool
    log_level: str  # "DEBUG" or "ERROR"

    # CORS - hardcoded defaults, don't read from env
    cors_origins: List[str] = ["*"]

    # JWT
    jwt_secret: str
    jwt_algorithm: str
    jwt_expiration_hours: int

    @property
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.environment == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.environment == "development"

    @property
    def is_postgres(self) -> bool:
        """Check if using PostgreSQL"""
        return self.db_type.lower() == "postgres"

    @property
    def is_sqlite(self) -> bool:
        """Check if using SQLite"""
        return self.db_type.lower() == "sqlite"

    @property
    def postgres_url(self) -> str:
        """Get PostgreSQL connection URL"""
        return f"postgresql+asyncpg://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

# Create one instance - import this everywhere
settings = Settings()
