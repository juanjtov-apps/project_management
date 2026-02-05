"""
Safe parameterized query builder with automatic security filtering.

This module builds SQL queries that are safe from injection attacks and
automatically apply security filters (company_id, project_id).
"""

from typing import Dict, Any, List, Tuple, Optional
from datetime import date, datetime, timedelta

from .schema_registry import TABLE_CONFIGS, get_accessible_columns, TableConfig


class QueryBuilder:
    """Builds safe parameterized SQL queries with automatic security filtering."""

    def __init__(
        self,
        table: str,
        role: str,
        company_id: str,
        project_id: Optional[str] = None
    ):
        """
        Initialize the query builder.

        Args:
            table: The canonical table name (from TABLE_CONFIGS)
            role: The user's role for permission checking
            company_id: The user's company ID for security filtering
            project_id: Optional project ID filter
        """
        self.table = table
        self.config: TableConfig = TABLE_CONFIGS[table]
        self.role = role
        self.company_id = company_id
        self.project_id = project_id
        self.columns = get_accessible_columns(table, role)

    def build_select(
        self,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        limit: int = 100,
    ) -> Tuple[str, List[Any]]:
        """
        Build SELECT query with automatic security filtering.

        Args:
            filters: Dictionary of column -> value or column -> {operator: value}
            order_by: Optional ORDER BY clause (validated against accessible columns)
            limit: Maximum rows to return (capped at 500)

        Returns:
            Tuple of (query_string, parameters_list)
        """
        params: List[Any] = []
        param_count = 1
        where_clauses: List[str] = []

        # Determine if we need to join to projects for company filtering
        needs_project_join = (
            self.config.requires_company_filter
            and "company_id" not in self.columns
            and "project_id" in self.columns
        )

        # Build SELECT clause
        if needs_project_join:
            column_list = ", ".join([f"t.{c}" for c in self.columns])
            query = f"SELECT {column_list} FROM {self.config.table_name} t"
            query += " JOIN projects p ON t.project_id::text = p.id::text"
            # Company filter on joined projects table
            where_clauses.append(f"p.company_id = ${param_count}")
            params.append(self.company_id)
            param_count += 1
        else:
            column_list = ", ".join(self.columns)
            query = f"SELECT {column_list} FROM {self.config.table_name}"
            # Direct company filter if column exists
            if self.config.requires_company_filter and "company_id" in self.columns:
                where_clauses.append(f"company_id = ${param_count}")
                params.append(self.company_id)
                param_count += 1

        # Project filter (if specified)
        if self.project_id and "project_id" in self.columns:
            col_prefix = "t." if needs_project_join else ""
            where_clauses.append(f"{col_prefix}project_id::text = ${param_count}")
            params.append(str(self.project_id))
            param_count += 1

        # User-specified filters
        if filters:
            col_prefix = "t." if needs_project_join else ""
            for key, value in filters.items():
                # Skip columns user can't access
                if key not in self.columns:
                    continue

                if isinstance(value, dict):
                    # Handle operators like {"gte": date, "lt": date}
                    for op, val in value.items():
                        sql_op = self._get_sql_operator(op)
                        where_clauses.append(f"{col_prefix}{key} {sql_op} ${param_count}")
                        params.append(val)
                        param_count += 1
                elif value is not None:
                    # Use case-insensitive comparison for status and priority fields
                    if key in ("status", "priority") and isinstance(value, str):
                        where_clauses.append(f"UPPER({col_prefix}{key}) = UPPER(${param_count})")
                    else:
                        where_clauses.append(f"{col_prefix}{key} = ${param_count}")
                    params.append(value)
                    param_count += 1

        # Build WHERE clause
        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)

        # ORDER BY (validate column exists)
        effective_order = order_by or self.config.default_order
        if effective_order:
            # Extract first column name for validation
            order_col = effective_order.split()[0].replace("t.", "")
            if order_col in self.columns:
                if needs_project_join and not effective_order.startswith("t."):
                    # Prefix columns with table alias
                    parts = effective_order.split(",")
                    prefixed_parts = []
                    for part in parts:
                        part = part.strip()
                        col = part.split()[0]
                        if col in self.columns:
                            prefixed_parts.append("t." + part)
                    if prefixed_parts:
                        query += f" ORDER BY {', '.join(prefixed_parts)}"
                else:
                    query += f" ORDER BY {effective_order}"

        # LIMIT (cap at 500)
        query += f" LIMIT {min(limit, 500)}"

        return query, params

    def _get_sql_operator(self, op: str) -> str:
        """Convert operator string to SQL operator."""
        operators = {
            "eq": "=",
            "ne": "!=",
            "gt": ">",
            "gte": ">=",
            "lt": "<",
            "lte": "<=",
            "like": "LIKE",
            "ilike": "ILIKE",
        }
        return operators.get(op, "=")

    def build_date_filter(self, filter_type: str) -> Dict[str, Any]:
        """
        Build date range filter based on filter type.

        Args:
            filter_type: One of: today, this_week, this_month, overdue, next_N

        Returns:
            Dictionary with date column as key and filter operators as value
        """
        date_column = self.config.date_column
        if not date_column:
            return {}

        today = date.today()

        if filter_type == "today":
            return {date_column: {"gte": today, "lt": today + timedelta(days=1)}}

        elif filter_type == "this_week":
            # Monday to Sunday of current week
            monday = today - timedelta(days=today.weekday())
            sunday = monday + timedelta(days=6)
            return {date_column: {"gte": monday, "lte": sunday}}

        elif filter_type == "this_month":
            first_day = today.replace(day=1)
            # Calculate last day of month
            if today.month == 12:
                last_day = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                last_day = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
            return {date_column: {"gte": first_day, "lte": last_day}}

        elif filter_type == "overdue":
            return {date_column: {"lt": today}}

        elif filter_type.startswith("next_"):
            try:
                days = int(filter_type.split("_")[1])
                return {date_column: {"gte": today, "lte": today + timedelta(days=days)}}
            except (ValueError, IndexError):
                return {}

        return {}

    def build_count_query(
        self,
        filters: Optional[Dict[str, Any]] = None,
    ) -> Tuple[str, List[Any]]:
        """
        Build COUNT query with same filters as select.

        Returns:
            Tuple of (query_string, parameters_list)
        """
        params: List[Any] = []
        param_count = 1
        where_clauses: List[str] = []

        needs_project_join = (
            self.config.requires_company_filter
            and "company_id" not in self.columns
            and "project_id" in self.columns
        )

        if needs_project_join:
            query = f"SELECT COUNT(*) as count FROM {self.config.table_name} t"
            query += " JOIN projects p ON t.project_id::text = p.id::text"
            where_clauses.append(f"p.company_id = ${param_count}")
            params.append(self.company_id)
            param_count += 1
        else:
            query = f"SELECT COUNT(*) as count FROM {self.config.table_name}"
            if self.config.requires_company_filter and "company_id" in self.columns:
                where_clauses.append(f"company_id = ${param_count}")
                params.append(self.company_id)
                param_count += 1

        if self.project_id and "project_id" in self.columns:
            col_prefix = "t." if needs_project_join else ""
            where_clauses.append(f"{col_prefix}project_id::text = ${param_count}")
            params.append(str(self.project_id))
            param_count += 1

        if filters:
            col_prefix = "t." if needs_project_join else ""
            for key, value in filters.items():
                if key not in self.columns:
                    continue
                if isinstance(value, dict):
                    for op, val in value.items():
                        sql_op = self._get_sql_operator(op)
                        where_clauses.append(f"{col_prefix}{key} {sql_op} ${param_count}")
                        params.append(val)
                        param_count += 1
                elif value is not None:
                    # Use case-insensitive comparison for status and priority fields
                    if key in ("status", "priority") and isinstance(value, str):
                        where_clauses.append(f"UPPER({col_prefix}{key}) = UPPER(${param_count})")
                    else:
                        where_clauses.append(f"{col_prefix}{key} = ${param_count}")
                    params.append(value)
                    param_count += 1

        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)

        return query, params
