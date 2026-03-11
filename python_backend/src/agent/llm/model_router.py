"""
Model router for selecting appropriate LLM model based on task complexity.

Implements a 3-tier Router-Worker pattern:
- Gatekeeper (Gemini Flash): Classifies intent, fast and cheap
- Specialist (GPT-4o Mini): Handles simple queries (~70% of traffic)
- Planner (Claude Sonnet): Reserved for complex multi-step operations (~30%)
"""

import json
import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple, TYPE_CHECKING

from src.core.config import settings

if TYPE_CHECKING:
    from .provider_base import LLMProviderBase

logger = logging.getLogger(__name__)


class RoutingTier(str, Enum):
    """Model tier for routing decisions."""
    SPECIALIST = "specialist"
    PLANNER = "planner"


@dataclass
class GatekeeperClassification:
    """Result of the gatekeeper's intent classification."""
    tier: RoutingTier
    intent: str
    entities: Dict[str, Any] = field(default_factory=dict)
    confidence: float = 0.0


# Gatekeeper system prompt — kept minimal for speed
GATEKEEPER_SYSTEM_PROMPT = """You are a request classifier for a construction project management AI assistant.
Classify the user's message and respond with ONLY a JSON object. No markdown, no explanation.

## Tiers
- "specialist": Simple queries — status lookups, single-entity reads, basic creates/updates, entity resolution, listing items, FAQ. About 70% of requests.
- "planner": Complex operations — multi-step workflows, budget reallocation, stage planning/setup, report generation, analysis across multiple entities, operations requiring multi-tool orchestration, template application.

## Output Schema
{"tier": "specialist"|"planner", "intent": "<short_intent_label>", "entities": {"project": "<name_if_mentioned>", "entity_type": "<task|stage|issue|payment|material|log>"}, "confidence": 0.0-1.0}

## Examples
User: "What is the status of Cole Dr?" -> {"tier": "specialist", "intent": "project_status", "entities": {"project": "Cole Dr"}, "confidence": 0.95}
User: "Create a task for the Via Tesoro project" -> {"tier": "specialist", "intent": "create_task", "entities": {"project": "Via Tesoro", "entity_type": "task"}, "confidence": 0.9}
User: "Mark the foundation payment as paid" -> {"tier": "specialist", "intent": "update_payment", "entities": {"entity_type": "payment"}, "confidence": 0.9}
User: "Show me all open issues" -> {"tier": "specialist", "intent": "list_issues", "entities": {"entity_type": "issue"}, "confidence": 0.95}
User: "Re-allocate the budget across all stages for San Jerome" -> {"tier": "planner", "intent": "budget_reallocation", "entities": {"project": "San Jerome"}, "confidence": 0.9}
User: "Set up the stages for a kitchen remodel on Cole Dr" -> {"tier": "planner", "intent": "stage_planning", "entities": {"project": "Cole Dr", "entity_type": "stage"}, "confidence": 0.85}
User: "Generate a progress report for all active projects" -> {"tier": "planner", "intent": "generate_report", "entities": {}, "confidence": 0.95}
User: "Analyze the margin risk across my portfolio" -> {"tier": "planner", "intent": "margin_analysis", "entities": {}, "confidence": 0.9}"""


