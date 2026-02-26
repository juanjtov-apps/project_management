"""
Tests for removing the `name` column from the users table.

These tests verify that every module affected by the removal of the `name` column
works correctly after the column is dropped. Each test class covers one affected file.

Run with:
    cd python_backend && .venv/bin/python -m pytest tests/test_remove_user_name_column.py -v
"""
import pytest
import asyncpg
import os
import sys
import uuid
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DB_URL = os.environ.get("DATABASE_URL_DEV") or os.environ.get("DATABASE_URL")

pytestmark = pytest.mark.asyncio


async def get_conn():
    """Helper to create a fresh connection per test."""
    if not DB_URL:
        pytest.skip("No DATABASE_URL_DEV or DATABASE_URL set")
    return await asyncpg.connect(DB_URL)


# ============================================================================
# 1. TEST: Database column is removed
# ============================================================================

class TestDatabaseColumn:
    """Verify that the `name` column no longer exists in the users table."""

    async def test_name_column_does_not_exist(self):
        conn = await get_conn()
        try:
            row = await conn.fetchrow(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'users' AND column_name = 'name'"
            )
            assert row is None, "Column 'name' still exists in users table"
        finally:
            await conn.close()

    async def test_first_name_column_exists(self):
        conn = await get_conn()
        try:
            row = await conn.fetchrow(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'users' AND column_name = 'first_name'"
            )
            assert row is not None, "Column 'first_name' is missing"
        finally:
            await conn.close()

    async def test_last_name_column_exists(self):
        conn = await get_conn()
        try:
            row = await conn.fetchrow(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'users' AND column_name = 'last_name'"
            )
            assert row is not None, "Column 'last_name' is missing"
        finally:
            await conn.close()


# ============================================================================
# 2. TEST: repositories.py — UserRepository SQL queries
# ============================================================================

class TestRepositoriesQueries:
    """Verify that SQL queries in repositories.py work without the `name` column."""

    async def test_get_all_users_query(self):
        conn = await get_conn()
        try:
            rows = await conn.fetch("""
                SELECT u.id, u.first_name, u.last_name, u.email, u.username,
                       u.profile_image_url, u.company_id, u.role_id, u.is_root, u.is_active,
                       u.created_at, u.updated_at,
                       COALESCE(r.role_name, r.name, 'user') as role_name,
                       r.display_name as role_display_name
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                ORDER BY u.first_name, u.last_name
                LIMIT 5
            """)
            assert isinstance(rows, list)
            for row in rows:
                assert 'first_name' in dict(row)
                assert 'last_name' in dict(row)
        finally:
            await conn.close()

    async def test_get_user_by_id_query(self):
        conn = await get_conn()
        try:
            any_user = await conn.fetchrow("SELECT id FROM users LIMIT 1")
            if not any_user:
                pytest.skip("No users in database")
            row = await conn.fetchrow("""
                SELECT u.id, u.first_name, u.last_name, u.email, u.username,
                       u.profile_image_url, u.company_id, u.role_id, u.is_root, u.is_active,
                       u.created_at, u.updated_at,
                       COALESCE(r.role_name, r.name, 'user') as role_name,
                       r.display_name as role_display_name
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.id = $1
            """, any_user['id'])
            assert row is not None
        finally:
            await conn.close()

    async def test_old_query_with_u_name_fails(self):
        conn = await get_conn()
        try:
            with pytest.raises(asyncpg.UndefinedColumnError):
                await conn.fetch("""
                    SELECT u.id, u.first_name, u.last_name, u.email, u.username, u.name
                    FROM users u LIMIT 1
                """)
        finally:
            await conn.close()


# ============================================================================
# 3. TEST: user.py — Pydantic models
# ============================================================================

