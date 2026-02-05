"""
Factory for creating LLM provider instances.
"""

from typing import Optional
import logging

from .provider_base import LLMProviderBase
from .openrouter_provider import OpenRouterProvider
from src.core.config import settings

logger = logging.getLogger(__name__)


def get_llm_provider(provider_name: Optional[str] = None) -> LLMProviderBase:
    """Factory function to get configured LLM provider.

    Args:
        provider_name: Name of provider to use. Defaults to settings.agent_llm_provider.
            Supported values: "openrouter", "anthropic"

    Returns:
        Configured LLM provider instance.

    Raises:
        ValueError: If provider is unknown or not configured.
    """
    provider = provider_name or settings.agent_llm_provider

    if provider == "openrouter":
        if not settings.openrouter_api_key:
            raise ValueError(
                "OpenRouter API key not configured. "
                "Set OPENROUTER_API_KEY environment variable."
            )
        logger.info(
            f"Initializing OpenRouter provider with models: "
            f"standard={settings.openrouter_model_standard}, "
            f"complex={settings.openrouter_model_complex}"
        )
        return OpenRouterProvider()

    elif provider == "anthropic":
        # Anthropic provider can be added later
        if not settings.anthropic_api_key:
            raise ValueError(
                "Anthropic API key not configured. "
                "Set ANTHROPIC_API_KEY environment variable."
            )
        # TODO: Implement AnthropicProvider
        raise NotImplementedError(
            "Anthropic provider not yet implemented. "
            "Use 'openrouter' provider with Claude models instead."
        )

    else:
        raise ValueError(
            f"Unknown LLM provider: {provider}. "
            f"Supported providers: openrouter, anthropic"
        )


# Cached provider instance
_provider_instance: Optional[LLMProviderBase] = None


def get_cached_llm_provider() -> LLMProviderBase:
    """Get or create a cached LLM provider instance.

    Returns:
        Cached LLM provider instance.
    """
    global _provider_instance

    if _provider_instance is None:
        _provider_instance = get_llm_provider()

    return _provider_instance


def reset_provider_cache():
    """Reset the cached provider instance.

    Useful for testing or when settings change.
    """
    global _provider_instance
    _provider_instance = None
