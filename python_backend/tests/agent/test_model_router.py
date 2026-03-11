"""Tests for the 3-tier model router with gatekeeper classification."""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock

from src.agent.llm.model_router import (
    ModelRouter,
    RoutingTier,
    GatekeeperClassification,
    GATEKEEPER_SYSTEM_PROMPT,
)


def _mock_gatekeeper_response(tier: str, intent: str, entities: dict = None, confidence: float = 0.9):
    """Helper to create a mock gatekeeper LLM response."""
    payload = {
        "tier": tier,
        "intent": intent,
        "entities": entities or {},
        "confidence": confidence,
    }
    return {
        "content": json.dumps(payload),
        "tool_calls": None,
        "usage": {"prompt_tokens": 50, "completion_tokens": 30},
        "model": "google/gemini-2.0-flash-001",
    }


@pytest.fixture
def router():
    """Create a ModelRouter with explicit test models."""
    return ModelRouter(
        gatekeeper_model="google/gemini-2.0-flash-001",
        specialist_model="openai/gpt-4o-mini",
        planner_model="anthropic/claude-sonnet-4",
        standard_model="openai/gpt-4o-mini",
        complex_model="anthropic/claude-sonnet-4",
    )


@pytest.fixture
def mock_provider():
    """Create a mock LLM provider."""
    provider = AsyncMock()
    return provider


# =============================================================================
# Routing tests — verify correct tier selection for different prompts
# =============================================================================


class TestGatekeeperRouting:
    """Test that different prompt types route to the correct tier."""

    @pytest.mark.asyncio
    async def test_simple_status_query_routes_to_specialist(self, router, mock_provider):
        """Simple status lookup should route to specialist."""
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="specialist", intent="project_status", entities={"project": "Cole Dr"}
        )

        model, classification = await router.classify_and_select_model(
            message="What is the status of Cole Dr?",
            llm_provider=mock_provider,
        )

        assert classification.tier == RoutingTier.SPECIALIST
        assert classification.intent == "project_status"
        assert classification.entities.get("project") == "Cole Dr"
        assert "gpt-4o-mini" in model

    @pytest.mark.asyncio
    async def test_create_task_routes_to_specialist(self, router, mock_provider):
        """Single entity creation should route to specialist."""
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="specialist", intent="create_task",
            entities={"project": "Via Tesoro", "entity_type": "task"},
        )

        model, classification = await router.classify_and_select_model(
            message="Create a task for the Via Tesoro project",
            llm_provider=mock_provider,
        )

        assert classification.tier == RoutingTier.SPECIALIST
        assert "gpt-4o-mini" in model

    @pytest.mark.asyncio
    async def test_payment_update_routes_to_specialist(self, router, mock_provider):
        """Simple payment update should route to specialist."""
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="specialist", intent="update_payment",
            entities={"entity_type": "payment"},
        )

        model, classification = await router.classify_and_select_model(
            message="Mark the foundation payment as paid",
            llm_provider=mock_provider,
        )

        assert classification.tier == RoutingTier.SPECIALIST
        assert "gpt-4o-mini" in model

    @pytest.mark.asyncio
    async def test_budget_reallocation_routes_to_planner(self, router, mock_provider):
        """Complex budget reallocation should route to planner."""
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="planner", intent="budget_reallocation",
            entities={"project": "San Jerome"},
        )

        model, classification = await router.classify_and_select_model(
            message="Re-allocate the budget for the foundation phase",
            llm_provider=mock_provider,
        )

        assert classification.tier == RoutingTier.PLANNER
        assert classification.intent == "budget_reallocation"
        assert "claude-sonnet" in model

    @pytest.mark.asyncio
    async def test_stage_planning_routes_to_planner(self, router, mock_provider):
        """Stage setup/planning should route to planner."""
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="planner", intent="stage_planning",
            entities={"project": "Cole Dr", "entity_type": "stage"},
        )

        model, classification = await router.classify_and_select_model(
            message="Set up stages for a kitchen remodel on Cole Dr",
            llm_provider=mock_provider,
        )

        assert classification.tier == RoutingTier.PLANNER
        assert "claude-sonnet" in model

    @pytest.mark.asyncio
    async def test_report_generation_routes_to_planner(self, router, mock_provider):
        """Report generation should route to planner."""
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="planner", intent="generate_report", entities={},
        )

        model, classification = await router.classify_and_select_model(
            message="Generate a progress report for all active projects",
            llm_provider=mock_provider,
        )

        assert classification.tier == RoutingTier.PLANNER
        assert "claude-sonnet" in model


# =============================================================================
# Fallback tests — verify graceful degradation
# =============================================================================


