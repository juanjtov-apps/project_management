"""
Tests for query_builder.py - 10 tests

Tests safe parameterized SQL query building with security filtering.
"""

import pytest
from datetime import date, timedelta
from unittest.mock import patch

from src.agent.tools.dynamic.query_builder import QueryBuilder
from src.agent.tools.dynamic.schema_registry import TABLE_CONFIGS


class TestQueryBuilderBasics:
    """Tests for basic query building functionality."""

    def test_build_select_includes_company_filter(self):
        """Test 1: Verify company_id is always included in WHERE clause."""
        builder = QueryBuilder(
            table="projects",
            role="admin",
            company_id="company-123",
        )
        query, params = builder.build_select()

        assert "company_id = $1" in query
        assert "company-123" in params
        # Verify it's a parameterized query, not string interpolation
        assert "company-123" not in query

    def test_build_select_with_project_filter(self):
        """Test 2: Verify project_id filter is added when provided."""
        builder = QueryBuilder(
            table="tasks",
            role="admin",
            company_id="company-123",
            project_id="project-456",
        )
        query, params = builder.build_select()

        assert "project_id" in query
        assert "project-456" in params

    def test_build_select_with_status_filter(self):
        """Test 3: Verify status filter works correctly."""
        builder = QueryBuilder(
            table="tasks",
            role="admin",
            company_id="company-123",
        )
        filters = {"status": "pending"}
        query, params = builder.build_select(filters)

        assert "UPPER(" in query and "status" in query
        assert "pending" in params

    def test_build_select_respects_column_access(self):
        """Test 4: Only accessible columns are selected."""
        builder = QueryBuilder(
            table="projects",
            role="admin",
            company_id="company-123",
        )
        query, _ = builder.build_select()

        # Admin should have access to all project columns
        assert "id" in query
        assert "name" in query
        assert "status" in query

    def test_build_select_limit_cap_at_500(self):
        """Test 5: Limit is capped at 500 even if higher requested."""
        builder = QueryBuilder(
            table="projects",
            role="admin",
            company_id="company-123",
        )
        query, _ = builder.build_select(limit=1000)

        assert "LIMIT 500" in query

    def test_build_select_default_limit(self):
        """Test 6: Default limit is applied."""
        builder = QueryBuilder(
            table="projects",
            role="admin",
            company_id="company-123",
        )
        query, _ = builder.build_select()

        assert "LIMIT 100" in query


class TestQueryBuilderDateFilters:
    """Tests for date filtering functionality."""

    def test_build_date_filter_today(self):
        """Test 7: 'today' filter creates correct date range."""
        builder = QueryBuilder(
            table="tasks",
            role="admin",
            company_id="company-123",
        )
        today = date.today()
        filters = builder.build_date_filter("today")

        assert "due_date" in filters
        assert filters["due_date"]["gte"] == today
        assert filters["due_date"]["lt"] == today + timedelta(days=1)

    def test_build_date_filter_this_week(self):
        """Test 8: 'this_week' filter spans Monday to Sunday."""
        builder = QueryBuilder(
            table="tasks",
            role="admin",
            company_id="company-123",
        )
        today = date.today()
        monday = today - timedelta(days=today.weekday())
        sunday = monday + timedelta(days=6)

        filters = builder.build_date_filter("this_week")

        assert "due_date" in filters
        assert filters["due_date"]["gte"] == monday
        assert filters["due_date"]["lte"] == sunday

    def test_build_date_filter_overdue(self):
        """Test 9: 'overdue' filter finds items before today."""
        builder = QueryBuilder(
            table="tasks",
            role="admin",
            company_id="company-123",
        )
        today = date.today()
        filters = builder.build_date_filter("overdue")

        assert "due_date" in filters
        assert filters["due_date"]["lt"] == today

    def test_build_date_filter_next_n_days(self):
        """Test 10: 'next_N' filter handles variable day ranges."""
        builder = QueryBuilder(
            table="tasks",
            role="admin",
            company_id="company-123",
        )
        today = date.today()

        # Test next_7
        filters = builder.build_date_filter("next_7")
        assert "due_date" in filters
        assert filters["due_date"]["gte"] == today
        assert filters["due_date"]["lte"] == today + timedelta(days=7)

        # Test next_30
        filters = builder.build_date_filter("next_30")
        assert filters["due_date"]["lte"] == today + timedelta(days=30)


class TestQueryBuilderOperators:
    """Tests for SQL operator handling."""

    def test_get_sql_operator_returns_correct_operators(self):
        """Verify operator conversion works correctly."""
        builder = QueryBuilder(
            table="tasks",
            role="admin",
            company_id="company-123",
        )

        assert builder._get_sql_operator("eq") == "="
        assert builder._get_sql_operator("ne") == "!="
        assert builder._get_sql_operator("gt") == ">"
        assert builder._get_sql_operator("gte") == ">="
        assert builder._get_sql_operator("lt") == "<"
        assert builder._get_sql_operator("lte") == "<="
        assert builder._get_sql_operator("like") == "LIKE"
        assert builder._get_sql_operator("ilike") == "ILIKE"
        # Unknown operators default to =
        assert builder._get_sql_operator("unknown") == "="


class TestQueryBuilderCountQuery:
    """Tests for COUNT query building."""

    def test_build_count_query_includes_company_filter(self):
        """Verify COUNT query includes security filters."""
        builder = QueryBuilder(
            table="projects",
            role="admin",
            company_id="company-123",
        )
        query, params = builder.build_count_query()

        assert "SELECT COUNT(*)" in query
        assert "company_id = $1" in query
        assert "company-123" in params


class TestQueryBuilderProjectJoin:
    """Tests for queries requiring project join for company filtering."""

    def test_join_to_projects_for_company_filter(self):
        """Verify tables without company_id join to projects."""
        # payment_installments doesn't have company_id directly
        builder = QueryBuilder(
            table="payment_installments",
            role="admin",
            company_id="company-123",
        )
        query, params = builder.build_select()

        # Should join to projects table
        assert "JOIN projects" in query
        assert "p.company_id" in query
        assert "company-123" in params

