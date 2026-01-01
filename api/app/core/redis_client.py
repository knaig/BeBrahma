"""
BeBrahma v0.3 API - Redis Client

Redis client for caching user context and LLM responses.
"""

from redis.asyncio import Redis, from_url
from typing import Optional
import json

from app.core.config import settings
from app.core.logging import logger


class RedisClient:
    """Async Redis client wrapper with caching utilities."""

    def __init__(self):
        self.redis: Optional[Redis] = None

    async def connect(self):
        """Initialize Redis connection."""
        if not self.redis:
            self.redis = from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            logger.info("Redis client initialized")

    async def ping(self):
        """Test Redis connection."""
        if not self.redis:
            await self.connect()
        await self.redis.ping()

    async def close(self):
        """Close Redis connection."""
        if self.redis:
            await self.redis.close()
            logger.info("Redis connection closed")

    async def get(self, key: str) -> Optional[str]:
        """Get value from Redis."""
        if not self.redis:
            await self.connect()
        return await self.redis.get(key)

    async def set(
        self,
        key: str,
        value: str,
        ttl_seconds: Optional[int] = None
    ):
        """Set value in Redis with optional TTL."""
        if not self.redis:
            await self.connect()

        ttl = ttl_seconds or settings.REDIS_CACHE_TTL_SECONDS
        await self.redis.setex(key, ttl, value)

    async def get_json(self, key: str) -> Optional[dict]:
        """Get JSON value from Redis."""
        value = await self.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                logger.warning(f"Failed to decode JSON from Redis key: {key}")
                return None
        return None

    async def set_json(
        self,
        key: str,
        value: dict,
        ttl_seconds: Optional[int] = None
    ):
        """Set JSON value in Redis."""
        json_str = json.dumps(value)
        await self.set(key, json_str, ttl_seconds)

    async def delete(self, key: str):
        """Delete key from Redis."""
        if not self.redis:
            await self.connect()
        await self.redis.delete(key)

    async def exists(self, key: str) -> bool:
        """Check if key exists in Redis."""
        if not self.redis:
            await self.connect()
        return await self.redis.exists(key) > 0

    def cache_key_user_context(self, user_id: str) -> str:
        """Generate cache key for user context."""
        return f"context:user:{user_id}"

    def cache_key_nba_session(self, session_id: str) -> str:
        """Generate cache key for NBA session."""
        return f"nba:session:{session_id}"

    def cache_key_llm_response(self, prompt_hash: str) -> str:
        """Generate cache key for LLM response."""
        return f"llm:response:{prompt_hash}"


# Global Redis client instance
redis_client = RedisClient()
