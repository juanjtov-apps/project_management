"""
Tests for get_project_detail.py - 5 tests

Tests project detail retrieval with related data.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.agent.tools.projects.get_project_detail import GetProjectDetailTool


@pytest.fixture
def get_project_detail_tool():
    """Create a GetProjectDetailTool instance."""
    return GetProjectDetailTool()


class TestGetProjectDetailProperties:
    """Tests for tool metadata."""

    def test_tool_name(self, get_project_detail_tool):
        """Verify tool name."""
        assert get_project_detail_tool.name == "get_project_detail"

    def test_tool_permissions(self, get_project_detail_tool):
        """Verify only admin/PM/OM can use this tool."""
        expected = ["admin", "project_manager", "office_manager"]
        assert get_project_detail_tool.permissions == expected


class TestGetProjectDetailExecution:
    """Tests for project detail retrieval."""

    @pytest.mark.asyncio
    async def test_get_project_detail_by_id(
        self, get_project_detail_tool, admin_context, sample_project
    ):
        """Test 1: Returns full project details by ID."""
        with patch(
            "src.agent.tools.projects.get_project_detail.ProjectRepository"
        ) as MockRepo:
            mock_repo = MagicMock()
            mock_project = MagicMock()
            mock_project.id = sample_project["id"]
            mock_project.name = sample_project["name"]
            mock_project.description = sample_project["description"]
            mock_project.status = sample_project["status"]
            mock_project.progress = sample_project["progress"]
            mock_project.location = sample_project["location"]
            mock_project.dueDate = sample_project["due_date"]
            mock_project.budget = None
            mock_project.actualCost = None
            mock_project.clientName = sample_project["client_name"]
            mock_project.clientEmail = None
            mock_project.companyId = sample_project["company_id"]
            mock_repo.get_by_id = AsyncMock(return_value=mock_project)
            MockRepo.return_value = mock_repo

            with patch(
                "src.agent.tools.projects.get_project_detail.db_manager"
            ) as mock_db:
                mock_db.execute_query = AsyncMock(return_value=[])

                result = await get_project_detail_tool.execute(
                    {"project_id": "project-123"},
                    admin_context,
                )

                assert result.get("error") is None
                assert result["project"]["id"] == "project-123"
                assert result["project"]["name"] == "Via Tesoro"

    @pytest.mark.asyncio
    async def test_get_project_detail_by_name(
        self, get_project_detail_tool, admin_context, sample_projects
    ):
        """Test 2: Name lookup works correctly."""
        with patch(
            "src.agent.tools.projects.get_project_detail.ProjectRepository"
        ) as MockRepo:
            mock_repo = MagicMock()
            mock_repo.get_by_company = AsyncMock(return_value=sample_projects)
            MockRepo.return_value = mock_repo

            with patch(
                "src.agent.tools.projects.get_project_detail.db_manager"
            ) as mock_db:
                mock_db.execute_query = AsyncMock(return_value=[])

                result = await get_project_detail_tool.execute(
                    {"project_name": "tesoro"},
                    admin_context,
                )

                assert result.get("error") is None
                assert result["project"]["name"] == "Via Tesoro"

    @pytest.mark.asyncio
    async def test_get_project_detail_not_found(
        self, get_project_detail_tool, admin_context
    ):
        """Test 3: Returns error for invalid project."""
        with patch(
            "src.agent.tools.projects.get_project_detail.ProjectRepository"
        ) as MockRepo:
            mock_repo = MagicMock()
            mock_repo.get_by_id = AsyncMock(return_value=None)
            MockRepo.return_value = mock_repo

            result = await get_project_detail_tool.execute(
                {"project_id": "nonexistent"},
                admin_context,
            )

            assert result.get("error") == "Project not found"

    @pytest.mark.asyncio
    async def test_get_project_detail_includes_stages(
        self, get_project_detail_tool, admin_context
    ):
        """Test 4: Stages are included when requested."""
        sample_stages = [
            {"id": "s1", "name": "Foundation", "status": "COMPLETED", "order_index": 1},
            {"id": "s2", "name": "Framing", "status": "ACTIVE", "order_index": 2},
        ]

        with patch(
            "src.agent.tools.projects.get_project_detail.ProjectRepository"
        ) as MockRepo:
            mock_repo = MagicMock()
            mock_project = MagicMock()
            mock_project.id = "project-123"
            mock_project.name = "Via Tesoro"
            mock_project.description = None
            mock_project.status = "active"
            mock_project.progress = 45
            mock_project.location = None
            mock_project.dueDate = None
            mock_project.budget = None
            mock_project.actualCost = None
            mock_project.clientName = None
            mock_project.clientEmail = None
            mock_project.companyId = "company-123"
            mock_repo.get_by_id = AsyncMock(return_value=mock_project)
            MockRepo.return_value = mock_repo

            with patch(
                "src.agent.tools.projects.get_project_detail.db_manager"
            ) as mock_db:
                # Return empty for tasks, stages for stages calls, empty for payments/issues/materials/legacy
                mock_db.execute_query = AsyncMock(
                    side_effect=[[], sample_stages, sample_stages, [], [], [], []]
                )

                result = await get_project_detail_tool.execute(
                    {"project_id": "project-123", "include_stages": True},
                    admin_context,
                )

                assert "stages" in result
                assert result["stages"]["totalCount"] == 2

    @pytest.mark.asyncio
    async def test_get_project_detail_includes_task_summary(
        self, get_project_detail_tool, admin_context, sample_tasks
    ):
        """Test 5: Task summary is included."""
        with patch(
            "src.agent.tools.projects.get_project_detail.ProjectRepository"
        ) as MockRepo:
            mock_repo = MagicMock()
            mock_project = MagicMock()
            mock_project.id = "project-123"
            mock_project.name = "Via Tesoro"
            mock_project.description = None
            mock_project.status = "active"
            mock_project.progress = 45
            mock_project.location = None
            mock_project.dueDate = None
            mock_project.budget = None
            mock_project.actualCost = None
            mock_project.clientName = None
            mock_project.clientEmail = None
            mock_project.companyId = "company-123"
            mock_repo.get_by_id = AsyncMock(return_value=mock_project)
            MockRepo.return_value = mock_repo

            with patch(
                "src.agent.tools.projects.get_project_detail.db_manager"
            ) as mock_db:
                # Return tasks, then empty for stages/stages-summary/payments/issues/materials/legacy
                mock_db.execute_query = AsyncMock(
                    side_effect=[sample_tasks, [], [], [], [], [], []]
                )

                result = await get_project_detail_tool.execute(
                    {"project_id": "project-123", "include_tasks": True},
                    admin_context,
                )

                assert "tasks" in result
                assert result["tasks"]["totalCount"] == 4
                assert result["tasks"]["completedCount"] == 1

