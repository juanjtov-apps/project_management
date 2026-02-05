"""
Tests for get_projects.py - 5 tests

Tests project listing with filtering and RBAC.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.agent.tools.projects.get_projects import GetProjectsTool


@pytest.fixture
def get_projects_tool():
    """Create a GetProjectsTool instance."""
    return GetProjectsTool()


class TestGetProjectsProperties:
    """Tests for tool metadata."""

    def test_tool_name(self, get_projects_tool):
        """Verify tool name."""
        assert get_projects_tool.name == "get_projects"

    def test_tool_permissions(self, get_projects_tool):
        """Verify only admin/PM/OM can use this tool."""
        expected = ["admin", "project_manager", "office_manager"]
        assert get_projects_tool.permissions == expected
        # Crew and client should NOT have access
        assert "crew" not in get_projects_tool.permissions
        assert "client" not in get_projects_tool.permissions


class TestGetProjectsExecution:
    """Tests for project listing."""

    @pytest.mark.asyncio
    async def test_get_projects_returns_company_projects(
        self, get_projects_tool, admin_context, sample_projects
    ):
        """Test 1: Returns projects filtered by company."""
        with patch(
            "src.agent.tools.projects.get_projects.ProjectRepository"
        ) as MockRepo:
            mock_repo = MagicMock()
            mock_repo.get_by_company = AsyncMock(return_value=sample_projects)
            MockRepo.return_value = mock_repo

            result = await get_projects_tool.execute({}, admin_context)

            mock_repo.get_by_company.assert_called_once_with("company-123")
            assert result["totalCount"] == 3
            assert len(result["projects"]) == 3

    @pytest.mark.asyncio
    async def test_get_projects_with_status_filter(
        self, get_projects_tool, admin_context, sample_projects
    ):
        """Test 2: Status filter works correctly."""
        with patch(
            "src.agent.tools.projects.get_projects.ProjectRepository"
        ) as MockRepo:
            mock_repo = MagicMock()
            mock_repo.get_by_company = AsyncMock(return_value=sample_projects)
            MockRepo.return_value = mock_repo

            result = await get_projects_tool.execute(
                {"status_filter": "active"},
                admin_context,
            )

            # Only 2 projects have status "active"
            assert result["totalCount"] == 2
            assert all(p["status"] == "active" for p in result["projects"])

    @pytest.mark.asyncio
    async def test_get_projects_with_search_query(
        self, get_projects_tool, admin_context, sample_projects
    ):
        """Test 3: Search filter works on name/location/client."""
        with patch(
            "src.agent.tools.projects.get_projects.ProjectRepository"
        ) as MockRepo:
            mock_repo = MagicMock()
            mock_repo.get_by_company = AsyncMock(return_value=sample_projects)
            MockRepo.return_value = mock_repo

            result = await get_projects_tool.execute(
                {"search_query": "tesoro"},
                admin_context,
            )

            # Only "Via Tesoro" should match
            assert result["totalCount"] == 1
            assert result["projects"][0]["name"] == "Via Tesoro"

    @pytest.mark.asyncio
    async def test_get_projects_returns_summary_counts(
        self, get_projects_tool, admin_context, sample_projects
    ):
        """Test 4: Summary status counts are correct."""
        with patch(
            "src.agent.tools.projects.get_projects.ProjectRepository"
        ) as MockRepo:
            mock_repo = MagicMock()
            mock_repo.get_by_company = AsyncMock(return_value=sample_projects)
            MockRepo.return_value = mock_repo

            result = await get_projects_tool.execute({}, admin_context)

            assert "statusCounts" in result
            assert result["statusCounts"]["active"] == 2
            assert result["statusCounts"]["completed"] == 1

    @pytest.mark.asyncio
    async def test_get_projects_without_company_gets_all(
        self, get_projects_tool, sample_projects
    ):
        """Test 5: Without company_id, gets all projects."""
        context = {"role": "admin"}  # No company_id

        with patch(
            "src.agent.tools.projects.get_projects.ProjectRepository"
        ) as MockRepo:
            mock_repo = MagicMock()
            mock_repo.get_all = AsyncMock(return_value=sample_projects)
            MockRepo.return_value = mock_repo

            result = await get_projects_tool.execute({}, context)

            mock_repo.get_all.assert_called_once()
            assert result["totalCount"] == 3

