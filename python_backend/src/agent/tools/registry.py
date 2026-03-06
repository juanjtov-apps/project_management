"""
Tool registry for managing available agent tools.
"""

from typing import Dict, List, Any, Optional
import logging

from .base_tool import BaseTool
from ..models.agent_models import SafetyLevel

logger = logging.getLogger(__name__)


class ToolRegistry:
    """Central registry for all agent tools.

    The registry maintains a collection of available tools and provides
    methods for:
    - Registering new tools
    - Retrieving tools by name
    - Filtering tools by user role
    - Generating tool schemas for LLM context
    """

    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
        self._initialized = False

    def register(self, tool: BaseTool) -> None:
        """Register a tool in the registry.

        Args:
            tool: Tool instance to register.

        Raises:
            ValueError: If tool with same name already registered.
        """
        if tool.name in self._tools:
            logger.warning(f"Tool '{tool.name}' already registered, overwriting")

        self._tools[tool.name] = tool
        logger.debug(f"Registered tool: {tool.name}")

    def unregister(self, name: str) -> bool:
        """Remove a tool from the registry.

        Args:
            name: Name of tool to remove.

        Returns:
            True if tool was removed, False if not found.
        """
        if name in self._tools:
            del self._tools[name]
            return True
        return False

    def get(self, name: str) -> BaseTool:
        """Get a tool by name.

        Args:
            name: Tool name to look up.

        Returns:
            The registered tool.

        Raises:
            ValueError: If tool not found.
        """
        if name not in self._tools:
            raise ValueError(f"Tool '{name}' not found in registry")
        return self._tools[name]

    def get_optional(self, name: str) -> Optional[BaseTool]:
        """Get a tool by name, returning None if not found."""
        return self._tools.get(name)

    def get_tools_for_role(self, role: str) -> List[BaseTool]:
        """Get all tools available to a specific role.

        Args:
            role: Role name (e.g., 'admin', 'project_manager').

        Returns:
            List of tools accessible by the role.
        """
        return [
            tool for tool in self._tools.values()
            if role in tool.permissions
        ]

    def get_tool_definitions(self, role: str) -> List[Dict[str, Any]]:
        """Get tool schemas in LLM-compatible format for a role.

        Args:
            role: Role name to filter tools.

        Returns:
            List of tool schemas ready for LLM function calling.
        """
        tools = self.get_tools_for_role(role)
        return [tool.to_llm_schema() for tool in tools]

    def get_tools_by_safety_level(
        self, safety_level: SafetyLevel
    ) -> List[BaseTool]:
        """Get all tools with a specific safety level.

        Args:
            safety_level: Safety level to filter by.

        Returns:
            List of tools with the specified safety level.
        """
        return [
            tool for tool in self._tools.values()
            if tool.safety_level == safety_level
        ]

    def is_tool_allowed(self, tool_name: str, role: str) -> bool:
        """Check if a role can use a specific tool.

        Args:
            tool_name: Name of the tool.
            role: User's role.

        Returns:
            True if the role can use the tool.
        """
        tool = self._tools.get(tool_name)
        if not tool:
            return False
        return role in tool.permissions

    @property
    def all_tools(self) -> Dict[str, BaseTool]:
        """Get all registered tools."""
        return self._tools.copy()

    @property
    def tool_names(self) -> List[str]:
        """Get names of all registered tools."""
        return list(self._tools.keys())

    def __len__(self) -> int:
        return len(self._tools)

    def __contains__(self, name: str) -> bool:
        return name in self._tools


# Global registry instance
tool_registry = ToolRegistry()


def register_default_tools():
    """Register all default tools in the registry.

    This function should be called at application startup to ensure
    all tools are available.
    """
    if tool_registry._initialized:
        return

    # Import and register Phase 1 read-only tools
    from .projects.get_projects import GetProjectsTool
    from .projects.get_project_detail import GetProjectDetailTool
    from .projects.get_stages import GetStagesTool
    from .projects.get_tasks import GetTasksTool
    from .projects.get_materials import GetMaterialsTool
    from .projects.get_issues import GetIssuesTool
    from .projects.get_installments import GetInstallmentsTool

    # Import dynamic query tool for flexible database access
    from .dynamic.dynamic_query_tool import DynamicQueryTool

    # Import write/action tools
    from .actions.create_task import CreateTaskTool
    from .actions.update_task_status import UpdateTaskStatusTool
    from .actions.update_project_status import UpdateProjectStatusTool
    from .actions.create_daily_log import CreateDailyLogTool
    from .actions.send_notification import SendNotificationTool
    from .actions.create_issue import CreateIssueTool
    from .actions.update_issue_status import UpdateIssueStatusTool
    from .actions.assign_task import AssignTaskTool
    from .actions.update_payment_status import UpdatePaymentStatusTool
    from .actions.create_stage import CreateStageTool
    from .actions.update_stage import UpdateStageTool
    from .actions.create_material_item import CreateMaterialItemTool
    from .actions.delete_task import DeleteTaskTool
    from .actions.create_installment import CreateInstallmentTool
    from .actions.update_installment import UpdateInstallmentTool

    # Register DynamicQueryTool early (position 2) so LLM considers it first for queries
    tool_registry.register(GetProjectsTool())
    tool_registry.register(DynamicQueryTool())  # Primary tool for flexible queries
    tool_registry.register(GetProjectDetailTool())
    tool_registry.register(GetStagesTool())
    tool_registry.register(GetTasksTool())
    tool_registry.register(GetMaterialsTool())
    tool_registry.register(GetIssuesTool())
    tool_registry.register(GetInstallmentsTool())

    # Write/action tools
    tool_registry.register(CreateTaskTool())
    tool_registry.register(UpdateTaskStatusTool())
    tool_registry.register(UpdateProjectStatusTool())
    tool_registry.register(CreateDailyLogTool())
    tool_registry.register(SendNotificationTool())
    tool_registry.register(CreateIssueTool())
    tool_registry.register(UpdateIssueStatusTool())
    tool_registry.register(AssignTaskTool())
    tool_registry.register(UpdatePaymentStatusTool())
    tool_registry.register(CreateStageTool())
    tool_registry.register(UpdateStageTool())
    tool_registry.register(CreateMaterialItemTool())
    tool_registry.register(DeleteTaskTool())
    tool_registry.register(CreateInstallmentTool())
    tool_registry.register(UpdateInstallmentTool())

    tool_registry._initialized = True
    logger.info(f"Registered {len(tool_registry)} tools")
