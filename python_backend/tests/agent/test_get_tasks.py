"""
Tests for get_tasks.py - 5 tests

Tests task retrieval with filtering and date handling.
"""

import pytest
from datetime import date, timedelta
from unittest.mock import AsyncMock, patch

from src.agent.tools.projects.get_tasks import GetTasksTool


@pytest.fixture
def get_tasks_tool():
    """Create a GetTasksTool instance."""
    return GetTasksTool()


class TestGetTasksProperties:
    """Tests for tool metadata."""

    def test_tool_name(self, get_tasks_tool):
        """Verify tool name."""
        assert get_tasks_tool.name == "get_tasks"

    def test_tool_permissions(self, get_tasks_tool):
        """Verify crew and subcontractor can access tasks."""
        expected = ["admin", "project_manager", "office_manager", "crew", "subcontractor"]
        assert get_tasks_tool.permissions == expected
        # Client should NOT have access
        assert "client" not in get_tasks_tool.permissions


class TestGetTasksExecution:
    """Tests for task retrieval."""

    @pytest.mark.asyncio
    async def test_get_tasks_filters_by_project(
        self, get_tasks_tool, admin_context, sample_tasks
    ):
        """Test 1: Returns tasks filtered by project."""
        with patch(
            "src.agent.tools.projects.get_tasks.db_manager"
        ) as mock_db:
            mock_db.execute_query = AsyncMock(return_value=[
                dict(t) for t in sample_tasks
            ])

            result = await get_tasks_tool.execute(
                {"project_id": "project-123"},
                admin_context,
            )

            assert result["projectId"] == "project-123"
            assert len(result["tasks"]) <= 50  # Limit applied

    @pytest.mark.asyncio
    async def test_get_tasks_filters_by_status(
        self, get_tasks_tool, admin_context, sample_tasks
    ):
        """Test 2: Status filter works correctly."""
        with patch(
            "src.agent.tools.projects.get_tasks.db_manager"
        ) as mock_db:
            mock_db.execute_query = AsyncMock(return_value=[
                dict(t) for t in sample_tasks
            ])

            result = await get_tasks_tool.execute(
                {"status_filter": "pending"},
                admin_context,
            )

            # Only pending tasks returned
            assert all(t["status"] == "pending" for t in result["tasks"])

    @pytest.mark.asyncio
    async def test_get_tasks_due_this_week(
        self, get_tasks_tool, admin_context
    ):
        """Test 3: This week date filter works."""
        today = date.today()
        monday = today - timedelta(days=today.weekday())
        sunday = monday + timedelta(days=6)

        tasks_this_week = [
            {"id": "t1", "title": "Task 1", "status": "pending", "due_date": monday},
            {"id": "t2", "title": "Task 2", "status": "pending", "due_date": sunday},
        ]
        tasks_not_this_week = [
            {"id": "t3", "title": "Task 3", "status": "pending", "due_date": monday - timedelta(days=7)},
        ]

        with patch(
            "src.agent.tools.projects.get_tasks.db_manager"
        ) as mock_db:
            mock_db.execute_query = AsyncMock(
                return_value=tasks_this_week + tasks_not_this_week
            )

            result = await get_tasks_tool.execute(
                {"due_this_week": True},
                admin_context,
            )

            # Only tasks within this week returned
            assert len(result["tasks"]) == 2

    @pytest.mark.asyncio
    async def test_get_tasks_overdue_only(
        self, get_tasks_tool, admin_context
    ):
        """Test 4: Overdue filter works correctly."""
        today = date.today()

        all_tasks = [
            {"id": "t1", "title": "Overdue", "status": "pending", "due_date": today - timedelta(days=5)},
            {"id": "t2", "title": "Not overdue", "status": "pending", "due_date": today + timedelta(days=5)},
            {"id": "t3", "title": "Completed", "status": "completed", "due_date": today - timedelta(days=5)},
        ]

        with patch(
            "src.agent.tools.projects.get_tasks.db_manager"
        ) as mock_db:
            mock_db.execute_query = AsyncMock(return_value=all_tasks)

            result = await get_tasks_tool.execute(
                {"overdue_only": True},
                admin_context,
            )

            # Only incomplete overdue tasks
            assert len(result["tasks"]) == 1
            assert result["tasks"][0]["title"] == "Overdue"

    @pytest.mark.asyncio
    async def test_get_tasks_includes_summary(
        self, get_tasks_tool, admin_context, sample_tasks
    ):
        """Test 5: Summary counts are correct."""
        with patch(
            "src.agent.tools.projects.get_tasks.db_manager"
        ) as mock_db:
            mock_db.execute_query = AsyncMock(return_value=[
                dict(t) for t in sample_tasks
            ])

            result = await get_tasks_tool.execute({}, admin_context)

            summary = result["summary"]
            assert "totalTasks" in summary
            assert "pending" in summary
            assert "completed" in summary
            # 2 pending tasks in sample_tasks
            assert summary["pending"] == 2
            # 1 completed in sample
            assert summary["completed"] == 1

