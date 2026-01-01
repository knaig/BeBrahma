"""
BeBrahma v0.3 API - Configuration

Pydantic settings management for environment variables.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Environment
    ENV: str = "development"

    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 3001
    API_WORKERS: int = 4

    # Database
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL_SECONDS: int = 300

    # Clerk Authentication
    CLERK_PUBLISHABLE_KEY: str
    CLERK_SECRET_KEY: str
    CLERK_JWT_VERIFICATION_KEY_URL: str = "https://clerk.com/.well-known/jwks.json"

    # LLM APIs
    ANTHROPIC_API_KEY: str
    OPENAI_API_KEY: str

    # LLM Configuration
    LLM_TIER_CLASSIFICATION: str = "gpt-3.5-turbo"
    LLM_TIER_REASONING: str = "claude-sonnet-4-20250514"
    LLM_TIER_COMPLEX: str = "claude-opus-4-5-20251101"
    LLM_MAX_RETRIES: int = 3
    LLM_TIMEOUT_SECONDS: int = 10

    # NBA Engine
    NBA_COMPUTATION_TIMEOUT_SECONDS: int = 3
    NBA_MAX_CANDIDATES_PER_FRAMEWORK: int = 20
    NBA_CONFIDENCE_CALCULATION_TOP_N: int = 10

    # Monitoring
    SENTRY_DSN: str = ""
    LOG_LEVEL: str = "INFO"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def is_production(self) -> bool:
        return self.ENV == "production"

    @property
    def is_development(self) -> bool:
        return self.ENV == "development"


settings = Settings()
