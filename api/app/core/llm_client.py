"""
BeBrahma v0.3 - LLM Client

Wrapper for Claude (Anthropic) and GPT (OpenAI) APIs with caching.

Traceability:
- FR-005: Rationale generation
- NFR-004: Cost optimization via tiered LLM strategy
"""

import hashlib
import json
from typing import Optional, Dict
from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.redis_client import redis_client
from app.core.logging import logger


class LLMClient:
    """
    Multi-tier LLM client with caching.

    Tiers:
    - Classification: GPT-3.5 Turbo (cheap, fast)
    - Reasoning: Claude Sonnet (balanced)
    - Complex: Claude Opus (best quality)
    """

    def __init__(self):
        self.anthropic = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def generate(
        self,
        prompt: str,
        max_tokens: int = 1000,
        temperature: float = 0.3,
        model: Optional[str] = None,
        cache_ttl_seconds: Optional[int] = None,
        system_prompt: Optional[str] = None
    ) -> str:
        """
        Generate text using appropriate LLM tier.

        Args:
            prompt: Input prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0-1.0)
            model: Override model selection (classification, reasoning, complex)
            cache_ttl_seconds: Cache TTL (None = use default 5 min)
            system_prompt: Optional system prompt

        Returns:
            Generated text
        """
        # Determine model tier
        if model is None:
            model = 'reasoning'  # Default to Claude Sonnet

        # Check cache first
        cache_key = self._get_cache_key(prompt, model, system_prompt)
        cached_response = await redis_client.get(cache_key)

        if cached_response:
            logger.debug(f"LLM cache hit for model={model}")
            return cached_response

        # Generate response
        if model == 'classification':
            response = await self._generate_openai(
                prompt=prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                system_prompt=system_prompt
            )
        elif model in ['reasoning', 'complex']:
            response = await self._generate_anthropic(
                prompt=prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                model=model,
                system_prompt=system_prompt
            )
        else:
            raise ValueError(f"Unknown model tier: {model}")

        # Cache response
        ttl = cache_ttl_seconds or settings.REDIS_CACHE_TTL_SECONDS
        await redis_client.set(cache_key, response, ttl_seconds=ttl)

        logger.info(f"LLM generation complete: model={model}, tokens≈{len(response)//4}")

        return response

    async def _generate_openai(
        self,
        prompt: str,
        max_tokens: int,
        temperature: float,
        system_prompt: Optional[str] = None
    ) -> str:
        """Generate using OpenAI GPT (classification tier)."""
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": prompt})

        try:
            response = await self.openai.chat.completions.create(
                model=settings.LLM_TIER_CLASSIFICATION,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                timeout=settings.LLM_TIMEOUT_SECONDS
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}", exc_info=True)
            raise

    async def _generate_anthropic(
        self,
        prompt: str,
        max_tokens: int,
        temperature: float,
        model: str,
        system_prompt: Optional[str] = None
    ) -> str:
        """Generate using Anthropic Claude (reasoning/complex tiers)."""
        # Map tier to actual model
        if model == 'reasoning':
            model_id = settings.LLM_TIER_REASONING
        elif model == 'complex':
            model_id = settings.LLM_TIER_COMPLEX
        else:
            model_id = settings.LLM_TIER_REASONING

        try:
            response = await self.anthropic.messages.create(
                model=model_id,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt or "",
                messages=[
                    {"role": "user", "content": prompt}
                ],
                timeout=settings.LLM_TIMEOUT_SECONDS
            )

            return response.content[0].text.strip()

        except Exception as e:
            logger.error(f"Anthropic API error: {str(e)}", exc_info=True)
            raise

    def _get_cache_key(
        self,
        prompt: str,
        model: str,
        system_prompt: Optional[str] = None
    ) -> str:
        """Generate cache key from prompt hash."""
        content = f"{model}:{system_prompt or ''}:{prompt}"
        prompt_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
        return redis_client.cache_key_llm_response(prompt_hash)


# Global LLM client instance
llm_client = LLMClient()