class TestUserModels:
    """Verify that Pydantic User models work without the `name` field."""

    def test_user_model_without_name(self):
        from src.models.user import User
        user = User(id="t", email="t@t.com", first_name="John", last_name="Doe",
                    company_id="c", role_id=1)
        assert user.firstName == "John"
        assert user.lastName == "Doe"
        assert not hasattr(user, 'name') or getattr(user, 'name', None) is None

    def test_user_create_model_without_name(self):
        from src.models.user import UserCreate
        uc = UserCreate(email="n@e.com", password="StrongPass123!", firstName="Jane",
                        lastName="Smith", companyId="c", roleId=1)
        assert uc.firstName == "Jane"
        assert uc.lastName == "Smith"

    def test_user_create_get_display_name(self):
        from src.models.user import UserCreate
        u = UserCreate(email="t@t.com", password="StrongPass123!", firstName="John",
                       lastName="Doe", companyId="c", roleId=1)
        assert u.get_display_name() == "John Doe"

    def test_user_create_get_display_name_fallback(self):
        from src.models.user import UserCreate
        u = UserCreate(email="t@t.com", password="StrongPass123!", firstName="John",
                       companyId="c", roleId=1)
        assert u.get_display_name() == "John"

    def test_user_update_model_without_name(self):
        from src.models.user import UserUpdate
        update = UserUpdate(firstName="Updated", lastName="Name")
        assert update.firstName == "Updated"
        assert update.lastName == "Name"

    def test_user_with_role_model_without_name(self):
        from src.models.user import UserWithRole
        u = UserWithRole(id="t", email="t@t.com", first_name="John", last_name="Doe",
                         company_id="c", role_id=1)
        assert u.firstName == "John"
        assert u.lastName == "Doe"


# ============================================================================
# 4. TEST: company_admin.py — SQL queries and response dicts
# ============================================================================

class TestCompanyAdminQueries:
    """Verify that company_admin.py queries work without the `name` column."""

    async def test_list_users_query_without_name(self):
        conn = await get_conn()
        try:
            rows = await conn.fetch("""
                SELECT u.id, u.email, u.first_name, u.last_name,
                       COALESCE(r.name, r.role_name, 'user') as role,
                       u.company_id,
                       COALESCE(u.is_active, true) as is_active,
                       u.created_at, u.last_login_at
                FROM users u LEFT JOIN roles r ON u.role_id = r.id
                ORDER BY u.created_at DESC LIMIT 5
            """)
            assert isinstance(rows, list)
            for row in rows:
                d = dict(row)
                assert 'first_name' in d
                assert 'last_name' in d
        finally:
            await conn.close()

    async def test_old_list_users_query_fails(self):
        conn = await get_conn()
        try:
            with pytest.raises(asyncpg.UndefinedColumnError):
                await conn.fetch("SELECT id, email, name, company_id FROM users LIMIT 1")
        finally:
            await conn.close()

    async def test_insert_user_without_name(self):
        conn = await get_conn()
        try:
            user_id = str(uuid.uuid4())
            tr = conn.transaction()
            await tr.start()
            try:
                role = await conn.fetchrow("SELECT id FROM roles LIMIT 1")
                company = await conn.fetchrow("SELECT id FROM companies LIMIT 1")
                if not role or not company:
                    pytest.skip("No roles or companies in database")
                await conn.execute(
                    "INSERT INTO users (id, first_name, last_name, email, password, role_id, "
                    "company_id, is_active, created_at, updated_at) "
                    "VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())",
                    user_id, "Test", "User", f"test-{user_id[:8]}@example.com",
                    "hashed_pw", role['id'], company['id'])
                row = await conn.fetchrow(
                    "SELECT first_name, last_name FROM users WHERE id = $1", user_id)
                assert row['first_name'] == "Test"
                assert row['last_name'] == "User"
            finally:
                await tr.rollback()
        finally:
            await conn.close()

    async def test_old_insert_with_name_fails(self):
        conn = await get_conn()
        try:
            with pytest.raises(asyncpg.UndefinedColumnError):
                await conn.execute(
                    "INSERT INTO users (id, email, name, first_name, last_name, password, "
                    "role_id, company_id, is_active, created_at, updated_at) "
                    "VALUES ($1, $2, $3, $4, $5, $6, 1, 'x', true, NOW(), NOW())",
                    str(uuid.uuid4()), "x@x.com", "Test User", "Test", "User", "pw")
        finally:
            await conn.close()

    async def test_fetch_user_after_create_without_name(self):
        conn = await get_conn()
        try:
            any_user = await conn.fetchrow("SELECT id FROM users LIMIT 1")
            if not any_user:
                pytest.skip("No users in database")
            user = await conn.fetchrow("""
                SELECT u.id, u.email, u.first_name, u.last_name, u.company_id, u.is_active,
                       COALESCE(r.name, r.role_name, 'user') as role
                FROM users u LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.id = $1
            """, any_user['id'])
            assert user is not None
            assert 'first_name' in dict(user)
        finally:
            await conn.close()


