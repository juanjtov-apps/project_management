"""
Model router for selecting appropriate LLM model based on task complexity.
"""

from typing import List, Optional, Set
from src.core.config import settings


class ModelRouter:
    """Routes requests to appropriate model based on intent classification.

    The router selects between a standard (fast/cheap) model for simple queries
    and a complex (capable) model for analysis, report generation, and multi-step
    workflows.
    """

    # Intents that require the complex/capable model
    COMPLEX_INTENTS: Set[str] = {
        # Analysis intents
        "margin_risk",
        "portfolio_health",
        "trend_analysis",
        "blocker_analysis",
        "identify_risk_signals",
        "analyze",

        # Report generation intents
        "generate_kpi_report",
        "generate_progress_report",
        "generate_executive_summary",
        "generate_pdf_report",

        # Communication generation intents
        "generate_client_update_draft",
        "send_client_update",

        # Planning intents
        "generate_schedule",
        "generate_materials_list",
        "change_order_impact",

        # Complex workflows
        "morning_briefing",
        "rfi_workflow",
        "change_order_workflow",
    }

    # Tools that indicate complex analysis
    COMPLEX_TOOLS: Set[str] = {
        "get_margin_analysis",
        "get_portfolio_financials",
        "get_project_kpis",
        "get_company_kpis",
        "identify_risk_signals",
        "compare_projects",
        "generate_schedule",
        "generate_materials_list",
        "generate_progress_report",
        "generate_client_update_draft",
        "generate_kpi_report",
        "generate_executive_summary",
        "fill_template",
        "generate_pdf_report",
    }

    def __init__(
        self,
        standard_model: Optional[str] = None,
        complex_model: Optional[str] = None,
    ):
        """Initialize the model router.

        Args:
            standard_model: Model for standard queries. Defaults to settings.
            complex_model: Model for complex analysis. Defaults to settings.
        """
        self.standard_model = standard_model or settings.openrouter_model_standard
        self.complex_model = complex_model or settings.openrouter_model_complex

    def select_model(
        self,
        intent: Optional[str] = None,
        tool_calls: Optional[List[str]] = None,
        message_length: Optional[int] = None,
    ) -> str:
        """Select the appropriate model based on the request characteristics.

        Args:
            intent: Classified intent of the user request.
            tool_calls: List of tool names that will be or have been called.
            message_length: Length of the conversation context.

        Returns:
            Model identifier string to use for the request.
        """
        # Check if intent requires complex model
        if intent and intent.lower() in self.COMPLEX_INTENTS:
            return self.complex_model

        # Check if any tool in the chain requires complex model
        if tool_calls:
            for tool in tool_calls:
                if tool in self.COMPLEX_TOOLS:
                    return self.complex_model

            # Use complex model if workflow involves 3+ tools
            if len(tool_calls) >= 3:
                return self.complex_model

        # Use complex model for very long context
        if message_length and message_length > 50000:
            return self.complex_model

        return self.standard_model

    def get_temperature(self, intent: Optional[str] = None) -> float:
        """Get appropriate temperature based on intent.

        Args:
            intent: Classified intent of the request.

        Returns:
            Temperature value (0.0 to 1.0).
        """
        # Creative outputs need higher temperature
        creative_intents = {
            "generate_client_update_draft",
            "send_client_update",
            "generate_progress_report",
        }

        if intent and intent.lower() in creative_intents:
            return 0.7

        # Analysis and factual queries need lower temperature
        return 0.3

    def get_max_tokens(self, intent: Optional[str] = None) -> int:
        """Get appropriate max tokens based on intent.

        Args:
            intent: Classified intent of the request.

        Returns:
            Maximum tokens for the response.
        """
        # Report generation needs more tokens
        long_output_intents = {
            "generate_kpi_report",
            "generate_progress_report",
            "generate_executive_summary",
            "generate_schedule",
            "morning_briefing",
        }

        if intent and intent.lower() in long_output_intents:
            return 8192

        return 4096


# Global instance
model_router = ModelRouter()
