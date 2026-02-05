"""
Tool execution engine for running agent tools.
"""

import time
import logging
from typing import Dict, Any, Optional

from .registry import tool_registry
from .base_tool import BaseTool
from ..models.agent_models import SafetyLevel
from ..repositories.agent_repository import agent_repo

logger = logging.getLogger(__name__)


class ToolExecutionError(Exception):
    """Exception raised when tool execution fails."""

    def __init__(self, tool_name: str, message: str, original_error: Optional[Exception] = None):
        self.tool_name = tool_name
        self.message = message
        self.original_error = original_error
        super().__init__(f"Tool '{tool_name}' failed: {message}")


class PermissionDenied(Exception):
    """Exception raised when user lacks permission to use a tool."""

    def __init__(self, tool_name: str, role: str):
        self.tool_name = tool_name
        self.role = role
        super().__init__(f"Role '{role}' cannot use tool '{tool_name}'")


class ToolExecutor:
    """Executes tools with permission checking and audit logging."""

    async def execute(
        self,
        tool_name: str,
        params: Dict[str, Any],
        context: Dict[str, Any],
        message_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Execute a tool with full validation and logging.

        Args:
            tool_name: Name of the tool to execute.
            params: Input parameters for the tool.
            context: Execution context with user_id, company_id, role, etc.
            message_id: Optional message ID for audit logging.
            conversation_id: Optional conversation ID for audit logging.

        Returns:
            Tool execution result.

        Raises:
            ValueError: If tool not found or params invalid.
            PermissionDenied: If user lacks permission.
            ToolExecutionError: If execution fails.
        """
        start_time = time.time()

        # Get the tool
        tool = tool_registry.get(tool_name)

        # Check permissions
        user_role = context.get("role", "")
        if not tool_registry.is_tool_allowed(tool_name, user_role):
            raise PermissionDenied(tool_name, user_role)

        # Validate parameters
        tool.validate_params(params)

        # Create tool call record if we have message context
        tool_call_record = None
        if message_id and conversation_id:
            tool_call_record = await agent_repo.save_tool_call(
                message_id=message_id,
                conversation_id=conversation_id,
                user_id=context.get("user_id", ""),
                tool_name=tool_name,
                tool_input=params,
                safety_level=tool.safety_level.value,
                project_id=context.get("project_id"),
                execution_status="executing",
                confirmation_required=(
                    tool.safety_level == SafetyLevel.REQUIRES_CONFIRMATION
                ),
            )

        try:
            # Execute the tool
            result = await tool.execute(params, context)

            execution_time_ms = int((time.time() - start_time) * 1000)

            # Update tool call record with result
            if tool_call_record:
                await agent_repo.update_tool_call(
                    tool_call_id=tool_call_record["id"],
                    tool_output=result,
                    execution_status="success",
                    execution_time_ms=execution_time_ms,
                )

            logger.info(
                f"Tool '{tool_name}' executed successfully in {execution_time_ms}ms"
            )

            return result

        except Exception as e:
            execution_time_ms = int((time.time() - start_time) * 1000)

            # Update tool call record with error
            if tool_call_record:
                await agent_repo.update_tool_call(
                    tool_call_id=tool_call_record["id"],
                    execution_status="failed",
                    error_message=str(e),
                    execution_time_ms=execution_time_ms,
                )

            logger.error(f"Tool '{tool_name}' failed: {e}")
            raise ToolExecutionError(tool_name, str(e), e)

    async def validate_and_check_confirmation(
        self,
        tool_name: str,
        params: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Check if tool requires confirmation before execution.

        Args:
            tool_name: Name of the tool.
            params: Input parameters.
            context: Execution context.

        Returns:
            Dict with:
            - allowed: bool - Whether execution is allowed
            - requires_confirmation: bool - Whether confirmation needed
            - reason: Optional[str] - Reason if not allowed
            - tool: Optional[BaseTool] - The tool if allowed
        """
        # Check if tool exists
        tool = tool_registry.get_optional(tool_name)
        if not tool:
            return {
                "allowed": False,
                "requires_confirmation": False,
                "reason": f"Tool '{tool_name}' not found",
                "tool": None,
            }

        # Check permissions
        user_role = context.get("role", "")
        if not tool_registry.is_tool_allowed(tool_name, user_role):
            return {
                "allowed": False,
                "requires_confirmation": False,
                "reason": f"Role '{user_role}' cannot use tool '{tool_name}'",
                "tool": None,
            }

        # Check safety level
        if tool.safety_level == SafetyLevel.PROHIBITED:
            return {
                "allowed": False,
                "requires_confirmation": False,
                "reason": "Operation prohibited",
                "tool": None,
            }

        if tool.safety_level == SafetyLevel.REQUIRES_CONFIRMATION:
            return {
                "allowed": True,
                "requires_confirmation": True,
                "reason": None,
                "tool": tool,
            }

        # READ_ONLY, AUDIT_LOGGED, REQUIRES_REVIEW all proceed without confirmation
        return {
            "allowed": True,
            "requires_confirmation": False,
            "reason": None,
            "tool": tool,
        }


# Global executor instance
tool_executor = ToolExecutor()