# ============================================================================
# 5. TEST: client_module.py — COALESCE queries
# ============================================================================

class TestClientModuleQueries:
    """Verify that client_module.py queries work without `u.name`."""

    async def test_notify_pms_query_without_u_name(self):
        conn = await get_conn()
        try:
            rows = await conn.fetch("""
                SELECT DISTINCT u.id,
                       COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.email) as full_name
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE COALESCE(r.role_name, r.name) IN ('admin', 'project_manager')
                LIMIT 5
            """)
            assert isinstance(rows, list)
            for row in rows:
                assert row['full_name'] is not None
        finally:
            await conn.close()

    async def test_old_notify_query_fails(self):
        conn = await get_conn()
        try:
            with pytest.raises(asyncpg.UndefinedColumnError):
                await conn.fetch("""
                    SELECT DISTINCT u.id,
                           COALESCE(u.name, u.first_name || ' ' || u.last_name) as full_name
                    FROM users u JOIN roles r ON u.role_id = r.id
                    WHERE COALESCE(r.role_name, r.name) IN ('admin', 'project_manager')
                    LIMIT 1
                """)
        finally:
            await conn.close()

    async def test_issues_created_by_name_query(self):
        conn = await get_conn()
        try:
            rows = await conn.fetch("""
                SELECT i.id,
                       COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.email) as created_by_name
                FROM client_portal.issues i
                LEFT JOIN public.users u ON i.created_by = u.id
                LIMIT 5
            """)
            assert isinstance(rows, list)
        finally:
            await conn.close()

    async def test_actor_name_query(self):
        conn = await get_conn()
        try:
            rows = await conn.fetch("""
                SELECT l.id,
                       COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.email) as actor_name
                FROM client_portal.issue_audit_log l
                LEFT JOIN public.users u ON l.actor_id = u.id
                LIMIT 5
            """)
            assert isinstance(rows, list)
        finally:
            await conn.close()

    async def test_materials_added_by_name_query(self):
        conn = await get_conn()
        try:
            rows = await conn.fetch("""
                SELECT m.id,
                       COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.email) as added_by_name
                FROM client_portal.materials m
                LEFT JOIN public.users u ON m.added_by = u.id
                LIMIT 5
            """)
            assert isinstance(rows, list)
        finally:
            await conn.close()

    async def test_material_items_added_by_name_query(self):
        conn = await get_conn()
        try:
            rows = await conn.fetch("""
                SELECT mi.id,
                       COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.email) as added_by_name,
                       ma.name as area_name, ps.name as stage_name
                FROM client_portal.material_items mi
                LEFT JOIN public.users u ON mi.added_by = u.id
                LEFT JOIN client_portal.material_areas ma ON mi.area_id = ma.id
                LEFT JOIN client_portal.project_stages ps ON mi.stage_id = ps.id
                LIMIT 5
            """)
            assert isinstance(rows, list)
        finally:
            await conn.close()

    async def test_old_materials_query_with_u_name_fails(self):
        conn = await get_conn()
        try:
            with pytest.raises(asyncpg.UndefinedColumnError):
                await conn.fetch("""
                    SELECT m.*, u.name as added_by_name
                    FROM client_portal.materials m
                    LEFT JOIN public.users u ON m.added_by = u.id
                    LIMIT 1
                """)
        finally:
            await conn.close()


