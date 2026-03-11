"""
Shared fixtures for the eval suite.

Provides user contexts, project IDs, orchestrator instances, and DB cleanup
that all eval test files can use.
"""

from dotenv import load_dotenv

# Load environment variables before any imports that need DATABASE_URL
load_dotenv()

import pytest
import uuid
from typing import Any, Dict
from unittest.mock import AsyncMock, MagicMock

# Configure pytest-asyncio
pytest_plugins = ['pytest_asyncio']


def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line("markers", "live_llm: Tests requiring live LLM API calls")
    config.addinivalue_line("markers", "integration: Tests requiring live DB and API keys")
    config.addinivalue_line("markers", "slow: Tests taking more than 30 seconds")


# ============================================================================
# DB Pool Cleanup
# ============================================================================

@pytest.fixture(autouse=True)
async def reset_db_pool_between_tests():
    """Reset the global DB pool reference so it gets recreated on the current event loop.

    Each async test may run on a different event loop. The asyncpg pool is bound
    to the loop that created it, so we must discard the stale reference.
    """
    yield
    try:
        import src.database.connection as conn_mod
        if conn_mod._pool is not None:
            try:
                conn_mod._pool.terminate()
            except Exception:
                pass
            conn_mod._pool = None
    except Exception:
        pass


# ============================================================================
# Eval Company & User Constants
# ============================================================================

# These match the seed_test_data.py values.
# The company_id must match a real company in the DB for integration tests.
EVAL_COMPANY_ID = "2"  # Matches existing test company in DB

EVAL_USERS = {
    "admin": {
        "user_id": "test-eval-admin",
        "email": "evaladmin@proesphere.com",
        "company_id": EVAL_COMPANY_ID,
        "role": "admin",
        "role_name": "Administrator",
        "permissions": ["all"],
        "is_root": False,
    },
    "pm": {
        "user_id": "test-eval-pm",
        "email": "evalpm@proesphere.com",
        "company_id": EVAL_COMPANY_ID,
        "role": "project_manager",
        "role_name": "Project Manager",
        "permissions": ["view_projects", "manage_tasks", "manage_stages"],
        "is_root": False,
    },
    "office_manager": {
        "user_id": "test-eval-om",
        "email": "evalom@proesphere.com",
        "company_id": EVAL_COMPANY_ID,
        "role": "office_manager",
        "role_name": "Office Manager",
        "permissions": ["view_projects"],
        "is_root": False,
    },
    "crew": {
        "user_id": "test-eval-crew",
        "email": "evalcrew@proesphere.com",
        "company_id": EVAL_COMPANY_ID,
        "role": "crew",
        "role_name": "Crew Member",
        "permissions": ["view_tasks"],
        "is_root": False,
    },
    "sub": {
        "user_id": "test-eval-sub",
        "email": "evalsub@proesphere.com",
        "company_id": EVAL_COMPANY_ID,
        "role": "subcontractor",
        "role_name": "Subcontractor",
        "permissions": ["view_assigned_tasks"],
        "is_root": False,
    },
    "client": {
        "user_id": "test-eval-client",
        "email": "evalclient@proesphere.com",
        "company_id": EVAL_COMPANY_ID,
        "role": "client",
        "role_name": "Client",
        "permissions": ["view_progress"],
        "is_root": False,
    },
}


# ============================================================================
# User Context Fixtures
# ============================================================================

@pytest.fixture
def eval_admin_context() -> Dict[str, Any]:
    return EVAL_USERS["admin"].copy()


@pytest.fixture
def eval_pm_context() -> Dict[str, Any]:
    return EVAL_USERS["pm"].copy()


@pytest.fixture
def eval_crew_context() -> Dict[str, Any]:
    return EVAL_USERS["crew"].copy()


@pytest.fixture
def eval_sub_context() -> Dict[str, Any]:
    return EVAL_USERS["sub"].copy()


@pytest.fixture
def eval_client_context() -> Dict[str, Any]:
    return EVAL_USERS["client"].copy()


@pytest.fixture
def eval_office_manager_context() -> Dict[str, Any]:
    return EVAL_USERS["office_manager"].copy()


# ============================================================================
# Orchestrator Fixture
# ============================================================================

@pytest.fixture
def orchestrator():
    """Create a fresh AgentOrchestrator instance."""
    from src.agent.core.orchestrator import AgentOrchestrator
    return AgentOrchestrator()


# ============================================================================
# Router Fixtures
# ============================================================================

@pytest.fixture
def router():
    """Create a ModelRouter with explicit test models."""
    from src.agent.llm.model_router import ModelRouter
    return ModelRouter(
        gatekeeper_model="google/gemini-2.0-flash-001",
        specialist_model="openai/gpt-4o-mini",
        planner_model="anthropic/claude-sonnet-4",
        standard_model="openai/gpt-4o-mini",
        complex_model="anthropic/claude-sonnet-4",
    )


@pytest.fixture
def mock_provider():
    """Create a mock LLM provider for unit tests."""
    return AsyncMock()
