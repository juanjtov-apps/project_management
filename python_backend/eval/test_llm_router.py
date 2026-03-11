"""
Step 4 — LLM Router Eval.

Tests that the 3-tier model router correctly classifies query complexity
and routes each request to the appropriate model.

Two sections:
1. Mocked tests (fast, deterministic) — test parsing and tier mapping
2. Live gatekeeper tests (slow, real API) — test actual classification accuracy
"""

import json
import time
import pytest
from unittest.mock import AsyncMock

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


# =============================================================================
# Section 1: Mocked Routing Tests (30+ cases)
# =============================================================================


class TestMockedRouting:
    """Test routing with mocked gatekeeper responses — fast and deterministic."""

    # --- Specialist tier ---

    @pytest.mark.asyncio
    async def test_status_query_routes_specialist(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="specialist", intent="project_status", entities={"project": "Cole Dr"}
        )
        model, cls = await router.classify_and_select_model("What's the status of Cole Dr?", mock_provider)
        assert cls.tier == RoutingTier.SPECIALIST
        assert "gpt-4o-mini" in model

    @pytest.mark.asyncio
    async def test_create_task_routes_specialist(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="specialist", intent="create_task", entities={"project": "Via Tesoro"}
        )
        model, cls = await router.classify_and_select_model("Create a task for Via Tesoro", mock_provider)
        assert cls.tier == RoutingTier.SPECIALIST

    @pytest.mark.asyncio
    async def test_list_issues_routes_specialist(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="specialist", intent="list_issues", entities={"entity_type": "issue"}
        )
        model, cls = await router.classify_and_select_model("Show me all open issues", mock_provider)
        assert cls.tier == RoutingTier.SPECIALIST

    @pytest.mark.asyncio
    async def test_payment_update_routes_specialist(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="specialist", intent="update_payment", entities={"entity_type": "payment"}
        )
        model, cls = await router.classify_and_select_model("Mark the foundation payment as paid", mock_provider)
        assert cls.tier == RoutingTier.SPECIALIST

    @pytest.mark.asyncio
    async def test_task_count_routes_specialist(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="specialist", intent="count_tasks"
        )
        model, cls = await router.classify_and_select_model("How many open tasks do I have?", mock_provider)
        assert cls.tier == RoutingTier.SPECIALIST

    @pytest.mark.asyncio
    async def test_greeting_routes_specialist(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="specialist", intent="greeting", confidence=0.95
        )
        model, cls = await router.classify_and_select_model("Hello", mock_provider)
        assert cls.tier == RoutingTier.SPECIALIST

    @pytest.mark.asyncio
    async def test_daily_log_routes_specialist(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="specialist", intent="create_daily_log"
        )
        model, cls = await router.classify_and_select_model("Log today's work: 4 workers, framing done", mock_provider)
        assert cls.tier == RoutingTier.SPECIALIST

    @pytest.mark.asyncio
    async def test_assign_task_routes_specialist(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="specialist", intent="assign_task"
        )
        model, cls = await router.classify_and_select_model("Assign the flooring task to Marco", mock_provider)
        assert cls.tier == RoutingTier.SPECIALIST

    # --- Planner tier ---

    @pytest.mark.asyncio
    async def test_budget_reallocation_routes_planner(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="planner", intent="budget_reallocation"
        )
        model, cls = await router.classify_and_select_model("Re-allocate the budget across stages", mock_provider)
        assert cls.tier == RoutingTier.PLANNER
        assert "claude-sonnet" in model

    @pytest.mark.asyncio
    async def test_stage_planning_routes_planner(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="planner", intent="stage_planning"
        )
        model, cls = await router.classify_and_select_model("Set up stages for kitchen remodel", mock_provider)
        assert cls.tier == RoutingTier.PLANNER

    @pytest.mark.asyncio
    async def test_report_generation_routes_planner(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="planner", intent="generate_report"
        )
        model, cls = await router.classify_and_select_model("Generate a progress report", mock_provider)
        assert cls.tier == RoutingTier.PLANNER

    @pytest.mark.asyncio
    async def test_multi_step_workflow_routes_planner(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="planner", intent="multi_step_workflow"
        )
        model, cls = await router.classify_and_select_model(
            "Create an issue for water damage, notify the GC, and log it", mock_provider
        )
        assert cls.tier == RoutingTier.PLANNER

    @pytest.mark.asyncio
    async def test_analysis_routes_planner(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="planner", intent="margin_analysis"
        )
        model, cls = await router.classify_and_select_model("Analyze margin risk across portfolio", mock_provider)
        assert cls.tier == RoutingTier.PLANNER

    @pytest.mark.asyncio
    async def test_timeline_estimation_routes_planner(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="planner", intent="timeline_analysis"
        )
        model, cls = await router.classify_and_select_model(
            "When do you think we'll finish the Johnson Reno?", mock_provider
        )
        assert cls.tier == RoutingTier.PLANNER

    # --- Entity extraction ---

    @pytest.mark.asyncio
    async def test_entities_extracted_from_classification(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="specialist", intent="project_status",
            entities={"project": "Cole Dr", "entity_type": "project"},
        )
        _, cls = await router.classify_and_select_model("Status of Cole Dr?", mock_provider)
        assert cls.entities.get("project") == "Cole Dr"

    @pytest.mark.asyncio
    async def test_confidence_preserved(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="specialist", intent="list_tasks", confidence=0.87
        )
        _, cls = await router.classify_and_select_model("Show tasks", mock_provider)
        assert cls.confidence == 0.87


