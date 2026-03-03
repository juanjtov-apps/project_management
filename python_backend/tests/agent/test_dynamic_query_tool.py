"""
Tests for dynamic_query_tool.py - 20 tests

Tests the primary database query tool with RBAC and filtering.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import date, datetime
from decimal import Decimal

from src.agent.tools.dynamic.dynamic_query_tool import DynamicQueryTool


@pytest.fixture
def query_tool():
    """Create a DynamicQueryTool instance."""
    return DynamicQueryTool()


class TestDynamicQueryToolProperties:
    """Tests for tool metadata."""

    def test_tool_name(self, query_tool):
        """Test 1: Verify tool name is query_database."""
        assert query_tool.name == "query_database"

    def test_tool_permissions_all_roles(self, query_tool):
        """Test 2: All roles can use the query tool."""
        expected_roles = ["admin", "project_manager", "office_manager", "crew", "subcontractor", "client"]
        assert all(role in query_tool.permissions for role in expected_roles)

    def test_tool_is_read_only(self, query_tool):
        """Test 3: Tool should be read-only."""
        from src.agent.models.agent_models import SafetyLevel
        assert query_tool.safety_level == SafetyLevel.READ_ONLY


class TestDynamicQueryToolExecution:
    """Tests for query execution."""

    @pytest.mark.asyncio
    async def test_query_projects_as_admin(self, query_tool, admin_context):
        """Test 4: Admin can query projects."""
        with patch("src.agent.tools.dynamic.dynamic_query_tool.db_manager") as mock_db:
            mock_db.execute_query = AsyncMock(return_value=[
                {"id": "p1", "name": "Via Tesoro", "status": "active", "company_id": "company-123"}
            ])

            result = await query_tool.execute(
                {"data_type": "projects"},
                admin_context,
            )

            assert result.get("error") is None
            assert result["count"] == 1
            assert result["table"] == "projects"

    @pytest.mark.asyncio
    async def test_query_projects_as_crew_denied(self, query_tool, crew_context):
        """Test 5: Crew cannot query projects."""
        result = await query_tool.execute(
            {"data_type": "projects"},
            crew_context,
        )

        assert result.get("error") is not None
        assert "Access denied" in result["error"]

    @pytest.mark.asyncio
    async def test_query_tasks_as_crew_allowed(self, query_tool, crew_context):
        """Test 6: Crew can query tasks."""
        with patch("src.agent.tools.dynamic.dynamic_query_tool.db_manager") as mock_db:
            mock_db.execute_query = AsyncMock(return_value=[
                {"id": "t1", "title": "Install drywall", "status": "pending", "project_id": "p1"}
            ])

            result = await query_tool.execute(
                {"data_type": "tasks"},
                crew_context,
            )

            assert result.get("error") is None
            assert result["table"] == "tasks"

    @pytest.mark.asyncio
    async def test_query_payments_as_client_allowed(self, query_tool, client_context):
        """Test 7: Client can query payments."""
        with patch("src.agent.tools.dynamic.dynamic_query_tool.db_manager") as mock_db:
            mock_db.execute_query = AsyncMock(return_value=[
                {"id": "inst1", "name": "Deposit", "amount": Decimal("50000.00"), "status": "paid"}
            ])

            result = await query_tool.execute(
                {"data_type": "payments"},
                client_context,
            )

            assert result.get("error") is None
            assert result["table"] == "payment_installments"

    @pytest.mark.asyncio
    async def test_query_payments_as_crew_denied(self, query_tool, crew_context):
        """Test 8: Crew cannot query payments."""
        result = await query_tool.execute(
            {"data_type": "payments"},
            crew_context,
        )

        assert result.get("error") is not None
        assert "Access denied" in result["error"]


class TestProjectNameResolution:
    """Tests for project name to ID resolution."""

    @pytest.mark.asyncio
    async def test_query_with_project_name_resolution(self, query_tool, admin_context):
        """Test 9: Project name resolves to ID correctly."""
        with patch("src.agent.tools.dynamic.dynamic_query_tool.db_manager") as mock_db:
            # First call resolves project name
            # Second call gets the actual data
            mock_db.execute_query = AsyncMock(side_effect=[
                [{"id": "p1", "name": "Via Tesoro"}],  # Project lookup
                [{"id": "t1", "title": "Task 1", "status": "pending", "project_id": "p1"}],  # Tasks query
            ])

            result = await query_tool.execute(
                {"data_type": "tasks", "project_name": "Via Tesoro"},
                admin_context,
            )

            assert result.get("error") is None
            assert result["projectFilter"] == "Via Tesoro"

    @pytest.mark.asyncio
    async def test_query_with_ambiguous_project_name(self, query_tool, admin_context):
        """Test 10: Returns matches for disambiguation."""
        with patch("src.agent.tools.dynamic.dynamic_query_tool.db_manager") as mock_db:
            mock_db.execute_query = AsyncMock(return_value=[
                {"id": "p1", "name": "Cole Dr"},
                {"id": "p2", "name": "Cole Ave"},
            ])

            result = await query_tool.execute(
                {"data_type": "tasks", "project_name": "Cole"},
                admin_context,
            )

            assert result.get("error") == "multiple_projects_found"
            assert "matches" in result
            assert len(result["matches"]) == 2

    @pytest.mark.asyncio
    async def test_query_with_nonexistent_project(self, query_tool, admin_context):
        """Test 11: Returns not found error."""
        with patch("src.agent.tools.dynamic.dynamic_query_tool.db_manager") as mock_db:
            mock_db.execute_query = AsyncMock(return_value=[])

            result = await query_tool.execute(
                {"data_type": "tasks", "project_name": "NonExistent"},
                admin_context,
            )

            assert result.get("error") == "project_not_found"


class TestFiltering:
    """Tests for various filter types."""

    @pytest.mark.asyncio
    async def test_query_with_status_filter(self, query_tool, admin_context):
        """Test 12: Status filter works."""
        with patch("src.agent.tools.dynamic.dynamic_query_tool.db_manager") as mock_db:
            mock_db.execute_query = AsyncMock(return_value=[
                {"id": "t1", "title": "Task 1", "status": "pending"}
            ])

            result = await query_tool.execute(
                {"data_type": "tasks", "status": "pending"},
                admin_context,
            )

            assert result.get("error") is None
            assert result["statusFilter"] == "pending"

    @pytest.mark.asyncio
    async def test_query_with_priority_filter(self, query_tool, admin_context):
        """Test 13: Priority filter works."""
        with patch("src.agent.tools.dynamic.dynamic_query_tool.db_manager") as mock_db:
            mock_db.execute_query = AsyncMock(return_value=[
                {"id": "t1", "title": "Task 1", "priority": "high"}
            ])

            result = await query_tool.execute(
                {"data_type": "tasks", "priority": "high"},
                admin_context,
            )

            assert result.get("error") is None
            assert result["priorityFilter"] == "high"

    @pytest.mark.asyncio
    async def test_query_with_date_filter(self, query_tool, admin_context):
        """Test 14: Date filter works."""
        with patch("src.agent.tools.dynamic.dynamic_query_tool.db_manager") as mock_db:
            mock_db.execute_query = AsyncMock(return_value=[])

            result = await query_tool.execute(
                {"data_type": "tasks", "date_filter": "this_week"},
                admin_context,
            )

            assert result.get("error") is None
            assert result["dateFilter"] == "this_week"


class TestResultFormatting:
    """Tests for result formatting."""

    @pytest.mark.asyncio
    async def test_query_formats_dates(self, query_tool, admin_context):
        """Test 15: Dates are converted to ISO strings."""
        with patch("src.agent.tools.dynamic.dynamic_query_tool.db_manager") as mock_db:
            test_date = date(2024, 1, 15)
            mock_db.execute_query = AsyncMock(return_value=[
                {"id": "t1", "title": "Task 1", "due_date": test_date}
            ])

            result = await query_tool.execute(
                {"data_type": "tasks"},
                admin_context,
            )

            assert result["results"][0]["due_date"] == "2024-01-15"

    @pytest.mark.asyncio
    async def test_query_formats_decimals(self, query_tool, admin_context):
        """Test 16: Decimals are converted to floats."""
        with patch("src.agent.tools.dynamic.dynamic_query_tool.db_manager") as mock_db:
            mock_db.execute_query = AsyncMock(return_value=[
                {"id": "i1", "name": "Deposit", "amount": Decimal("50000.00")}
            ])

            result = await query_tool.execute(
                {"data_type": "payments"},
                admin_context,
            )

            assert result["results"][0]["amount"] == 50000.00
            assert isinstance(result["results"][0]["amount"], float)


class TestSummaryBuilding:
    """Tests for summary statistics."""

    @pytest.mark.asyncio
    async def test_query_builds_summary_for_payments(self, query_tool, admin_context):
        """Test 17: Payment summaries include totals."""
        with patch("src.agent.tools.dynamic.dynamic_query_tool.db_manager") as mock_db:
            mock_db.execute_query = AsyncMock(return_value=[
                {"id": "i1", "name": "Deposit", "amount": 50000.00, "status": "paid"},
                {"id": "i2", "name": "Foundation", "amount": 75000.00, "status": "payable"},
            ])

            result = await query_tool.execute(
                {"data_type": "payments"},
                admin_context,
            )

            assert result["summary"]["total"] == 2
            assert result["summary"]["totalAmount"] == 125000.00
            assert result["summary"]["paidAmount"] == 50000.00
            assert result["summary"]["unpaidAmount"] == 75000.00

    @pytest.mark.asyncio
    async def test_query_builds_summary_for_tasks(self, query_tool, admin_context):
        """Test 18: Task summaries include status breakdown."""
        with patch("src.agent.tools.dynamic.dynamic_query_tool.db_manager") as mock_db:
            mock_db.execute_query = AsyncMock(return_value=[
                {"id": "t1", "title": "Task 1", "status": "pending", "priority": "high"},
                {"id": "t2", "title": "Task 2", "status": "completed", "priority": "high"},
                {"id": "t3", "title": "Task 3", "status": "pending", "priority": "low"},
            ])

            result = await query_tool.execute(
                {"data_type": "tasks"},
                admin_context,
            )

            assert result["summary"]["total"] == 3
            assert result["summary"]["byStatus"]["pending"] == 2
            assert result["summary"]["byStatus"]["completed"] == 1
            assert result["summary"]["byPriority"]["high"] == 2


class TestSecurityFiltering:
    """Tests for security enforcement."""

    @pytest.mark.asyncio
    async def test_query_requires_company_context(self, query_tool):
        """Test 19: Query fails without company_id."""
        context = {"role": "admin", "company_id": None}
        result = await query_tool.execute(
            {"data_type": "projects"},
            context,
        )

        assert result.get("error") is not None
        assert "Company context required" in result["error"]

    @pytest.mark.asyncio
    async def test_query_unknown_data_type_error(self, query_tool, admin_context):
        """Test 20: Unknown data type returns helpful error."""
        result = await query_tool.execute(
            {"data_type": "unknown_table"},
            admin_context,
        )

        assert result.get("error") is not None
        assert "Unknown data type" in result["error"]
        # Should provide hints about available types
        assert "hint" in result

