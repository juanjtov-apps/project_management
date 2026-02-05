"""
Tests for get_issues.py - 5 tests

Tests issue retrieval with filtering and RBAC.
"""

import pytest
from unittest.mock import AsyncMock, patch

from src.agent.tools.projects.get_issues import GetIssuesTool


@pytest.fixture
def get_issues_tool():
    """Create a GetIssuesTool instance."""
    return GetIssuesTool()


class TestGetIssuesProperties:
    """Tests for tool metadata."""

    def test_tool_name(self, get_issues_tool):
        """Verify tool name."""
        assert get_issues_tool.name == "get_issues"

    def test_tool_permissions_all_roles(self, get_issues_tool):
        """Verify all roles can access issues."""
        expected = ["admin", "project_manager", "office_manager", "crew", "subcontractor", "client"]
        assert get_issues_tool.permissions == expected


class TestGetIssuesExecution:
    """Tests for issue retrieval."""

    @pytest.mark.asyncio
    async def test_get_issues_by_project(
        self, get_issues_tool, admin_context, sample_issues
    ):
        """Test 1: Returns issues filtered by project."""
        with patch(
            "src.agent.tools.projects.get_issues.db_manager"
        ) as mock_db:
            mock_db.execute_query = AsyncMock(return_value=[
                dict(i) for i in sample_issues
            ])

            result = await get_issues_tool.execute(
                {"project_id": "project-123"},
                admin_context,
            )

            assert len(result["issues"]) == 3
            assert result["filters"]["project"] == "project-123"

    @pytest.mark.asyncio
    async def test_get_issues_filters_by_status(
        self, get_issues_tool, admin_context, sample_issues
    ):
        """Test 2: Status filter works correctly."""
        with patch(
            "src.agent.tools.projects.get_issues.db_manager"
        ) as mock_db:
            mock_db.execute_query = AsyncMock(return_value=[
                dict(i) for i in sample_issues
            ])

            result = await get_issues_tool.execute(
                {"status_filter": "open"},
                admin_context,
            )

            # Only open issues returned
            assert all(i["status"] == "open" for i in result["issues"])

    @pytest.mark.asyncio
    async def test_get_issues_filters_by_priority(
        self, get_issues_tool, admin_context, sample_issues
    ):
        """Test 3: Priority filter works correctly."""
        with patch(
            "src.agent.tools.projects.get_issues.db_manager"
        ) as mock_db:
            mock_db.execute_query = AsyncMock(return_value=[
                dict(i) for i in sample_issues
            ])

            result = await get_issues_tool.execute(
                {"priority_filter": "critical"},
                admin_context,
            )

            # Only critical issues returned
            assert all(i["priority"] == "critical" for i in result["issues"])

    @pytest.mark.asyncio
    async def test_get_issues_all_roles_can_access(
        self, get_issues_tool, crew_context, sample_issues
    ):
        """Test 4: All roles have permission to access."""
        with patch(
            "src.agent.tools.projects.get_issues.db_manager"
        ) as mock_db:
            mock_db.execute_query = AsyncMock(return_value=[
                dict(i) for i in sample_issues
            ])

            result = await get_issues_tool.execute({}, crew_context)

            # Crew can see issues
            assert "issues" in result
            assert len(result["issues"]) == 3

    @pytest.mark.asyncio
    async def test_get_issues_respects_company(
        self, get_issues_tool, admin_context
    ):
        """Test 5: Company isolation works correctly."""
        with patch(
            "src.agent.tools.projects.get_issues.db_manager"
        ) as mock_db:
            mock_db.execute_query = AsyncMock(return_value=[])

            await get_issues_tool.execute({}, admin_context)

            # Verify company filter was applied
            call_args = mock_db.execute_query.call_args
            query = call_args[0][0]
            params = call_args[0][1:]

            assert "company_id" in query
            assert "company-123" in params

