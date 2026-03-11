"""
Abstract base class for LLM providers.
"""

from abc import ABC, abstractmethod
from typing import AsyncIterator, Dict, Any, List, Optional


class LLMProviderBase(ABC):
    """Abstract base class for LLM providers (OpenRouter, Anthropic, OpenAI, etc.)."""

    @abstractmethod
    async def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        model: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
        stream: bool = True
    ) -> AsyncIterator[Dict[str, Any]]:
        """Generate a chat completion with optional tool use.

        Args:
            messages: List of conversation messages with role and content.
            tools: Optional list of tool definitions in LLM-compatible format.
            model: Optional model override (uses default if not specified).
            temperature: Sampling temperature (0.0 to 1.0).
            max_tokens: Maximum tokens in response.
            stream: Whether to stream the response.

        Yields:
            Dict with type and data:
            - {"type": "content", "content": "..."} for text chunks
            - {"type": "tool_use", "name": "...", "input": {...}} for tool calls
            - {"type": "stop", "reason": "..."} when complete
        """
        pass

    @abstractmethod
    async def chat_completion_sync(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        model: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
        timeout: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Generate a chat completion without streaming.

        Args:
            messages: List of conversation messages.
            tools: Optional list of tool definitions.
            model: Optional model override.
            temperature: Sampling temperature.
            max_tokens: Maximum tokens in response.
            timeout: Optional timeout in seconds. Defaults to provider default.

        Returns:
            Dict with:
            - content: str - The text response
            - tool_calls: Optional[List] - Any tool calls requested
            - usage: Dict - Token usage information
            - model: str - Model used
        """
        pass

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the provider name (e.g., 'openrouter', 'anthropic')."""
        pass

    @property
    @abstractmethod
    def default_model(self) -> str:
        """Return the default model for this provider."""
        pass

    @property
    @abstractmethod
    def complex_model(self) -> str:
        """Return the complex/capable model for this provider."""
        pass
