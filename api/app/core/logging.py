"""
BeBrahma v0.3 API - Logging Configuration

Structured JSON logging with Sentry integration.
"""

import logging
import sys
from pythonjsonlogger import jsonlogger

from app.core.config import settings

logger = logging.getLogger("bebrahma")


def setup_logging():
    """Setup structured JSON logging."""

    # Create logger
    logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))

    # JSON formatter
    formatter = jsonlogger.JsonFormatter(
        "%(asctime)s %(name)s %(levelname)s %(message)s",
        rename_fields={"asctime": "timestamp", "levelname": "level"}
    )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # Sentry integration (production only)
    if settings.SENTRY_DSN and settings.is_production:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENV,
            integrations=[
                FastApiIntegration(),
                SqlalchemyIntegration(),
            ],
            traces_sample_rate=0.1,  # 10% of transactions
        )

        logger.info("Sentry integration enabled")

    logger.info(f"Logging configured at {settings.LOG_LEVEL} level")
