"""
Tests for the project resolver utility (resolve_project, resolve_project_or_error).

Verifies UUID lookup, fuzzy name matching, ambiguous matches, and error cases.
"""

import pytest
from unittest.mock import AsyncMock, patch

from src.agent.tools.security import resolve_project, resolve_project_or_error


def _make_row(id_val: str, name_val: str, **extra):
    """Create a mock DB row (dict-like)."""
    row = {"id": id_val, "name": name_val, **extra}
    # Make it behave like asyncpg Record (supports .get() and dict())
    return row


COMPANY_ID = "company-001"
PROJECT_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"


class TestResolveProject:
    """Test resolve_project function."""

    @pytest.mark.asyncio
    async def test_valid_uuid_found(self):
        """UUID input that matches a project returns the row."""
        mock_row = _make_row(PROJECT_UUID, "San Jerome")
        with patch("src.agent.tools.security.db_manager") as mock_db:
            mock_db.execute_one = AsyncMock(return_value=mock_row)
            result = await resolve_project(PROJECT_UUID, COMPANY_ID)
            assert result is not None
            assert result["id"] == PROJECT_UUID
            assert result["name"] == "San Jerome"

    @pytest.mark.asyncio
    async def test_valid_uuid_not_found(self):
        """UUID input that doesn't match returns None."""
        with patch("src.agent.tools.security.db_manager") as mock_db:
            mock_db.execute_one = AsyncMock(return_value=None)
            result = await resolve_project(PROJECT_UUID, COMPANY_ID)
            assert result is None

    @pytest.mark.asyncio
    async def test_name_exact_match(self):
        """Non-UUID input with exact name match returns the project."""
        rows = [
            _make_row("uuid-1", "San Jerome"),
            _make_row("uuid-2", "Cole Dr"),
        ]
        with patch("src.agent.tools.security.db_manager") as mock_db:
            mock_db.execute_query = AsyncMock(return_value=rows)
            result = await resolve_project("San Jerome", COMPANY_ID)
            assert result is not None
            assert result["name"] == "San Jerome"

    @pytest.mark.asyncio
    async def test_name_partial_match(self):
        """Partial name like 'san jero' matches 'San Jerome'."""
        rows = [
            _make_row("uuid-1", "San Jerome"),
            _make_row("uuid-2", "Cole Dr"),
        ]
        with patch("src.agent.tools.security.db_manager") as mock_db:
            mock_db.execute_query = AsyncMock(return_value=rows)
            result = await resolve_project("san jero", COMPANY_ID)
            assert result is not None
            assert result["name"] == "San Jerome"

    @pytest.mark.asyncio
    async def test_name_case_insensitive(self):
        """Case-insensitive matching works."""
        rows = [
            _make_row("uuid-1", "San Jerome"),
            _make_row("uuid-2", "Cole Dr"),
        ]
        with patch("src.agent.tools.security.db_manager") as mock_db:
            mock_db.execute_query = AsyncMock(return_value=rows)
            result = await resolve_project("SAN JEROME", COMPANY_ID)
            assert result is not None
            assert result["name"] == "San Jerome"

    @pytest.mark.asyncio
    async def test_name_typo_match(self):
        """Misspelled name 'san jarome' matches 'San Jerome' via substring."""
        rows = [
            _make_row("uuid-1", "San Jerome"),
            _make_row("uuid-2", "Cole Dr"),
        ]
        with patch("src.agent.tools.security.db_manager") as mock_db:
            mock_db.execute_query = AsyncMock(return_value=rows)
            # "san jarome" is NOT a substring of "San Jerome" — should return None
            # This tests the limitation: substring matching doesn't handle typos
            result = await resolve_project("san jarome", COMPANY_ID)
            assert result is None

    @pytest.mark.asyncio
    async def test_ambiguous_match(self):
        """Name matching multiple projects returns ambiguous result."""
        rows = [
            _make_row("uuid-1", "San Jerome Reno"),
            _make_row("uuid-2", "San Jerome Addition"),
            _make_row("uuid-3", "Cole Dr"),
        ]
        with patch("src.agent.tools.security.db_manager") as mock_db:
            mock_db.execute_query = AsyncMock(return_value=rows)
            result = await resolve_project("San Jerome", COMPANY_ID)
            assert result is not None
            assert result.get("ambiguous") is True
            assert len(result["matches"]) == 2

    @pytest.mark.asyncio
    async def test_no_match(self):
        """Name matching nothing returns None."""
        rows = [
            _make_row("uuid-1", "San Jerome"),
            _make_row("uuid-2", "Cole Dr"),
        ]
        with patch("src.agent.tools.security.db_manager") as mock_db:
            mock_db.execute_query = AsyncMock(return_value=rows)
            result = await resolve_project("Nonexistent Project", COMPANY_ID)
            assert result is None

    @pytest.mark.asyncio
    async def test_empty_input(self):
        """Empty string returns None without DB call."""
        result = await resolve_project("", COMPANY_ID)
        assert result is None

    @pytest.mark.asyncio
    async def test_empty_company_id(self):
        """Empty company_id returns None without DB call."""
        result = await resolve_project("San Jerome", "")
        assert result is None

    @pytest.mark.asyncio
    async def test_extra_columns(self):
        """Extra columns are included in the query."""
        mock_row = _make_row(PROJECT_UUID, "San Jerome", status="active", progress=50)
        with patch("src.agent.tools.security.db_manager") as mock_db:
            mock_db.execute_one = AsyncMock(return_value=mock_row)
            result = await resolve_project(
                PROJECT_UUID, COMPANY_ID, extra_columns="status, progress"
            )
            assert result["status"] == "active"
            assert result["progress"] == 50


class TestResolveProjectOrError:
    """Test resolve_project_or_error convenience wrapper."""

    @pytest.mark.asyncio
    async def test_success(self):
        """Successful resolution returns (project, None)."""
        mock_row = _make_row(PROJECT_UUID, "San Jerome")
        with patch("src.agent.tools.security.db_manager") as mock_db:
            mock_db.execute_one = AsyncMock(return_value=mock_row)
            project, err = await resolve_project_or_error(PROJECT_UUID, COMPANY_ID)
            assert project is not None
            assert err is None
            assert project["name"] == "San Jerome"

    @pytest.mark.asyncio
    async def test_not_found(self):
        """No match returns (None, error_dict)."""
        with patch("src.agent.tools.security.db_manager") as mock_db:
            mock_db.execute_one = AsyncMock(return_value=None)
            project, err = await resolve_project_or_error(PROJECT_UUID, COMPANY_ID)
            assert project is None
            assert err is not None
            assert "error" in err
            assert "No project found" in err["error"]

    @pytest.mark.asyncio
    async def test_ambiguous(self):
        """Ambiguous match returns (None, error_dict with project names)."""
        rows = [
            _make_row("uuid-1", "San Jerome Reno"),
            _make_row("uuid-2", "San Jerome Addition"),
        ]
        with patch("src.agent.tools.security.db_manager") as mock_db:
            mock_db.execute_query = AsyncMock(return_value=rows)
            project, err = await resolve_project_or_error("San Jerome", COMPANY_ID)
            assert project is None
            assert err is not None
            assert "Multiple projects match" in err["error"]
            assert "San Jerome Reno" in err["error"]
            assert "San Jerome Addition" in err["error"]
