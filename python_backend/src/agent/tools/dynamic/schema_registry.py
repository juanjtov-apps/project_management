"""
Schema registry - defines which tables/columns each role can access.

This module provides the configuration for dynamic database queries,
mapping roles to tables and columns they can access.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass, field


@dataclass
class TableConfig:
    """Configuration for table access."""
    table_name: str                              # Full table name (schema.table)
    read_permissions: List[str]                  # Roles that can read this table
    all_columns: List[str]                       # All available columns
    restricted_columns: Dict[str, List[str]] = field(default_factory=dict)  # Role -> columns they CAN'T see
    requires_project_filter: bool = True         # Most tables need project_id filtering
    requires_company_filter: bool = True         # All tables need company_id filtering
    date_column: Optional[str] = None            # Primary date column for date filtering
    default_order: str = "created_at DESC"       # Default ORDER BY clause


# Full table configuration
TABLE_CONFIGS: Dict[str, TableConfig] = {
    "projects": TableConfig(
        table_name="projects",
        read_permissions=["admin", "project_manager", "office_manager"],
        all_columns=[
            "id", "name", "status", "progress", "location",
            "client_name", "due_date", "company_id", "created_at",
            "description", "budget"
        ],
        restricted_columns={},
        requires_project_filter=False,
        date_column="due_date",
        default_order="name ASC",
    ),
    "tasks": TableConfig(
        table_name="tasks",
        read_permissions=["admin", "project_manager", "office_manager", "crew", "subcontractor"],
        all_columns=[
            "id", "title", "description", "status", "priority",
            "due_date", "project_id", "assignee_id", "category",
            "is_milestone", "created_at"
        ],
        restricted_columns={},
        date_column="due_date",
        default_order="due_date ASC NULLS LAST",
    ),
    "payment_installments": TableConfig(
        table_name="client_portal.payment_installments",
        read_permissions=["admin", "project_manager", "office_manager", "client"],
        all_columns=[
            "id", "name", "description", "amount", "currency",
            "due_date", "status", "project_id", "schedule_id",
            "next_milestone", "display_order", "created_at"
        ],
        restricted_columns={},
        date_column="due_date",
        default_order="due_date ASC, display_order ASC",
    ),
    "payment_schedules": TableConfig(
        table_name="client_portal.payment_schedules",
        read_permissions=["admin", "project_manager", "office_manager", "client"],
        all_columns=[
            "id", "project_id", "title", "notes", "created_at"
        ],
        restricted_columns={},
        date_column=None,
        default_order="created_at DESC",
    ),
    "issues": TableConfig(
        table_name="client_portal.issues",
        read_permissions=["admin", "project_manager", "office_manager", "crew", "subcontractor", "client"],
        all_columns=[
            "id", "title", "description", "status", "priority",
            "project_id", "created_by", "assigned_to", "due_date",
            "category", "visibility", "created_at"
        ],
        restricted_columns={},
        date_column="due_date",
        default_order="priority DESC, created_at DESC",
    ),
    "materials": TableConfig(
        table_name="client_portal.material_items",
        read_permissions=["admin", "project_manager", "office_manager", "crew", "subcontractor"],
        all_columns=[
            "id", "area_id", "project_id", "name", "spec", "product_link",
            "vendor", "quantity", "unit_cost", "status", "added_by", "created_at"
        ],
        restricted_columns={},
        date_column=None,
        default_order="name ASC",
    ),
    "material_areas": TableConfig(
        table_name="client_portal.material_areas",
        read_permissions=["admin", "project_manager", "office_manager", "crew", "subcontractor"],
        all_columns=[
            "id", "project_id", "name", "sort_order", "created_at"
        ],
        restricted_columns={},
        date_column=None,
        default_order="sort_order ASC",
    ),
    "project_stages": TableConfig(
        table_name="client_portal.project_stages",
        read_permissions=["admin", "project_manager", "office_manager", "crew", "subcontractor"],
        all_columns=[
            "id", "project_id", "name", "status", "order_index",
            "planned_start_date", "planned_end_date", "client_visible", "created_at"
        ],
        restricted_columns={},
        date_column="planned_end_date",
        default_order="order_index ASC",
    ),
    "forum_threads": TableConfig(
        table_name="client_portal.forum_threads",
        read_permissions=["admin", "project_manager", "office_manager", "client"],
        all_columns=[
            "id", "project_id", "title", "created_by",
            "created_at", "pinned"
        ],
        restricted_columns={},
        date_column="created_at",
        default_order="pinned DESC, created_at DESC",
    ),
    "forum_messages": TableConfig(
        table_name="client_portal.forum_messages",
        read_permissions=["admin", "project_manager", "office_manager", "client"],
        all_columns=[
            "id", "thread_id", "body", "created_by", "created_at"
        ],
        restricted_columns={},
        requires_project_filter=False,  # Filtered via thread
        date_column="created_at",
        default_order="created_at ASC",
    ),
    "invoices": TableConfig(
        table_name="client_portal.invoices",
        read_permissions=["admin", "project_manager", "office_manager", "client"],
        all_columns=[
            "id", "project_id", "installment_id", "invoice_no",
            "issue_date", "amount", "tax", "total", "currency",
            "pdf_file_id", "created_by", "created_at"
        ],
        restricted_columns={},
        date_column="issue_date",
        default_order="created_at DESC",
    ),
}


# Human-readable aliases for natural language
TABLE_ALIASES: Dict[str, str] = {
    # Payment aliases
    "payments": "payment_installments",
    "installments": "payment_installments",
    "payment": "payment_installments",
    "installment": "payment_installments",
    "pay": "payment_installments",
    "invoice": "invoices",
    "schedules": "payment_schedules",
    "schedule": "payment_schedules",

    # Task aliases
    "punch list": "tasks",
    "punchlist": "tasks",
    "task": "tasks",
    "todos": "tasks",
    "todo": "tasks",
    "to-do": "tasks",
    "to do": "tasks",

    # Issue aliases
    "problems": "issues",
    "problem": "issues",
    "issue": "issues",
    "bugs": "issues",
    "bug": "issues",
    "tickets": "issues",
    "ticket": "issues",

    # Material aliases
    "supplies": "materials",
    "supply": "materials",
    "material": "materials",
    "items": "materials",

    # Stage aliases
    "phases": "project_stages",
    "phase": "project_stages",
    "stages": "project_stages",
    "stage": "project_stages",
    "milestones": "project_stages",
    "milestone": "project_stages",

    # Forum aliases
    "discussions": "forum_threads",
    "discussion": "forum_threads",
    "threads": "forum_threads",
    "thread": "forum_threads",
    "messages": "forum_messages",
    "message": "forum_messages",
    "forum": "forum_threads",

    # Project aliases
    "project": "projects",

    # Area aliases
    "areas": "material_areas",
    "area": "material_areas",
}


def get_accessible_tables(role: str) -> List[str]:
    """Get list of tables accessible to a role."""
    return [
        name for name, config in TABLE_CONFIGS.items()
        if role in config.read_permissions
    ]


def get_accessible_columns(table: str, role: str) -> List[str]:
    """Get columns user can see for a table."""
    config = TABLE_CONFIGS.get(table)
    if not config or role not in config.read_permissions:
        return []

    restricted = config.restricted_columns.get(role, [])
    return [c for c in config.all_columns if c not in restricted]


def resolve_table_name(user_input: str) -> Optional[str]:
    """Resolve user input to canonical table name."""
    if not user_input:
        return None

    normalized = user_input.lower().strip()

    # Check direct match first
    if normalized in TABLE_CONFIGS:
        return normalized

    # Check aliases
    if normalized in TABLE_ALIASES:
        return TABLE_ALIASES[normalized]

    # Fuzzy match - check if input contains or is contained in alias
    for alias, table in TABLE_ALIASES.items():
        if alias in normalized or normalized in alias:
            return table

    # Check if input matches part of table name
    for table_name in TABLE_CONFIGS.keys():
        if normalized in table_name or table_name in normalized:
            return table_name

    return None


def get_table_config(table: str) -> Optional[TableConfig]:
    """Get the configuration for a table."""
    return TABLE_CONFIGS.get(table)
