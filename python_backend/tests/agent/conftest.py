"""
Test fixtures for agent tools tests.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import date, datetime, timedelta
from typing import Dict, Any, List
import uuid


@pytest.fixture(autouse=True)
async def reset_db_pool_after_test():
    """Reset the global DB connection pool after each test.

    Integration tests that use the real orchestrator (which hits the real DB
    and real LLM APIs) can leave connections in a bad state — especially when
    the LLM returns errors (e.g. 402) that cause the async generator to exit
    early. This fixture ensures the pool is cleanly closed after every test
    so no corrupted connections leak into subsequent tests.
    """
    yield
    try:
        from src.database.connection import close_db_pool
        await close_db_pool()
    except Exception:
        pass


# ============================================================================
# User Context Fixtures
# ============================================================================

@pytest.fixture
def admin_context() -> Dict[str, Any]:
    """Admin user context."""
    return {
        "user_id": str(uuid.uuid4()),
        "email": "admin@test.com",
        "company_id": "company-123",
        "role": "admin",
        "role_name": "Administrator",
        "permissions": ["all"],
        "is_root": False,
    }


@pytest.fixture
def project_manager_context() -> Dict[str, Any]:
    """Project manager user context."""
    return {
        "user_id": str(uuid.uuid4()),
        "email": "pm@test.com",
        "company_id": "company-123",
        "role": "project_manager",
        "role_name": "Project Manager",
        "permissions": ["view_projects", "manage_tasks"],
        "is_root": False,
    }


@pytest.fixture
def office_manager_context() -> Dict[str, Any]:
    """Office manager user context."""
    return {
        "user_id": str(uuid.uuid4()),
        "email": "office@test.com",
        "company_id": "company-123",
        "role": "office_manager",
        "role_name": "Office Manager",
        "permissions": ["view_projects"],
        "is_root": False,
    }


@pytest.fixture
def crew_context() -> Dict[str, Any]:
    """Crew member user context."""
    return {
        "user_id": str(uuid.uuid4()),
        "email": "crew@test.com",
        "company_id": "company-123",
        "role": "crew",
        "role_name": "Crew Member",
        "permissions": ["view_tasks"],
        "is_root": False,
    }


@pytest.fixture
def subcontractor_context() -> Dict[str, Any]:
    """Subcontractor user context."""
    return {
        "user_id": str(uuid.uuid4()),
        "email": "sub@test.com",
        "company_id": "company-123",
        "role": "subcontractor",
        "role_name": "Subcontractor",
        "permissions": ["view_assigned_tasks"],
        "is_root": False,
    }


@pytest.fixture
def client_context() -> Dict[str, Any]:
    """Client user context."""
    return {
        "user_id": str(uuid.uuid4()),
        "email": "client@test.com",
        "company_id": "company-123",
        "role": "client",
        "role_name": "Client",
        "permissions": ["view_progress"],
        "is_root": False,
    }


@pytest.fixture
def no_company_context() -> Dict[str, Any]:
    """User context without company_id."""
    return {
        "user_id": str(uuid.uuid4()),
        "email": "nocompany@test.com",
        "company_id": None,
        "role": "admin",
    }


# ============================================================================
# Sample Data Fixtures
# ============================================================================

@pytest.fixture
def sample_project() -> Dict[str, Any]:
    """Sample project data."""
    return {
        "id": "project-123",
        "name": "Via Tesoro",
        "description": "Luxury home construction",
        "status": "active",
        "progress": 45,
        "location": "123 Main St",
        "client_name": "John Doe",
        "due_date": date.today() + timedelta(days=90),
        "company_id": "company-123",
        "created_at": datetime.now(),
    }


@pytest.fixture
def sample_projects() -> List[Dict[str, Any]]:
    """List of sample projects."""
    return [
        {
            "id": "project-1",
            "name": "Via Tesoro",
            "status": "active",
            "progress": 45,
            "company_id": "company-123",
        },
        {
            "id": "project-2",
            "name": "Cole Dr",
            "status": "active",
            "progress": 30,
            "company_id": "company-123",
        },
        {
            "id": "project-3",
            "name": "Woodside Dr",
            "status": "completed",
            "progress": 100,
            "company_id": "company-123",
        },
    ]


@pytest.fixture
def sample_tasks() -> List[Dict[str, Any]]:
    """List of sample tasks."""
    today = date.today()
    return [
        {
            "id": "task-1",
            "title": "Install drywall",
            "status": "pending",
            "priority": "high",
            "due_date": today + timedelta(days=3),
            "project_id": "project-123",
            "company_id": "company-123",
        },
        {
            "id": "task-2",
            "title": "Paint walls",
            "status": "in-progress",
            "priority": "medium",
            "due_date": today + timedelta(days=7),
            "project_id": "project-123",
            "company_id": "company-123",
        },
        {
            "id": "task-3",
            "title": "Fix electrical",
            "status": "completed",
            "priority": "critical",
            "due_date": today - timedelta(days=2),
            "project_id": "project-123",
            "company_id": "company-123",
        },
        {
            "id": "task-4",
            "title": "Overdue task",
            "status": "pending",
            "priority": "high",
            "due_date": today - timedelta(days=5),
            "project_id": "project-123",
            "company_id": "company-123",
        },
    ]


@pytest.fixture
def sample_installments() -> List[Dict[str, Any]]:
    """List of sample payment installments."""
    today = date.today()
    return [
        {
            "id": "inst-1",
            "name": "Deposit",
            "amount": 50000.00,
            "currency": "USD",
            "status": "paid",
            "due_date": today - timedelta(days=30),
            "project_id": "project-123",
            "schedule_id": "schedule-1",
        },
        {
            "id": "inst-2",
            "name": "Foundation",
            "amount": 75000.00,
            "currency": "USD",
            "status": "payable",
            "due_date": today + timedelta(days=5),
            "project_id": "project-123",
            "schedule_id": "schedule-1",
        },
        {
            "id": "inst-3",
            "name": "Framing",
            "amount": 100000.00,
            "currency": "USD",
            "status": "planned",
            "due_date": today + timedelta(days=30),
            "project_id": "project-123",
            "schedule_id": "schedule-1",
        },
        {
            "id": "inst-4",
            "name": "Overdue payment",
            "amount": 25000.00,
            "currency": "USD",
            "status": "payable",
            "due_date": today - timedelta(days=10),
            "project_id": "project-123",
            "schedule_id": "schedule-1",
        },
    ]


@pytest.fixture
def sample_issues() -> List[Dict[str, Any]]:
    """List of sample issues."""
    return [
        {
            "id": "issue-1",
            "title": "Crack in foundation",
            "status": "open",
            "priority": "critical",
            "project_id": "project-123",
            "created_by": "user-1",
        },
        {
            "id": "issue-2",
            "title": "Paint color wrong",
            "status": "in_progress",
            "priority": "medium",
            "project_id": "project-123",
            "created_by": "user-2",
        },
        {
            "id": "issue-3",
            "title": "Window leak",
            "status": "resolved",
            "priority": "high",
            "project_id": "project-123",
            "created_by": "user-1",
        },
    ]


# ============================================================================
# Mock Database Fixtures
# ============================================================================

@pytest.fixture
def mock_db_manager():
    """Mock database manager."""
    mock = MagicMock()
    mock.execute_query = AsyncMock(return_value=[])
    mock.execute_one = AsyncMock(return_value=None)
    return mock


@pytest.fixture
def mock_db_with_projects(mock_db_manager, sample_projects):
    """Mock database manager that returns sample projects."""
    mock_db_manager.execute_query = AsyncMock(return_value=sample_projects)
    return mock_db_manager


@pytest.fixture
def mock_db_with_tasks(mock_db_manager, sample_tasks):
    """Mock database manager that returns sample tasks."""
    mock_db_manager.execute_query = AsyncMock(return_value=sample_tasks)
    return mock_db_manager


@pytest.fixture
def mock_db_with_installments(mock_db_manager, sample_installments):
    """Mock database manager that returns sample installments."""
    mock_db_manager.execute_query = AsyncMock(return_value=sample_installments)
    return mock_db_manager


@pytest.fixture
def mock_db_with_issues(mock_db_manager, sample_issues):
    """Mock database manager that returns sample issues."""
    mock_db_manager.execute_query = AsyncMock(return_value=sample_issues)
    return mock_db_manager


# ============================================================================
# Helper Functions
# ============================================================================

def create_mock_row(data: Dict[str, Any]):
    """Create a mock database row that supports dict() conversion."""
    mock_row = MagicMock()
    mock_row.__iter__ = lambda self: iter(data.items())
    mock_row.keys = lambda: data.keys()
    mock_row.__getitem__ = lambda self, key: data[key]
    return mock_row


@pytest.fixture
def create_db_rows():
    """Factory fixture for creating mock database rows."""
    def _create_rows(data_list: List[Dict[str, Any]]):
        return [create_mock_row(d) for d in data_list]
    return _create_rows