class ModelRouter:
    """Routes requests to appropriate model based on gatekeeper classification.

    Uses a 3-tier architecture:
    - Gatekeeper: Gemini Flash for fast intent classification
    - Specialist: GPT-4o Mini for simple queries
    - Planner: Claude Sonnet for complex multi-step operations
    """

    # Legacy: Intents that require the complex/capable model (used when gatekeeper is disabled)
    COMPLEX_INTENTS: Set[str] = {
        "margin_risk", "portfolio_health", "trend_analysis", "blocker_analysis",
        "identify_risk_signals", "analyze", "generate_kpi_report",
        "generate_progress_report", "generate_executive_summary",
        "generate_pdf_report", "generate_client_update_draft",
        "send_client_update", "generate_schedule", "generate_materials_list",
        "change_order_impact", "morning_briefing", "rfi_workflow",
        "change_order_workflow",
    }

    # Legacy: Tools that indicate complex analysis (used when gatekeeper is disabled)
    COMPLEX_TOOLS: Set[str] = {
        "get_margin_analysis", "get_portfolio_financials", "get_project_kpis",
        "get_company_kpis", "identify_risk_signals", "compare_projects",
        "generate_schedule", "generate_materials_list", "generate_progress_report",
        "generate_client_update_draft", "generate_kpi_report",
        "generate_executive_summary", "fill_template", "generate_pdf_report",
    }

    def __init__(
        self,
        gatekeeper_model: Optional[str] = None,
        specialist_model: Optional[str] = None,
        planner_model: Optional[str] = None,
        standard_model: Optional[str] = None,
        complex_model: Optional[str] = None,
    ):
        # 3-tier models
        self.gatekeeper_model = gatekeeper_model or settings.openrouter_model_gatekeeper
        self.specialist_model = specialist_model or settings.openrouter_model_specialist
        self.planner_model = planner_model or settings.openrouter_model_planner

        # Legacy 2-tier models (backward compat)
        self.standard_model = standard_model or settings.openrouter_model_standard
        self.complex_model = complex_model or settings.openrouter_model_complex

    async def classify_and_select_model(
        self,
        message: str,
        llm_provider: "LLMProviderBase",
    ) -> Tuple[str, GatekeeperClassification]:
        """Classify intent via gatekeeper and select the appropriate model.

        Args:
            message: The user's message to classify.
            llm_provider: LLM provider instance for the gatekeeper call.

        Returns:
            Tuple of (model_id, classification).
            Falls back to specialist on any error.
        """
        fallback = GatekeeperClassification(
            tier=RoutingTier.SPECIALIST,
            intent="fallback",
            entities={},
            confidence=0.0,
        )

        try:
            classification = await self._call_gatekeeper(message, llm_provider)
        except Exception as e:
            logger.warning(f"Gatekeeper classification failed: {e}")
            return self.specialist_model, fallback

        model = self._model_for_tier(classification.tier)
        return model, classification

    async def _call_gatekeeper(
        self,
        message: str,
        llm_provider: "LLMProviderBase",
    ) -> GatekeeperClassification:
        """Call the gatekeeper model for intent classification."""
        messages = [
            {"role": "system", "content": GATEKEEPER_SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ]

        response = await llm_provider.chat_completion_sync(
            messages=messages,
            model=self.gatekeeper_model,
            temperature=0.0,
            max_tokens=150,
            timeout=settings.agent_gatekeeper_timeout,
        )

        content = response.get("content", "").strip()
        if not content:
            raise ValueError("Gatekeeper returned empty response")

        return self._parse_gatekeeper_response(content)

    def _parse_gatekeeper_response(self, content: str) -> GatekeeperClassification:
        """Parse the gatekeeper's JSON response, handling markdown fences."""
        # Strip markdown code fences if present
        cleaned = re.sub(r"^```(?:json)?\s*", "", content.strip())
        cleaned = re.sub(r"\s*```$", "", cleaned.strip())

        data = json.loads(cleaned)

        tier_str = data.get("tier", "specialist").lower()
        if tier_str not in ("specialist", "planner"):
            tier_str = "specialist"

        return GatekeeperClassification(
            tier=RoutingTier(tier_str),
            intent=data.get("intent", "unknown"),
            entities=data.get("entities", {}),
            confidence=float(data.get("confidence", 0.0)),
        )

    def _model_for_tier(self, tier: RoutingTier) -> str:
        """Map a routing tier to its model ID."""
        if tier == RoutingTier.PLANNER:
            return self.planner_model
        return self.specialist_model

    # --- Legacy methods (used when gatekeeper is disabled) ---

    def select_model(
        self,
        intent: Optional[str] = None,
        tool_calls: Optional[List[str]] = None,
        message_length: Optional[int] = None,
    ) -> str:
        """Legacy: Select model based on static heuristics.

        Used when AGENT_GATEKEEPER_ENABLED=false.
        """
        if intent and intent.lower() in self.COMPLEX_INTENTS:
            return self.complex_model

        if tool_calls:
            for tool in tool_calls:
                if tool in self.COMPLEX_TOOLS:
                    return self.complex_model
            if len(tool_calls) >= 3:
                return self.complex_model

        if message_length and message_length > 50000:
            return self.complex_model

        return self.standard_model

    # --- Temperature and token settings ---

    def get_temperature(
        self,
        intent: Optional[str] = None,
        tier: Optional[RoutingTier] = None,
    ) -> float:
        """Get appropriate temperature based on tier or intent."""
        creative_intents = {
            "generate_client_update_draft",
            "send_client_update",
            "generate_progress_report",
        }

        if intent and intent.lower() in creative_intents:
            return 0.7

        return 0.3

    def get_max_tokens(
        self,
        intent: Optional[str] = None,
        tier: Optional[RoutingTier] = None,
    ) -> int:
        """Get appropriate max tokens based on tier or intent."""
        if tier == RoutingTier.PLANNER:
            return 8192

        long_output_intents = {
            "generate_kpi_report", "generate_progress_report",
            "generate_executive_summary", "generate_schedule",
            "morning_briefing",
        }

        if intent and intent.lower() in long_output_intents:
            return 8192

        return 4096


# Global instance
model_router = ModelRouter()