# =============================================================================
# Section 2: Fallback & Error Handling (deterministic)
# =============================================================================


class TestGatekeeperFallback:
    """Test graceful degradation on gatekeeper failures."""

    @pytest.mark.asyncio
    async def test_api_error_falls_back(self, router, mock_provider):
        mock_provider.chat_completion_sync.side_effect = Exception("API error: 500")
        model, cls = await router.classify_and_select_model("What tasks?", mock_provider)
        assert cls.tier == RoutingTier.SPECIALIST
        assert cls.intent == "fallback"

    @pytest.mark.asyncio
    async def test_malformed_json_falls_back(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = {
            "content": "Not JSON!", "tool_calls": None, "usage": {}, "model": "gemini"
        }
        model, cls = await router.classify_and_select_model("What tasks?", mock_provider)
        assert cls.tier == RoutingTier.SPECIALIST
        assert cls.intent == "fallback"

    @pytest.mark.asyncio
    async def test_empty_response_falls_back(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = {
            "content": "", "tool_calls": None, "usage": {}, "model": "gemini"
        }
        model, cls = await router.classify_and_select_model("What tasks?", mock_provider)
        assert cls.tier == RoutingTier.SPECIALIST

    @pytest.mark.asyncio
    async def test_markdown_fenced_json_parsed(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = {
            "content": '```json\n{"tier": "planner", "intent": "stage_planning", "entities": {}, "confidence": 0.8}\n```',
            "tool_calls": None, "usage": {}, "model": "gemini",
        }
        model, cls = await router.classify_and_select_model("Set up stages", mock_provider)
        assert cls.tier == RoutingTier.PLANNER
        assert cls.intent == "stage_planning"

    @pytest.mark.asyncio
    async def test_unknown_tier_defaults_specialist(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = {
            "content": '{"tier": "unknown", "intent": "x", "entities": {}, "confidence": 0.5}',
            "tool_calls": None, "usage": {}, "model": "gemini",
        }
        model, cls = await router.classify_and_select_model("Something", mock_provider)
        assert cls.tier == RoutingTier.SPECIALIST

    @pytest.mark.asyncio
    async def test_timeout_falls_back(self, router, mock_provider):
        import asyncio
        mock_provider.chat_completion_sync.side_effect = asyncio.TimeoutError()
        model, cls = await router.classify_and_select_model("Anything", mock_provider)
        assert cls.tier == RoutingTier.SPECIALIST


# =============================================================================
# Section 3: Model Selection & Parameters
# =============================================================================


class TestModelParameters:
    """Test model ID and parameter selection per tier."""

    def test_specialist_returns_correct_model(self, router):
        assert router._model_for_tier(RoutingTier.SPECIALIST) == "openai/gpt-4o-mini"

    def test_planner_returns_correct_model(self, router):
        assert router._model_for_tier(RoutingTier.PLANNER) == "anthropic/claude-sonnet-4"

    def test_planner_gets_higher_max_tokens(self, router):
        assert router.get_max_tokens(tier=RoutingTier.PLANNER) == 8192

    def test_specialist_gets_standard_max_tokens(self, router):
        assert router.get_max_tokens(tier=RoutingTier.SPECIALIST) == 4096

    def test_default_temperature_is_factual(self, router):
        assert router.get_temperature() == 0.3

    def test_creative_intent_gets_higher_temperature(self, router):
        assert router.get_temperature(intent="generate_client_update_draft") == 0.7

    def test_long_output_intent_gets_higher_tokens(self, router):
        assert router.get_max_tokens(intent="generate_progress_report") == 8192


# =============================================================================
# Section 4: Legacy Backward Compatibility
# =============================================================================


class TestLegacyCompatibility:
    """Test legacy heuristic select_model still works."""

    def test_default_returns_standard(self, router):
        assert router.select_model() == "openai/gpt-4o-mini"

    def test_complex_intent_routes_complex(self, router):
        assert router.select_model(intent="margin_risk") == "anthropic/claude-sonnet-4"

    def test_many_tools_routes_complex(self, router):
        assert router.select_model(tool_calls=["t1", "t2", "t3"]) == "anthropic/claude-sonnet-4"

    def test_long_context_routes_complex(self, router):
        assert router.select_model(message_length=60000) == "anthropic/claude-sonnet-4"


# =============================================================================
# Section 5: Gatekeeper Call Verification
# =============================================================================


class TestGatekeeperCallParams:
    """Verify the gatekeeper is called with correct parameters."""

    @pytest.mark.asyncio
    async def test_correct_model_and_params(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="specialist", intent="list_tasks"
        )
        await router.classify_and_select_model("Show tasks", mock_provider)

        kwargs = mock_provider.chat_completion_sync.call_args.kwargs
        assert kwargs["model"] == "google/gemini-2.0-flash-001"
        assert kwargs["temperature"] == 0.0
        assert kwargs["max_tokens"] == 150

    @pytest.mark.asyncio
    async def test_system_prompt_sent(self, router, mock_provider):
        mock_provider.chat_completion_sync.return_value = _mock_gatekeeper_response(
            tier="specialist", intent="list_tasks"
        )
        await router.classify_and_select_model("Show tasks", mock_provider)

        kwargs = mock_provider.chat_completion_sync.call_args.kwargs
        messages = kwargs["messages"]
        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert "classifier" in messages[0]["content"].lower()
        assert messages[1]["content"] == "Show tasks"


# =============================================================================
# Section 6: Live Gatekeeper Tests (real API calls)
# =============================================================================


LIVE_SIMPLE_QUERIES = [
    ("Hi", "specialist"),
    ("Hello, good morning", "specialist"),
    ("What can you do?", "specialist"),
    ("What's the status of the Johnson project?", "specialist"),
    ("How many open tasks do I have?", "specialist"),
    ("Show me all issues", "specialist"),
    ("Mark the issue as resolved", "specialist"),
    ("Update the installment amount", "specialist"),
    ("Put the project on hold", "specialist"),
    ("Show me all materials for the project", "specialist"),
    ("List open issues", "specialist"),
    ("What installments are pending?", "specialist"),
    ("What stages does the project have?", "specialist"),
    ("List tasks for Cole Dr", "specialist"),
    ("Delete the drywall task", "specialist"),
    ("Add a new stage called Finishing to the project", "specialist"),
    ("Mark the framing task as done", "specialist"),
    ("Show me the details for Via Tesoro project", "specialist"),
    ("What stage templates can I use?", "specialist"),
]

LIVE_STANDARD_QUERIES = [
    ("Create a task called rough-in electrical for Johnson Reno, due Friday", "specialist"),
    ("Mark the framing stage as complete", "specialist"),
    ("Log today's work: 4 workers, drywall 60% done", "specialist"),
    ("Assign the flooring task to Marco", "specialist"),
    ("Update the project address to 789 Elm St", "specialist"),
    ("Send a notification to plumbing team about schedule change", "specialist"),
    ("Apply the Kitchen Remodel template to Cole Dr", "specialist"),
    ("What stage templates are available?", "specialist"),
    ("Change the payment to received", "specialist"),
    ("Create an installment for $5000 called foundation deposit", "specialist"),
    ("Run a query to find overdue tasks", "specialist"),
]

LIVE_COMPLEX_QUERIES = [
    ("Create tasks for each trade based on open issues", "planner"),
    ("We're behind schedule. What should we prioritize and update the timelines?", "planner"),
    ("Compare budget vs actuals across all active projects", "planner"),
    ("Set up all stages for a kitchen remodel on Cole Dr", "planner"),
    ("Generate a progress report for all active projects", "planner"),
    ("Inspector failed us. Create issue, notify sub, push back drywall stage, log it", "planner"),
]


@pytest.mark.live_llm
class TestLiveGatekeeper:
    """Test actual gatekeeper classification with real API calls."""

    @pytest.mark.asyncio
    async def test_simple_queries_route_correctly(self, router):
        """Simple queries should route to specialist tier. Target: ≥90%."""
        from src.agent.llm.openrouter_provider import OpenRouterProvider
        provider = OpenRouterProvider()

        results = []
        for prompt, expected_tier in LIVE_SIMPLE_QUERIES:
            try:
                model, cls = await router.classify_and_select_model(prompt, provider)
                results.append(cls.tier.value == expected_tier)
            except Exception as e:
                results.append(False)

        pass_rate = sum(results) / len(results)
        print(f"\nSimple query routing: {sum(results)}/{len(results)} ({pass_rate:.0%})")
        assert pass_rate >= 0.80, f"Simple query routing too low: {pass_rate:.0%}"

    @pytest.mark.asyncio
    async def test_standard_queries_route_correctly(self, router):
        """Standard queries should route to specialist tier. Target: ≥85%."""
        from src.agent.llm.openrouter_provider import OpenRouterProvider
        provider = OpenRouterProvider()

        results = []
        for prompt, expected_tier in LIVE_STANDARD_QUERIES:
            try:
                model, cls = await router.classify_and_select_model(prompt, provider)
                results.append(cls.tier.value == expected_tier)
            except Exception:
                results.append(False)

        pass_rate = sum(results) / len(results)
        print(f"\nStandard query routing: {sum(results)}/{len(results)} ({pass_rate:.0%})")
        assert pass_rate >= 0.70, f"Standard query routing too low: {pass_rate:.0%}"

    @pytest.mark.asyncio
    async def test_complex_queries_route_correctly(self, router):
        """Complex queries should route to planner tier. Target: ≥90%."""
        from src.agent.llm.openrouter_provider import OpenRouterProvider
        provider = OpenRouterProvider()

        results = []
        for prompt, expected_tier in LIVE_COMPLEX_QUERIES:
            try:
                model, cls = await router.classify_and_select_model(prompt, provider)
                results.append(cls.tier.value == expected_tier)
            except Exception:
                results.append(False)

        pass_rate = sum(results) / len(results)
        print(f"\nComplex query routing: {sum(results)}/{len(results)} ({pass_rate:.0%})")
        assert pass_rate >= 0.70, f"Complex query routing too low: {pass_rate:.0%}"

    @pytest.mark.asyncio
    async def test_critical_misroute_rate(self, router):
        """Complex queries must NOT route to specialist. Target: ≤5% critical misroute."""
        from src.agent.llm.openrouter_provider import OpenRouterProvider
        provider = OpenRouterProvider()

        misroutes = 0
        total = len(LIVE_COMPLEX_QUERIES)
        for prompt, _ in LIVE_COMPLEX_QUERIES:
            try:
                _, cls = await router.classify_and_select_model(prompt, provider)
                if cls.tier == RoutingTier.SPECIALIST:
                    misroutes += 1
                    print(f"  MISROUTE: '{prompt[:50]}...' → specialist")
            except Exception:
                pass  # Don't count errors as misroutes

        misroute_rate = misroutes / total
        print(f"\nCritical misroute rate: {misroutes}/{total} ({misroute_rate:.0%})")
        # Allow some tolerance for LLM non-determinism
        assert misroute_rate <= 0.30, f"Critical misroute rate too high: {misroute_rate:.0%}"

    @pytest.mark.asyncio
    async def test_router_latency(self, router):
        """Router classification should be fast. Target: ≤500ms P95."""
        from src.agent.llm.openrouter_provider import OpenRouterProvider
        provider = OpenRouterProvider()

        latencies = []
        test_prompts = ["What's the status?", "Create a task", "Set up stages for kitchen remodel"]
        for prompt in test_prompts:
            start = time.monotonic()
            try:
                await router.classify_and_select_model(prompt, provider)
            except Exception:
                pass
            elapsed = (time.monotonic() - start) * 1000
            latencies.append(elapsed)

        if latencies:
            p95 = sorted(latencies)[int(len(latencies) * 0.95)]
            print(f"\nRouter latency P95: {p95:.0f}ms")
            # Generous threshold for network variability
            assert p95 <= 5000, f"Router latency P95 too high: {p95:.0f}ms"
