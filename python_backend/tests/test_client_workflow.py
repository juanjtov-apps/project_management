"""
Client Workflow E2E Tests.
Tests the complete client lifecycle: magic link auth, issues, forum,
materials, stages, payments, and stats.

Runs the FastAPI server as a subprocess and tests via real HTTP requests.
"""

import pytest
import uuid
import hashlib
import secrets
import asyncio
import asyncpg
import httpx
import os
import sys
import socket
import subprocess
import time
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

# Unique prefix to identify test data for cleanup
TEST_ID = uuid.uuid4().hex[:8]
TEST_PREFIX = f"e2e_client_{TEST_ID}_"
ORIGIN_HEADER = {"Origin": "http://localhost:5000"}

# Module-level state shared across tests
_state = {}


def _get_db_url():
    return os.environ.get("DATABASE_URL_DEV") or os.environ.get("DATABASE_URL")


def _find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _run_async(coro):
    """Run an async function synchronously."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ============================================================================
# Database helpers
# ============================================================================

async def _setup_test_data():
    """Create company, admin user, client user, project, and magic link token."""
    db_url = _get_db_url()
    if not db_url:
        pytest.skip("No DATABASE_URL_DEV or DATABASE_URL set")

    conn = await asyncpg.connect(db_url)
    try:
        # 1. Create company
        company_id = str(uuid.uuid4())
        await conn.execute(
            "INSERT INTO companies (id, name, created_at) VALUES ($1, $2, NOW())",
            company_id, f"{TEST_PREFIX}Company",
        )

        # 2. Get admin and client role IDs
        admin_row = await conn.fetchrow(
            "SELECT id FROM roles WHERE LOWER(COALESCE(role_name, name)) = 'admin' LIMIT 1"
        )
        client_row = await conn.fetchrow(
            "SELECT id FROM roles WHERE LOWER(COALESCE(role_name, name)) = 'client' LIMIT 1"
        )
        if not admin_row or not client_row:
            pytest.skip("Required roles (admin, client) not found in database")

        admin_role_id = admin_row["id"]
        client_role_id = client_row["id"]

        # 3. Create admin user (needed for admin-only operations in setup)
        import bcrypt
        admin_id = str(uuid.uuid4())
        admin_email = f"{TEST_PREFIX}admin@test.com"
        admin_pw = "AdminPass123!"
        admin_hash = bcrypt.hashpw(admin_pw.encode(), bcrypt.gensalt()).decode()
        await conn.execute(
            """INSERT INTO users (id, email, first_name, last_name, password,
               role_id, company_id, is_active, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())""",
            admin_id, admin_email, "Admin", "User", admin_hash, admin_role_id, company_id,
        )

        # 4. Create project (clients need an assigned project)
        project_id = str(uuid.uuid4())
        await conn.execute(
            """INSERT INTO projects (id, name, description, status, progress, company_id, created_at)
               VALUES ($1, $2, $3, 'active', 0, $4, NOW())""",
            project_id, f"{TEST_PREFIX}Project", "Client test project", company_id,
        )

        # 5. Create client user (no password — uses magic link)
        client_id = str(uuid.uuid4())
        client_email = f"{TEST_PREFIX}client@test.com"
        await conn.execute(
            """INSERT INTO users (id, email, first_name, last_name,
               role_id, company_id, is_active, assigned_project_id, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, true, $7, NOW())""",
            client_id, client_email, "Client", "User",
            client_role_id, company_id, project_id,
        )

        # 6. Create client invitation
        await conn.execute("""
            INSERT INTO client_portal.client_invitations
            (user_id, project_id, company_id, invited_by, status, created_at)
            VALUES ($1, $2, $3, $4, 'pending', NOW())
        """, client_id, project_id, company_id, admin_id)

        # 7. Create magic link token (we control both raw and hash)
        raw_token = secrets.token_urlsafe(64)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=72)
        await conn.execute("""
            INSERT INTO client_portal.magic_link_tokens
            (user_id, token_hash, purpose, expires_at)
            VALUES ($1, $2, $3, $4)
        """, client_id, token_hash, "invite", expires_at)

        _state.update({
            "company_id": company_id,
            "admin_role_id": admin_role_id,
            "client_role_id": client_role_id,
            "admin_id": admin_id,
            "admin_email": admin_email,
            "admin_password": admin_pw,
            "project_id": project_id,
            "client_id": client_id,
            "client_email": client_email,
            "magic_token": raw_token,
        })
    finally:
        await conn.close()


async def _cleanup_test_data():
    """Remove all test data."""
    db_url = _get_db_url()
    if not db_url:
        return
    conn = await asyncpg.connect(db_url)
    try:
        cid = _state.get("company_id")
        client_id = _state.get("client_id")
        if not cid:
            return
        for q in [
            # Client portal tables
            ("DELETE FROM client_portal.magic_link_tokens WHERE user_id = $1", client_id),
            ("DELETE FROM client_portal.client_invitations WHERE user_id = $1", client_id),
            ("DELETE FROM client_portal.issue_comments WHERE issue_id IN (SELECT id FROM client_portal.issues WHERE project_id = $1)", _state.get("project_id", "")),
            ("DELETE FROM client_portal.issues WHERE project_id = $1", _state.get("project_id", "")),
            ("DELETE FROM client_portal.forum_messages WHERE project_id = $1", _state.get("project_id", "")),
            ("DELETE FROM client_portal.project_stages WHERE project_id = $1", _state.get("project_id", "")),
            ("DELETE FROM client_portal.material_items WHERE project_id = $1", _state.get("project_id", "")),
            ("DELETE FROM client_portal.material_areas WHERE project_id = $1", _state.get("project_id", "")),
            ("DELETE FROM client_portal.payment_receipts WHERE project_id = $1", _state.get("project_id", "")),
            ("DELETE FROM client_portal.payment_installments WHERE project_id = $1", _state.get("project_id", "")),
            ("DELETE FROM client_portal.payment_schedules WHERE project_id = $1", _state.get("project_id", "")),
            # Public schema
            ("DELETE FROM sessions WHERE sess::text LIKE '%' || $1 || '%'", cid),
            ("DELETE FROM tasks WHERE project_id IN (SELECT id FROM projects WHERE company_id = $1)", cid),
            ("DELETE FROM projects WHERE company_id = $1", cid),
            ("DELETE FROM users WHERE company_id = $1", cid),
            ("DELETE FROM companies WHERE id = $1", cid),
        ]:
            try:
                await conn.execute(q[0], q[1])
            except Exception:
                pass
    finally:
        await conn.close()


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture(scope="module")
def setup():
    """Create test data, start server, yield, cleanup."""
    _run_async(_setup_test_data())

    port = _find_free_port()
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    proc = subprocess.Popen(
        [
            sys.executable, "-m", "uvicorn", "main:app",
            "--host", "127.0.0.1", "--port", str(port),
            "--log-level", "warning",
        ],
        cwd=backend_dir,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    ready = False
    for _ in range(40):
        try:
            r = httpx.get(f"http://127.0.0.1:{port}/health", timeout=2.0)
            if r.status_code == 200:
                ready = True
                break
        except (httpx.ConnectError, httpx.ReadTimeout):
            pass
        time.sleep(0.5)

    if not ready:
        proc.terminate()
        proc.wait()
        pytest.fail("Server did not start in time")

    _state["port"] = port
    yield _state

    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait()
    _run_async(_cleanup_test_data())


@pytest.fixture(scope="module")
def client(setup):
    """HTTP client for client user requests (own cookie jar)."""
    with httpx.Client(
        base_url=f"http://127.0.0.1:{setup['port']}",
        timeout=30.0,
    ) as c:
        yield c


@pytest.fixture(scope="module")
def admin_http(setup):
    """Separate HTTP client for admin requests (own cookie jar)."""
    with httpx.Client(
        base_url=f"http://127.0.0.1:{setup['port']}",
        timeout=30.0,
    ) as c:
        yield c


@pytest.fixture(scope="module")
def client_session(client, setup):
    """Verify magic link and return client session."""
    response = client.post(
        "/api/v1/onboarding/verify-magic-link",
        json={"token": setup["magic_token"]},
    )
    assert response.status_code == 200, f"Magic link verify failed: {response.status_code} {response.text}"

    data = response.json()
    session_id = data.get("sessionId") or response.cookies.get("session_id")
    assert session_id, "No session_id in verify response"

    _state["client_session_id"] = session_id
    _state["client_cookies"] = {"session_id": session_id}
    _state["client_headers"] = {**ORIGIN_HEADER}
    _state["is_first_login"] = data.get("isFirstLogin", False)

    yield _state


@pytest.fixture(scope="module")
def admin_session(admin_http, setup):
    """Login as admin (separate client to avoid cookie jar conflicts)."""
    response = admin_http.post(
        "/api/v1/auth/login",
        json={"email": setup["admin_email"], "password": setup["admin_password"]},
        headers=ORIGIN_HEADER,
    )
    assert response.status_code == 200, f"Admin login failed: {response.status_code} {response.text}"

    data = response.json()
    sid = data.get("session_id") or response.cookies.get("session_id")
    _state["admin_session_id"] = sid
    _state["admin_cookies"] = {"session_id": sid}
    _state["admin_headers"] = {**ORIGIN_HEADER}

    yield _state


# ============================================================================
# Magic Link Auth Tests
# ============================================================================

class TestClientAuth:
    """Test client magic link authentication."""

    def test_magic_link_creates_session(self, client_session):
        """Magic link verification returns a valid session."""
        assert client_session["client_session_id"]
        assert client_session["is_first_login"] is True

    def test_get_current_user(self, client, client_session):
        """GET /api/v1/auth/user returns client user data."""
        response = client.get(
            "/api/v1/auth/user",
            cookies=client_session["client_cookies"],
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == client_session["client_email"]
        assert data.get("role") == "client"

    def test_client_cannot_access_admin_endpoints(self, client, client_session):
        """Client user is blocked from admin-only endpoints."""
        response = client.get(
            "/api/v1/rbac/roles",
            cookies=client_session["client_cookies"],
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"

    def test_complete_tour(self, client, client_session):
        """POST /api/v1/onboarding/complete-tour marks tour complete."""
        response = client.post(
            "/api/v1/onboarding/complete-tour",
            cookies=client_session["client_cookies"],
            headers=client_session["client_headers"],
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True

    def test_invitation_status(self, client, client_session):
        """GET /api/v1/onboarding/invitation-status returns status."""
        response = client.get(
            "/api/v1/onboarding/invitation-status",
            cookies=client_session["client_cookies"],
        )
        assert response.status_code == 200
        data = response.json()
        assert "hasCompletedTour" in data


# ============================================================================
# Client Issues Tests
# ============================================================================

class TestClientIssues:
    """Test issue CRUD for client users."""

    def test_create_issue(self, client, client_session):
        """POST /api/v1/client-issues creates an issue."""
        response = client.post(
            "/api/v1/client-issues",
            json={
                "project_id": _state["project_id"],
                "title": f"{TEST_PREFIX}Issue",
                "description": "Test issue from client",
                "category": "general",
                "priority": "medium",
            },
            cookies=client_session["client_cookies"],
            headers=client_session["client_headers"],
        )
        assert response.status_code == 200, f"Create issue failed: {response.text}"
        data = response.json()
        _state["issue_id"] = str(data.get("id", ""))
        assert data.get("title") == f"{TEST_PREFIX}Issue"

    def test_list_issues(self, client, client_session):
        """GET /api/v1/client-issues returns issues."""
        response = client.get(
            f"/api/v1/client-issues?projectId={_state['project_id']}",
            cookies=client_session["client_cookies"],
        )
        assert response.status_code == 200
        issues = response.json()
        assert isinstance(issues, list)
        titles = [i.get("title") for i in issues]
        assert f"{TEST_PREFIX}Issue" in titles

    def test_update_issue(self, client, client_session):
        """PUT /api/v1/client-issues/{id} updates the issue."""
        issue_id = _state.get("issue_id")
        if not issue_id:
            pytest.skip("No test issue")
        response = client.put(
            f"/api/v1/client-issues/{issue_id}",
            json={"description": "Updated description"},
            cookies=client_session["client_cookies"],
            headers=client_session["client_headers"],
        )
        assert response.status_code == 200

    def test_add_comment(self, client, client_session):
        """POST /api/v1/client-issues/{id}/comments adds a comment."""
        issue_id = _state.get("issue_id")
        if not issue_id:
            pytest.skip("No test issue")
        response = client.post(
            f"/api/v1/client-issues/{issue_id}/comments",
            json={
                "issue_id": issue_id,
                "body": "Test comment from client",
            },
            cookies=client_session["client_cookies"],
            headers=client_session["client_headers"],
        )
        assert response.status_code == 200, f"Add comment failed: {response.text}"

    def test_list_comments(self, client, client_session):
        """GET /api/v1/client-issues/{id}/comments returns comments."""
        issue_id = _state.get("issue_id")
        if not issue_id:
            pytest.skip("No test issue")
        response = client.get(
            f"/api/v1/client-issues/{issue_id}/comments",
            cookies=client_session["client_cookies"],
        )
        assert response.status_code == 200
        comments = response.json()
        assert isinstance(comments, list)
        assert len(comments) > 0


# ============================================================================
# Client Forum Tests
# ============================================================================

class TestClientForum:
    """Test forum messaging for client users."""

    def test_post_message(self, client, client_session):
        """POST /api/v1/client-forum posts a forum message."""
        response = client.post(
            "/api/v1/client-forum",
            json={
                "project_id": _state["project_id"],
                "content": f"{TEST_PREFIX}Hello from client",
            },
            cookies=client_session["client_cookies"],
            headers=client_session["client_headers"],
        )
        assert response.status_code == 200, f"Post forum message failed: {response.text}"

    def test_list_messages(self, client, client_session):
        """GET /api/v1/client-forum returns forum messages."""
        response = client.get(
            f"/api/v1/client-forum?projectId={_state['project_id']}",
            cookies=client_session["client_cookies"],
        )
        assert response.status_code == 200
        messages = response.json()
        assert isinstance(messages, list)


# ============================================================================
# Client Materials Tests
# ============================================================================

class TestClientMaterials:
    """Test material management for client users."""

    def test_create_material_area(self, client, client_session):
        """POST /api/v1/material-areas creates a material area."""
        response = client.post(
            "/api/v1/material-areas",
            json={
                "project_id": _state["project_id"],
                "name": f"{TEST_PREFIX}Bathroom",
            },
            cookies=client_session["client_cookies"],
            headers=client_session["client_headers"],
        )
        assert response.status_code in [200, 201], f"Create area failed: {response.text}"
        data = response.json()
        _state["client_area_id"] = str(data.get("id", ""))

    def test_create_material_item(self, client, client_session):
        """POST /api/v1/material-items creates a material item."""
        area_id = _state.get("client_area_id")
        if not area_id:
            pytest.skip("No area created")
        response = client.post(
            "/api/v1/material-items",
            json={
                "project_id": _state["project_id"],
                "area_id": area_id,
                "name": f"{TEST_PREFIX}Tile",
                "spec": "12x24 porcelain",
                "vendor": "TileStore",
                "quantity": "50 sqft",
                "unit_cost": 5.50,
            },
            cookies=client_session["client_cookies"],
            headers=client_session["client_headers"],
        )
        assert response.status_code in [200, 201], f"Create item failed: {response.text}"
        data = response.json()
        _state["client_item_id"] = str(data.get("id", ""))

    def test_list_material_items(self, client, client_session):
        """GET /api/v1/material-items returns items."""
        area_id = _state.get("client_area_id")
        if not area_id:
            pytest.skip("No area created")
        response = client.get(
            f"/api/v1/material-items?projectId={_state['project_id']}&areaId={area_id}",
            cookies=client_session["client_cookies"],
        )
        assert response.status_code == 200
        items = response.json()
        assert isinstance(items, list)

    def test_update_material_item(self, client, client_session):
        """PATCH /api/v1/material-items/{id} updates item."""
        item_id = _state.get("client_item_id")
        if not item_id:
            pytest.skip("No item created")
        response = client.patch(
            f"/api/v1/material-items/{item_id}",
            json={"vendor": "UpdatedVendor"},
            cookies=client_session["client_cookies"],
            headers=client_session["client_headers"],
        )
        assert response.status_code == 200


# ============================================================================
# Client Stages Tests
# ============================================================================

class TestClientStages:
    """Test stage visibility for client users."""

    def test_view_stages(self, client, admin_http, admin_session, client_session):
        """Client can view project stages."""
        # First, create a client-visible stage as admin (using admin_http to avoid cookie jar issues)
        admin_response = admin_http.post(
            "/api/v1/stages",
            json={
                "projectId": _state["project_id"],
                "name": f"{TEST_PREFIX}Foundation",
                "status": "NOT_STARTED",
                "clientVisible": True,
                "startDate": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
                "endDate": (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d"),
            },
            cookies=admin_session["admin_cookies"],
            headers=admin_session["admin_headers"],
        )
        assert admin_response.status_code in [200, 201], f"Admin stage create failed: {admin_response.text}"
        data = admin_response.json()
        _state["stage_id"] = str(data.get("id", ""))

        # Client can view stages
        response = client.get(
            f"/api/v1/stages?projectId={_state['project_id']}",
            cookies=client_session["client_cookies"],
        )
        assert response.status_code == 200
        stages = response.json()
        assert isinstance(stages, list)

    def test_client_cannot_create_stage(self, client, client_session):
        """Client users cannot create stages."""
        response = client.post(
            "/api/v1/stages",
            json={
                "projectId": _state["project_id"],
                "name": f"{TEST_PREFIX}Unauthorized",
                "status": "NOT_STARTED",
            },
            cookies=client_session["client_cookies"],
            headers=client_session["client_headers"],
        )
        # Should be blocked by route guard or auth
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


# ============================================================================
# Client Payments Tests
# ============================================================================

class TestClientPayments:
    """Test payment visibility for client users."""

    def test_create_payment_schedule(self, client, admin_http, admin_session, client_session):
        """Admin creates a payment schedule, client can view it."""
        # Admin creates schedule (using admin_http)
        admin_response = admin_http.post(
            "/api/v1/payment-schedules",
            json={
                "project_id": _state["project_id"],
                "title": f"{TEST_PREFIX}Payment Plan",
            },
            cookies=admin_session["admin_cookies"],
            headers=admin_session["admin_headers"],
        )
        assert admin_response.status_code == 200, f"Create schedule failed: {admin_response.text}"
        data = admin_response.json()
        _state["schedule_id"] = str(data.get("id", ""))

    def test_list_payment_schedules(self, client, client_session):
        """Client can list payment schedules."""
        response = client.get(
            f"/api/v1/payment-schedules?project_id={_state['project_id']}",
            cookies=client_session["client_cookies"],
        )
        assert response.status_code == 200
        schedules = response.json()
        assert isinstance(schedules, list)

    def test_create_and_list_installments(self, client, admin_http, admin_session, client_session):
        """Admin creates installment, client can view it."""
        schedule_id = _state.get("schedule_id")
        if not schedule_id:
            pytest.skip("No schedule created")

        # Admin creates installment (using admin_http)
        admin_response = admin_http.post(
            "/api/v1/payment-installments",
            json={
                "project_id": _state["project_id"],
                "schedule_id": schedule_id,
                "name": f"{TEST_PREFIX}Deposit",
                "amount": 5000.00,
                "status": "planned",
            },
            cookies=admin_session["admin_cookies"],
            headers=admin_session["admin_headers"],
        )
        assert admin_response.status_code == 200, f"Create installment failed: {admin_response.text}"

        # Client can list installments
        response = client.get(
            f"/api/v1/payment-installments?project_id={_state['project_id']}",
            cookies=client_session["client_cookies"],
        )
        assert response.status_code == 200
        installments = response.json()
        assert isinstance(installments, list)


# ============================================================================
# Client Stats Tests
# ============================================================================

class TestClientStats:
    """Test client dashboard stats."""

    def test_get_client_stats(self, client, client_session):
        """GET /api/v1/client-stats returns stats."""
        response = client.get(
            f"/api/v1/client-stats?projectId={_state['project_id']}",
            cookies=client_session["client_cookies"],
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        # Should have counts (uses snake_case keys)
        assert "open_issues" in data or "totalIssues" in data
