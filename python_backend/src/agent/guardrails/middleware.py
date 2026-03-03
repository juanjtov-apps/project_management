"""
Guardrail middleware for permission and safety validation.
"""

from typing import Dict, Any, Optional
import logging

from ..tools.registry import tool_registry
from ..models.agent_models import SafetyLevel

logger = logging.getLogger(__name__)


class GuardrailMiddleware:
    """Middleware for validating tool calls against permissions and safety levels.

    The guardrail middleware ensures:
    - User has permission to use the requested tool
    - Tool safety level is respected
    - Prohibited operations are blocked
    - Confirmation gates are triggered for destructive operations
    """

    async def validate_tool_call(
        self,
        tool_name: str,
        tool_input: Dict[str, Any],
        user_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Validate a tool call against permissions and safety rules.

        Args:
            tool_name: Name of the tool to validate.
            tool_input: Input parameters for the tool.
            user_context: User context with role and permissions.

        Returns:
            Dict with:
            - allowed: bool - Whether the call is allowed
            - requires_confirmation: bool - Whether confirmation is needed
            - reason: Optional[str] - Reason if not allowed
            - confirmation_request: Optional[Dict] - Details for confirmation dialog
        """
        # Check if tool exists
        tool = tool_registry.get_optional(tool_name)
        if not tool:
            return {
                "allowed": False,
                "requires_confirmation": False,
                "reason": f"Tool '{tool_name}' not found",
            }

        # Check role-based permission
        user_role = user_context.get("role", "")
        if not tool_registry.is_tool_allowed(tool_name, user_role):
            logger.warning(
                f"Permission denied: role '{user_role}' cannot use tool '{tool_name}'"
            )
            return {
                "allowed": False,
                "requires_confirmation": False,
                "reason": f"Your role does not have permission to use this tool",
            }

        # Check safety level
        safety_level = tool.safety_level

        if safety_level == SafetyLevel.PROHIBITED:
            logger.warning(f"Prohibited tool call attempted: {tool_name}")
            return {
                "allowed": False,
                "requires_confirmation": False,
                "reason": "Operation prohibited",
            }

        if safety_level == SafetyLevel.REQUIRES_CONFIRMATION:
            # Build confirmation request
            confirmation_request = self._build_confirmation_request(
                tool_name=tool_name,
                tool_input=tool_input,
                tool=tool,
            )
            return {
                "allowed": True,
                "requires_confirmation": True,
                "reason": None,
                "confirmation_request": confirmation_request,
            }

        # READ_ONLY, AUDIT_LOGGED, REQUIRES_REVIEW all proceed
        return {
            "allowed": True,
            "requires_confirmation": False,
            "reason": None,
        }

    def _build_confirmation_request(
        self,
        tool_name: str,
        tool_input: Dict[str, Any],
        tool,
    ) -> Dict[str, Any]:
        """Build a confirmation request for user approval."""
        # Generate human-readable summary
        summary = self._generate_operation_summary(tool_name, tool_input)

        # Generate impact assessment
        impact = self._assess_impact(tool_name, tool_input)

        return {
            "tool_name": tool_name,
            "operation_summary": summary,
            "impact_assessment": impact,
            "parameters": tool_input,
        }

    def _generate_operation_summary(
        self,
        tool_name: str,
        tool_input: Dict[str, Any],
    ) -> str:
        """Generate a human-readable summary of the operation."""
        summaries = {
            "create_project": lambda i: f"Create new project: {i.get('name', 'Unnamed')}",
            "create_task": lambda i: f"Create task: {i.get('title', 'Unnamed')}",
            "create_stage": lambda i: f"Create stage: {i.get('name', 'Unnamed')}",
            "create_change_order": lambda i: f"Create change order: {i.get('title', 'Unnamed')}",
            "archive_project": lambda i: f"Archive project: {i.get('project_id', 'Unknown')}",
            "bulk_update_tasks": lambda i: f"Bulk update {len(i.get('task_ids', []))} tasks",
        }

        if tool_name in summaries:
            try:
                return summaries[tool_name](tool_input)
            except Exception:
                pass

        return f"Execute {tool_name}"

    def _assess_impact(
        self,
        tool_name: str,
        tool_input: Dict[str, Any],
    ) -> str:
        """Assess the potential impact of the operation."""
        impacts = {
            "create_project": "This will create a new project that will be visible to your team.",
            "archive_project": "This will archive the project. It will be hidden from active views but data is preserved.",
            "create_change_order": "This may affect project budget and timeline. Client approval may be required.",
            "bulk_update_tasks": "This will modify multiple tasks at once. Changes cannot be undone individually.",
        }

        return impacts.get(tool_name, "This action will modify data in your account.")

    async def check_data_access(
        self,
        resource_type: str,
        resource_id: str,
        user_context: Dict[str, Any],
    ) -> bool:
        """Check if user can access a specific resource.

        This validates row-level security for multi-tenant data access.

        Args:
            resource_type: Type of resource (project, task, etc.)
            resource_id: ID of the resource.
            user_context: User context with company_id.

        Returns:
            True if user can access the resource.
        """
        # For now, this is a placeholder for future row-level security checks
        # The actual filtering happens in the repository layer via company_id
        return True


# Global instance
guardrail_middleware = GuardrailMiddleware()
