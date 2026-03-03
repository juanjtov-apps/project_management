"""
Tests for schema_registry.py - 10 tests

Tests configuration validation, role-based access, and table name resolution.
"""

import pytest
from src.agent.tools.dynamic.schema_registry import (
    TABLE_CONFIGS,
    TABLE_ALIASES,
    get_accessible_tables,
    get_accessible_columns,
    resolve_table_name,
    get_table_config,
    TableConfig,
)


class TestSchemaRegistryConfiguration:
    """Tests for schema registry configuration."""

    def test_all_tables_have_valid_config(self):
        """Test 1: Verify all TABLE_CONFIGS have required fields."""
        required_fields = ["table_name", "read_permissions", "all_columns"]

        for table_name, config in TABLE_CONFIGS.items():
            assert isinstance(config, TableConfig), f"{table_name} is not a TableConfig"
            assert config.table_name, f"{table_name} missing table_name"
            assert isinstance(config.read_permissions, list), f"{table_name} permissions not a list"
            assert len(config.read_permissions) > 0, f"{table_name} has no read permissions"
            assert isinstance(config.all_columns, list), f"{table_name} columns not a list"
            assert len(config.all_columns) > 0, f"{table_name} has no columns"

    def test_table_names_are_valid_sql_identifiers(self):
        """Test 2: Verify table names are valid SQL identifiers."""
        for table_name, config in TABLE_CONFIGS.items():
            # Should be either 'table' or 'schema.table' format
            parts = config.table_name.split(".")
            assert len(parts) <= 2, f"{table_name} has invalid table_name format"
            for part in parts:
                assert part.replace("_", "").isalnum(), f"{table_name} has invalid characters"

    def test_column_names_are_snake_case(self):
        """Test 3: Ensure all column names use snake_case."""
        for table_name, config in TABLE_CONFIGS.items():
            for col in config.all_columns:
                # Should not contain uppercase or hyphens
                assert col == col.lower(), f"{table_name}.{col} is not lowercase"
                assert "-" not in col, f"{table_name}.{col} contains hyphen"

    def test_all_roles_defined_in_permissions(self):
        """Test 4: Verify all 6 roles are used across table permissions."""
        all_roles = {"admin", "project_manager", "office_manager", "crew", "subcontractor", "client"}
        roles_found = set()

        for config in TABLE_CONFIGS.values():
            roles_found.update(config.read_permissions)

        assert roles_found == all_roles, f"Missing roles: {all_roles - roles_found}"


class TestGetAccessibleTables:
    """Tests for get_accessible_tables function."""

    def test_get_accessible_tables_admin(self):
        """Test 5: Admin can access all tables."""
        accessible = get_accessible_tables("admin")

        # Admin should have access to all tables
        assert len(accessible) == len(TABLE_CONFIGS)
        assert "projects" in accessible
        assert "tasks" in accessible
        assert "payment_installments" in accessible
        assert "issues" in accessible

    def test_get_accessible_tables_crew(self):
        """Test 6: Crew has limited access (no projects, payments)."""
        accessible = get_accessible_tables("crew")

        # Crew should NOT have access to projects or payments
        assert "projects" not in accessible
        assert "payment_installments" not in accessible
        assert "payment_schedules" not in accessible

        # But should have access to tasks, issues, materials
        assert "tasks" in accessible
        assert "issues" in accessible
        assert "materials" in accessible

    def test_get_accessible_tables_client(self):
        """Test 7: Client has specific access (payments, issues, forum)."""
        accessible = get_accessible_tables("client")

        # Client should have access to payments, issues, forum
        assert "payment_installments" in accessible
        assert "issues" in accessible
        assert "forum_threads" in accessible

        # But NOT to projects, tasks, materials
        assert "projects" not in accessible
        assert "tasks" not in accessible
        assert "materials" not in accessible


class TestResolveTableName:
    """Tests for resolve_table_name function."""

    def test_resolve_table_name_direct_match(self):
        """Test 8: Direct table name resolves correctly."""
        assert resolve_table_name("projects") == "projects"
        assert resolve_table_name("tasks") == "tasks"
        assert resolve_table_name("payment_installments") == "payment_installments"

    def test_resolve_table_name_alias(self):
        """Test 9: Aliases resolve to correct table names."""
        # Payment aliases
        assert resolve_table_name("payments") == "payment_installments"
        assert resolve_table_name("installments") == "payment_installments"

        # Task aliases
        assert resolve_table_name("punch list") == "tasks"
        assert resolve_table_name("todos") == "tasks"

        # Issue aliases
        assert resolve_table_name("problems") == "issues"
        assert resolve_table_name("bugs") == "issues"

        # Stage aliases
        assert resolve_table_name("phases") == "project_stages"
        assert resolve_table_name("milestones") == "project_stages"

    def test_resolve_table_name_invalid(self):
        """Test 10: Unknown table names return None."""
        assert resolve_table_name("nonexistent") is None
        assert resolve_table_name("xyz123") is None
        assert resolve_table_name("") is None
        assert resolve_table_name(None) is None


class TestGetAccessibleColumns:
    """Additional tests for column access."""

    def test_get_accessible_columns_returns_correct_columns(self):
        """Verify accessible columns are returned for valid role."""
        columns = get_accessible_columns("projects", "admin")

        assert "id" in columns
        assert "name" in columns
        assert "status" in columns
        assert "company_id" in columns

    def test_get_accessible_columns_invalid_role_returns_empty(self):
        """Verify empty list for invalid role."""
        columns = get_accessible_columns("projects", "crew")
        assert columns == []

    def test_get_accessible_columns_invalid_table_returns_empty(self):
        """Verify empty list for invalid table."""
        columns = get_accessible_columns("nonexistent", "admin")
        assert columns == []