class TestGatekeeperFallback:
    """Test that failures fall back to specialist tier."""

    @pytest.mark.asyncio
    async def test_api_error_falls_back_to_specialist(self, router, mock_provider):
        """API errors should fall back to specialist."""
        mock_provider.chat_completion_sync.side_effect = Exception("API error: 500")

        model, classification = await router.classify_and_select_model(
            message="What tasks are overdue?",
            llm_provider=mock_provider,
        )

        assert classification.tier == RoutingTier.SPECIALIST
        assert classification.intent == "fallback"
        assert "gpt-4o-mini" in model

    @pytest.mark.asyncio
    async def test_malformed_json_falls_back_to_specialist(self, router, mock_provider):
        """Malformed JSON should fall back to specialist."""
        mock_provider.chat_completion_sync.return_value = {
            "content": "This is not JSON at all!",
            "tool_calls": None,
            "usage": {},
            "model": "google/gemini-2.0-flash-001",
        }

        model, classification = await router.classify_and_select_model(
            message="What tasks are overdue?",
            llm_provider=mock_provider,
        )

        assert classification.tier == RoutingTier.SPECIALIST
        assert classification.intent == "fallback"
        assert "gpt-4o-mini" in model

    @pytest.mark.asyncio
    async def test_empty_response_falls_back_to_specialist(self, router, mock_provider):
        """Empty gatekeeper response should fall back to specialist."""
        mock_provider.chat_completion_sync.return_value = {
            "content": "",
            "tool_calls": None,
            "usage": {},
            "model": "google/gemini-2.0-flash-001",
        }

        model, classification = await router.classify_and_select_model(
            message="What tasks are overdue?",
            llm_provider=mock_provider,
        )

        assert classification.tier == RoutingTier.SPECIALIST
        assert classification.intent == "fallback"

    @pytest.mark.asyncio
    async def test_markdown_wrapped_json_is_parsed(self, router, mock_provider):
        """Gatekeeper response wrapped in markdown fences should be parsed correctly."""
        mock_provider.chat_completion_sync.return_value = {
            "content": '```json\n{"tier": "planner", "intent": "stage_planning", "entities": {}, "confidence": 0.8}\n```',
            "tool_calls": None,
            "usage": {},
            "model": "google/gemini-2.0-flash-001",
        }

        model, classification = await router.classify_and_select_model(
            message="Set up all stages for the project",
            llm_provider=mock_provider,
        )

        assert classification.tier == RoutingTier.PLANNER
        assert classification.intent == "stage_planning"

    @pytest.mark.asyncio
    async def test_unknown_tier_defaults_to_specialist(self, router, mock_provider):
        """Unknown tier value should default to specialist."""
        mock_provider.chat_completion_sync.return_value = {
            "content": '{"tier": "unknown_tier", "intent": "something", "entities": {}, "confidence": 0.5}',
            "tool_calls": None,
            "usage": {},
            "model": "google/gemini-2.0-flash-001",
        }

        model, classification = await router.classify_and_select_model(
            message="Do something",
            llm_provider=mock_provider,
        )

        assert classification.tier == RoutingTier.SPECIALIST


# =============================================================================
# Model selection tests
# =============================================================================


class TestModelSelection:
    """Test model ID and parameter selection per tier."""

    def test_specialist_tier_returns_correct_model(self, router):
        assert router._model_for_tier(RoutingTier.SPECIALIST) == "openai/gpt-4o-mini"

    def test_planner_tier_returns_correct_model(self, router):
        assert router._model_for_tier(RoutingTier.PLANNER) == "anthropic/claude-sonnet-4"

    def test_planner_tier_gets_higher_max_tokens(self, router):
        assert router.get_max_tokens(tier=RoutingTier.PLANNER) == 8192

    def test_specialist_tier_gets_standard_max_tokens(self, router):
        assert router.get_max_tokens(tier=RoutingTier.SPECIALIST) == 4096

    def test_default_temperature_is_factual(self, router):
        assert router.get_temperature() == 0.3

    def test_no_tier_defaults_to_standard_tokens(self, router):
        assert router.get_max_tokens() == 4096


# =============================================================================
# Legacy backward compatibility tests
# =============================================================================


class TestLegacyBackwardCompatibility:
    """Test that the legacy heuristic select_model still works."""

    def test_legacy_select_model_defaults_to_standard(self, router):
        model = router.select_model()
        assert model == "openai/gpt-4o-mini"

    def test_legacy_complex_intent_routes_to_complex(self, router):
        model = router.select_model(intent="margin_risk")
        assert model == "anthropic/claude-sonnet-4"

    def test_legacy_many_tools_routes_to_complex(self, router):
        model = router.select_model(tool_calls=["tool1", "tool2", "tool3"])
        assert model == "anthropic/claude-sonnet-4"

    def test_legacy_long_context_routes_to_complex(self, router):
        model = router.select_model(message_length=60000)
        assert model == "anthropic/claude-sonnet-4"


# =============================================================================
# Gatekeeper call verification
# =============================================================================


class TestGatekeeperCall:
    """Test that the gatekeeper is called with correct parameters."""

    @pytest.mark.asyncio
    async def test_gatekeeper_called_with_correct_model(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="specialist", intent="list_tasks",
        )

        await router.classify_and_select_model(
            message="Show me all tasks",
            llm_provider=mock_provider,
        )

        call_kwargs = mock_provider.chat_completion_sync.call_args.kwargs
        assert call_kwargs["model"] == "google/gemini-2.0-flash-001"
        assert call_kwargs["temperature"] == 0.0
        assert call_kwargs["max_tokens"] == 150

    @pytest.mark.asyncio
    async def test_gatekeeper_sends_system_prompt(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="specialist", intent="list_tasks",
        )

        await router.classify_and_select_model(
            message="Show me all tasks",
            llm_provider=mock_provider,
        )

        call_kwargs = mock_provider.chat_completion_sync.call_args.kwargs
        messages = call_kwargs["messages"]
        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert "classifier" in messages[0]["content"].lower()
        assert messages[1]["role"] == "user"
        assert messages[1]["content"] == "Show me all tasks"
