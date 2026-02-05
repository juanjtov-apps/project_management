"""
Tests for tool permissions - 10 tests

Tests RBAC enforcement for all agent tools.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.agent.tools.registry import tool_registry
from src.agent.tools.projects.get_projects import GetProjectsTool
from src.agent.tools.projects.get_project_detail import GetProjectDetailTool
from src.agent.tools.projects.get_tasks import GetTasksTool
from src.agent.tools.projects.get_installments import GetInstallmentsTool
from src.agent.tools.projects.get_issues import GetIssuesTool
from src.agent.tools.dynamic.dynamic_query_tool import DynamicQueryTool


class TestRoleBasedAccess:
    """Tests for role-based tool access."""

    def test_admin_can_access_all_tools(self):
        """Test 1: Admin has access to all tools."""
        admin_tools = [
            GetProjectsTool(),
            GetProjectDetailTool(),
            GetTasksTool(),
            GetInstallmentsTool(),
            GetIssuesTool(),
            DynamicQueryTool(),
        ]

        for tool in admin_tools:
            assert "admin" in tool.permissions, f"Admin cannot access {tool.name}"

    def test_project_manager_tool_access(self):
        """Test 2: Project Manager has correct access."""
        pm_can_access = [
            GetProjectsTool(),
            GetProjectDetailTool(),
            GetTasksTool(),
            GetInstallmentsTool(),
            GetIssuesTool(),
        ]

        for tool in pm_can_access:
            assert "project_manager" in tool.permissions, f"PM cannot access {tool.name}"

    def test_office_manager_tool_access(self):
        """Test 3: Office Manager has correct access."""
        om_can_access = [
            GetProjectsTool(),
            GetProjectDetailTool(),
            GetTasksTool(),
            GetInstallmentsTool(),
            GetIssuesTool(),
        ]

        for tool in om_can_access:
            assert "office_manager" in tool.permissions, f"OM cannot access {tool.name}"

    def test_crew_limited_to_tasks_issues_materials(self):
        """Test 4: Crew has limited access."""
        tasks_tool = GetTasksTool()
        issues_tool = GetIssuesTool()
        projects_tool = GetProjectsTool()
        installments_tool = GetInstallmentsTool()

        # Crew CAN access tasks and issues
        assert "crew" in tasks_tool.permissions
        assert "crew" in issues_tool.permissions

        # Crew CANNOT access projects or payments
        assert "crew" not in projects_tool.permissions
        assert "crew" not in installments_tool.permissions

    def test_subcontractor_limited_access(self):
        """Test 5: Subcontractor has limited access."""
        tasks_tool = GetTasksTool()
        issues_tool = GetIssuesTool()
        projects_tool = GetProjectsTool()
        installments_tool = GetInstallmentsTool()

        # Sub CAN access tasks and issues
        assert "subcontractor" in tasks_tool.permissions
        assert "subcontractor" in issues_tool.permissions

        # Sub CANNOT access projects or payments
        assert "subcontractor" not in projects_tool.permissions
        assert "subcontractor" not in installments_tool.permissions

    def test_client_can_access_payments_issues_forum(self):
        """Test 6: Client has specific limited access."""
        installments_tool = GetInstallmentsTool()
        issues_tool = GetIssuesTool()
        projects_tool = GetProjectsTool()
        tasks_tool = GetTasksTool()

        # Client CAN access payments and issues
        assert "client" in installments_tool.permissions
        assert "client" in issues_tool.permissions

        # Client CANNOT access projects or tasks
        assert "client" not in projects_tool.permissions
        assert "client" not in tasks_tool.permissions


class TestDynamicQueryPermissions:
    """Tests for dynamic query tool permissions."""

    @pytest.mark.asyncio
    async def test_permission_denied_returns_helpful_message(self, crew_context):
        """Test 7: Permission denied returns clear error."""
        tool = DynamicQueryTool()

        result = await tool.execute(
            {"data_type": "projects"},
            crew_context,
        )

        assert result.get("error") is not None
        assert "Access denied" in result["error"]
        assert "hint" in result

    @pytest.mark.asyncio
    async def test_permission_check_happens_before_query(self, crew_context):
        """Test 8: Permission is checked before database query."""
        tool = DynamicQueryTool()

        with patch(
            "src.agent.tools.dynamic.dynamic_query_tool.db_manager"
        ) as mock_db:
            mock_db.execute_query = AsyncMock()

            result = await tool.execute(
                {"data_type": "projects"},
                crew_context,
            )

            # Query should NOT have been called
            mock_db.execute_query.assert_not_called()
            assert result.get("error") is not None


class TestCompanySecurity:
    """Tests for company-level security."""

    @pytest.mark.asyncio
    async def test_company_id_required_for_all_queries(self):
        """Test 9: Company context is required for queries."""
        tool = DynamicQueryTool()
        context = {"role": "admin"}  # No company_id

        result = await tool.execute(
            {"data_type": "projects"},
            context,
        )

        assert result.get("error") is not None
        assert "Company context required" in result["error"]


class TestToolRegistry:
    """Tests for tool registry functionality."""

    def test_tool_registry_filters_by_role(self):
        """Test 10: Tool registry filters tools by role."""
        from src.agent.tools.dynamic.schema_registry import get_accessible_tables

        # Admin can access more tables than crew
        admin_tables = get_accessible_tables("admin")
        crew_tables = get_accessible_tables("crew")
        client_tables = get_accessible_tables("client")

        assert len(admin_tables) >= len(crew_tables)
        assert len(admin_tables) >= len(client_tables)

        # Specific checks
        assert "projects" in admin_tables
        assert "projects" not in crew_tables
        assert "projects" not in client_tables

        assert "tasks" in crew_tables
        assert "payment_installments" in client_tables
        assert "payment_installments" not in crew_tables

