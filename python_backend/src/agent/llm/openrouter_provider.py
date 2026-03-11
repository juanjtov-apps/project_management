"""
OpenRouter LLM Provider implementation.
Supports Gemini, Claude, GPT-4, and other models via OpenRouter API.
"""

import json
import logging
from typing import AsyncIterator, Dict, Any, List, Optional

import httpx

from .provider_base import LLMProviderBase
from src.core.config import settings

logger = logging.getLogger(__name__)


class OpenRouterProvider(LLMProviderBase):
    """OpenRouter API provider for LLM completions."""

    BASE_URL = "https://openrouter.ai/api/v1"

    def __init__(
        self,
        api_key: Optional[str] = None,
        standard_model: Optional[str] = None,
        complex_model: Optional[str] = None,
    ):
        """Initialize the OpenRouter provider.

        Args:
            api_key: OpenRouter API key. Defaults to settings.
            standard_model: Model for standard queries. Defaults to settings.
            complex_model: Model for complex analysis. Defaults to settings.
        """
        self.api_key = api_key or settings.openrouter_api_key
        self._standard_model = standard_model or settings.openrouter_model_standard
        self._complex_model = complex_model or settings.openrouter_model_complex

        if not self.api_key:
            raise ValueError(
                "OpenRouter API key is required. "
                "Set OPENROUTER_API_KEY environment variable."
            )

    @property
    def provider_name(self) -> str:
        return "openrouter"

    @property
    def default_model(self) -> str:
        return self._standard_model

    @property
    def complex_model(self) -> str:
        return self._complex_model

    def _get_headers(self) -> Dict[str, str]:
        """Get headers for OpenRouter API requests."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://proesphere.com",
            "X-Title": "Proesphere AI Agent",
        }

    def _format_tools_for_api(
        self, tools: Optional[List[Dict[str, Any]]]
    ) -> Optional[List[Dict[str, Any]]]:
        """Format tools for OpenRouter/OpenAI API format."""
        if not tools:
            return None

        formatted_tools = []
        for tool in tools:
            formatted_tools.append({
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool["description"],
                    "parameters": tool.get("input_schema", {
                        "type": "object",
                        "properties": {},
                        "required": []
                    })
                }
            })
        return formatted_tools

    async def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        model: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
        stream: bool = True
    ) -> AsyncIterator[Dict[str, Any]]:
        """Generate a streaming chat completion."""
        model = model or self._standard_model
        formatted_tools = self._format_tools_for_api(tools)

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream,
        }

        if formatted_tools:
            payload["tools"] = formatted_tools
            payload["tool_choice"] = "auto"

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.BASE_URL}/chat/completions",
                headers=self._get_headers(),
                json=payload,
            ) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    logger.error(f"OpenRouter API error: {response.status_code} - {error_text}")
                    yield {
                        "type": "error",
                        "message": f"API error: {response.status_code}"
                    }
                    return

                # Accumulate tool calls across streaming chunks
                pending_tool_calls: Dict[int, Dict[str, Any]] = {}

                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue

                    data = line[6:]  # Remove "data: " prefix

                    if data == "[DONE]":
                        yield {"type": "stop", "reason": "end_turn"}
                        return

                    try:
                        chunk = json.loads(data)
                        choices = chunk.get("choices", [])

                        if not choices:
                            continue

                        delta = choices[0].get("delta", {})

                        # Handle content
                        if "content" in delta and delta["content"]:
                            yield {
                                "type": "content",
                                "content": delta["content"]
                            }

                        # Handle tool calls - accumulate across chunks
                        if "tool_calls" in delta:
                            for tool_call in delta["tool_calls"]:
                                idx = tool_call.get("index", 0)

                                if idx not in pending_tool_calls:
                                    pending_tool_calls[idx] = {
                                        "id": tool_call.get("id", ""),
                                        "name": "",
                                        "arguments": "",
                                    }

                                if "function" in tool_call:
                                    func = tool_call["function"]
                                    if "name" in func:
                                        pending_tool_calls[idx]["name"] = func["name"]
                                    if "arguments" in func:
                                        pending_tool_calls[idx]["arguments"] += func["arguments"]

                                # Update id if present in later chunks
                                if "id" in tool_call and tool_call["id"]:
                                    pending_tool_calls[idx]["id"] = tool_call["id"]

                        # Check for finish reason - emit accumulated tool calls
                        finish_reason = choices[0].get("finish_reason")
                        if finish_reason:
                            for idx in sorted(pending_tool_calls.keys()):
                                tc = pending_tool_calls[idx]
                                if tc["name"]:
                                    args = {}
                                    if tc["arguments"]:
                                        try:
                                            args = json.loads(tc["arguments"])
                                        except json.JSONDecodeError:
                                            args = {"raw": tc["arguments"]}

                                    yield {
                                        "type": "tool_use",
                                        "id": tc["id"],
                                        "name": tc["name"],
                                        "input": args,
                                    }
                            pending_tool_calls.clear()

                            yield {"type": "stop", "reason": finish_reason}

                    except json.JSONDecodeError as e:
                        logger.warning(f"Failed to parse SSE chunk: {data} - {e}")
                        continue

    async def chat_completion_sync(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        model: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
        timeout: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Generate a non-streaming chat completion."""
        model = model or self._standard_model
        formatted_tools = self._format_tools_for_api(tools)

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }

        if formatted_tools:
            payload["tools"] = formatted_tools
            payload["tool_choice"] = "auto"

        async with httpx.AsyncClient(timeout=timeout or 120.0) as client:
            response = await client.post(
                f"{self.BASE_URL}/chat/completions",
                headers=self._get_headers(),
                json=payload,
            )

            if response.status_code != 200:
                logger.error(f"OpenRouter API error: {response.status_code} - {response.text}")
                raise Exception(f"OpenRouter API error: {response.status_code}")

            data = response.json()
            choice = data.get("choices", [{}])[0]
            message = choice.get("message", {})

            # Parse tool calls if present
            tool_calls = None
            if "tool_calls" in message:
                tool_calls = []
                for tc in message["tool_calls"]:
                    func = tc.get("function", {})
                    args = {}
                    if "arguments" in func:
                        try:
                            args = json.loads(func["arguments"])
                        except json.JSONDecodeError:
                            args = {"raw": func["arguments"]}

                    tool_calls.append({
                        "id": tc.get("id", ""),
                        "name": func.get("name", ""),
                        "input": args
                    })

            return {
                "content": message.get("content", ""),
                "tool_calls": tool_calls,
                "usage": data.get("usage", {}),
                "model": data.get("model", model),
            }