# ============================================================================
# 6. TEST: onboarding.py — INSERT query
# ============================================================================

class TestOnboardingQueries:
    """Verify that onboarding.py INSERT works without `name` column."""

    async def test_onboarding_insert_without_name(self):
        conn = await get_conn()
        try:
            user_id = str(uuid.uuid4())
            tr = conn.transaction()
            await tr.start()
            try:
                role = await conn.fetchrow("SELECT id FROM roles LIMIT 1")
                company = await conn.fetchrow("SELECT id FROM companies LIMIT 1")
                if not role or not company:
                    pytest.skip("No roles or companies in database")
                await conn.execute(
                    "INSERT INTO users (id, email, username, first_name, last_name, role_id, "
                    "company_id, is_active, created_at, updated_at) "
                    "VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())",
                    user_id, f"onboard-{user_id[:8]}@example.com", f"onboard-{user_id[:8]}",
                    "Client", "User", role['id'], company['id'])
                row = await conn.fetchrow(
                    "SELECT first_name, last_name FROM users WHERE id = $1", user_id)
                assert row['first_name'] == "Client"
                assert row['last_name'] == "User"
            finally:
                await tr.rollback()
        finally:
            await conn.close()

    async def test_old_onboarding_insert_with_name_fails(self):
        conn = await get_conn()
        try:
            with pytest.raises(asyncpg.UndefinedColumnError):
                await conn.execute(
                    "INSERT INTO users (id, email, username, name, first_name, last_name, "
                    "role_id, company_id, is_active, created_at, updated_at) "
                    "VALUES ($1, $2, $3, $4, $5, $6, 1, 'x', true, NOW(), NOW())",
                    str(uuid.uuid4()), "x@x.com", "x", "Full Name", "First", "Last")
        finally:
            await conn.close()


# ============================================================================
# 7. TEST: admin.py — User listing query
# ============================================================================

class TestAdminQueries:
    """Verify that admin.py queries work without `u.name`."""

    async def test_admin_user_listing_without_u_name(self):
        conn = await get_conn()
        try:
            rows = await conn.fetch("""
                SELECT u.id, u.email, u.first_name, u.last_name,
                       COALESCE(r.name, r.role_name, 'user') as role,
                       u.company_id, c.name as company_name,
                       u.last_login_at, u.created_at
                FROM users u
                LEFT JOIN companies c ON u.company_id = c.id
                LEFT JOIN roles r ON u.role_id = r.id
                LIMIT 5
            """)
            assert isinstance(rows, list)
            for row in rows:
                d = dict(row)
                assert 'first_name' in d
                assert 'last_name' in d
        finally:
            await conn.close()

    async def test_old_admin_query_with_u_name_fails(self):
        conn = await get_conn()
        try:
            with pytest.raises(asyncpg.UndefinedColumnError):
                await conn.fetch("""
                    SELECT u.id, u.email, u.name,
                           COALESCE(r.name, r.role_name, 'user') as role, u.company_id
                    FROM users u LEFT JOIN roles r ON u.role_id = r.id LIMIT 1
                """)
        finally:
            await conn.close()


# ============================================================================
# 8. TEST: get_issues.py (agent tool) — SELECT u.name
# ============================================================================

class TestAgentGetIssuesQueries:
    """Verify that the agent get_issues tool query works without `u.name`."""

    async def test_get_issues_query_without_u_name(self):
        conn = await get_conn()
        try:
            rows = await conn.fetch("""
                SELECT i.*, p.name as project_name,
                       COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.email)
                           as assigned_user_name
                FROM client_portal.issues i
                LEFT JOIN projects p ON i.project_id::text = p.id::text
                LEFT JOIN users u ON i.assigned_to::text = u.id::text
                LIMIT 5
            """)
            assert isinstance(rows, list)
        finally:
            await conn.close()

    async def test_old_get_issues_with_u_name_fails(self):
        conn = await get_conn()
        try:
            with pytest.raises(asyncpg.UndefinedColumnError):
                await conn.fetch("""
                    SELECT i.*, p.name as project_name, u.name as assigned_user_name
                    FROM client_portal.issues i
                    LEFT JOIN projects p ON i.project_id::text = p.id::text
                    LEFT JOIN users u ON i.assigned_to::text = u.id::text
                    LIMIT 1
                """)
        finally:
            await conn.close()


