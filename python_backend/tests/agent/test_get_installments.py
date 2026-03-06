"""
Tests for get_installments.py - 5 tests

Tests payment installment retrieval with status and amount calculations.
"""

import pytest
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, patch

from src.agent.tools.projects.get_installments import GetInstallmentsTool


@pytest.fixture
def get_installments_tool():
    """Create a GetInstallmentsTool instance."""
    return GetInstallmentsTool()


class TestGetInstallmentsProperties:
    """Tests for tool metadata."""

    def test_tool_name(self, get_installments_tool):
        """Verify tool name."""
        assert get_installments_tool.name == "get_installments"

    def test_tool_permissions(self, get_installments_tool):
        """Verify only admin, office_manager, and client can access payments."""
        assert "admin" in get_installments_tool.permissions
        assert "office_manager" in get_installments_tool.permissions
        assert "client" in get_installments_tool.permissions
        # PM, crew, and subcontractor should NOT have access
        assert "project_manager" not in get_installments_tool.permissions
        assert "crew" not in get_installments_tool.permissions
        assert "subcontractor" not in get_installments_tool.permissions


class TestGetInstallmentsExecution:
    """Tests for installment retrieval."""

    @pytest.mark.asyncio
    async def test_get_installments_by_project(
        self, get_installments_tool, admin_context, sample_installments
    ):
        """Test 1: Returns installments for a project."""
        with patch(
            "src.agent.tools.projects.get_installments.db_manager"
        ) as mock_db, patch(
            "src.agent.tools.security.verify_project_access",
            new_callable=AsyncMock, return_value={"id": "project-123", "name": "Test"},
        ):
            mock_db.execute_query = AsyncMock(return_value=sample_installments)

            result = await get_installments_tool.execute(
                {"project_id": "project-123"},
                admin_context,
            )

            assert result.get("error") is None
            assert len(result["installments"]) == 4

    @pytest.mark.asyncio
    async def test_get_installments_status_filter(
        self, get_installments_tool, admin_context, sample_installments
    ):
        """Test 2: Status filter works correctly."""
        with patch(
            "src.agent.tools.projects.get_installments.db_manager"
        ) as mock_db:
            mock_db.execute_query = AsyncMock(return_value=sample_installments)

            result = await get_installments_tool.execute(
                {"status_filter": "paid"},
                admin_context,
            )

            # Only paid installments returned
            assert all(i["status"] == "paid" for i in result["installments"])

    @pytest.mark.asyncio
    async def test_get_installments_calculates_totals(
        self, get_installments_tool, admin_context, sample_installments
    ):
        """Test 3: Amount totals are calculated correctly."""
        with patch(
            "src.agent.tools.projects.get_installments.db_manager"
        ) as mock_db, patch(
            "src.agent.tools.security.verify_project_access",
            new_callable=AsyncMock, return_value={"id": "project-123", "name": "Test"},
        ):
            mock_db.execute_query = AsyncMock(return_value=sample_installments)

            result = await get_installments_tool.execute(
                {"project_id": "project-123"},
                admin_context,
            )

            summary = result["summary"]
            # Total: 50000 + 75000 + 100000 + 25000 = 250000
            assert summary["totalAmount"] == 250000.00
            # Paid: 50000
            assert summary["paidAmount"] == 50000.00

    @pytest.mark.asyncio
    async def test_get_installments_identifies_overdue(
        self, get_installments_tool, admin_context
    ):
        """Test 4: Overdue payments are correctly flagged."""
        today = date.today()
        installments = [
            {
                "id": "inst-1",
                "name": "Overdue payment",
                "amount": 25000.00,
                "status": "payable",
                "due_date": today - timedelta(days=10),
            },
            {
                "id": "inst-2",
                "name": "Upcoming payment",
                "amount": 50000.00,
                "status": "payable",
                "due_date": today + timedelta(days=10),
            },
        ]

        with patch(
            "src.agent.tools.projects.get_installments.db_manager"
        ) as mock_db, patch(
            "src.agent.tools.security.verify_project_access",
            new_callable=AsyncMock, return_value={"id": "project-123", "name": "Test"},
        ):
            mock_db.execute_query = AsyncMock(return_value=installments)

            result = await get_installments_tool.execute(
                {"project_id": "project-123", "status_filter": "overdue"},
                admin_context,
            )

            # Only overdue payment should be returned
            assert len(result["installments"]) == 1
            assert result["installments"][0]["name"] == "Overdue payment"

    @pytest.mark.asyncio
    async def test_get_installments_client_can_access(
        self, get_installments_tool, client_context, sample_installments
    ):
        """Test 5: Client role has permission to access."""
        with patch(
            "src.agent.tools.projects.get_installments.db_manager"
        ) as mock_db, patch(
            "src.agent.tools.security.verify_project_access",
            new_callable=AsyncMock, return_value={"id": "project-123", "name": "Test"},
        ):
            mock_db.execute_query = AsyncMock(return_value=sample_installments)

            result = await get_installments_tool.execute(
                {"project_id": "project-123"},
                client_context,
            )

            # Client should see the data
            assert result.get("error") is None
            assert len(result["installments"]) == 4