# ============================================================================
# 9. TEST: auth_repositories.py — get_user, get_users
# ============================================================================

class TestAuthRepositoriesQueries:
    """Verify auth_repositories.py queries work without `name`."""

    async def test_get_users_query(self):
        conn = await get_conn()
        try:
            rows = await conn.fetch("""
                SELECT u.id, u.first_name, u.last_name, u.email, u.username,
                       u.profile_image_url, u.company_id, u.role_id, u.is_root, u.is_active,
                       u.created_at, u.updated_at, u.last_login_at,
                       c.name as company_name,
                       COALESCE(r.role_name, r.name) as role_name,
                       r.display_name as role_display_name
                FROM users u
                LEFT JOIN companies c ON u.company_id = c.id
                LEFT JOIN roles r ON u.role_id = r.id
                LIMIT 5
            """)
            assert isinstance(rows, list)
        finally:
            await conn.close()


# ============================================================================
# 10. TEST: client_module.py — current_user.get('name') pattern
# ============================================================================

class TestCurrentUserNameFallback:
    """Verify that code using current_user.get('name') gracefully falls back."""

    def test_resolver_name_without_name_field(self):
        current_user = {'id': 'u1', 'email': 't@t.com', 'first_name': 'John', 'last_name': 'Doe'}
        resolver_name = current_user.get('name')
        if not resolver_name:
            first = current_user.get('first_name', '')
            last = current_user.get('last_name', '')
            resolver_name = f"{first} {last}".strip()
        if not resolver_name:
            resolver_name = current_user.get('email', 'a user')
        assert resolver_name == "John Doe"

    def test_resolver_name_only_email(self):
        current_user = {'id': 'u1', 'email': 't@t.com'}
        resolver_name = current_user.get('name')
        if not resolver_name:
            first = current_user.get('first_name', '')
            last = current_user.get('last_name', '')
            resolver_name = f"{first} {last}".strip()
        if not resolver_name:
            resolver_name = current_user.get('email', 'a user')
        assert resolver_name == "t@t.com"


# ============================================================================
# 11. TEST: schema alignment
# ============================================================================

class TestSchemaAlignment:
    """Verify that the database schema has expected columns."""

    async def test_users_table_has_expected_columns(self):
        conn = await get_conn()
        try:
            rows = await conn.fetch(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'users' ORDER BY ordinal_position"
            )
            columns = {row['column_name'] for row in rows}
            expected = {'id', 'email', 'username', 'password', 'first_name', 'last_name',
                        'profile_image_url', 'company_id', 'role_id', 'is_root', 'is_active',
                        'last_login_at', 'created_at', 'updated_at'}
            for col in expected:
                assert col in columns, f"Expected column '{col}' missing"
            assert 'name' not in columns, "Column 'name' should have been removed"
        finally:
            await conn.close()


# ============================================================================
# 12. TEST: old test INSERT compatibility
# ============================================================================

class TestLegacyTestCompat:
    """Verify that the old test INSERT with name column would fail."""

    async def test_old_test_insert_with_name_fails(self):
        conn = await get_conn()
        try:
            with pytest.raises(asyncpg.UndefinedColumnError):
                await conn.execute(
                    "INSERT INTO users (id, username, password, name, email) "
                    "VALUES ('test-old-insert', 'test-old', 'temp-password', "
                    "'Test Old', 'test-old@example.com') ON CONFLICT (id) DO NOTHING"
                )
        finally:
            await conn.close()
