"""
Admin Workflow E2E Tests.
Tests the complete admin lifecycle: auth, project, task, stage, photo,
log, material, user management, and dashboard.

Runs the FastAPI server as a subprocess and tests via real HTTP requests.
This avoids event loop conflicts between asyncpg and BaseHTTPMiddleware
that occur with ASGITransport in-process testing.
"""

import pytest
import uuid
import bcrypt
import asyncio
import asyncpg
import httpx
import os
import sys
import signal
import socket
import subprocess
import time
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

# Unique prefix to identify test data for cleanup
TEST_ID = uuid.uuid4().hex[:8]
TEST_PREFIX = f"e2e_admin_{TEST_ID}_"
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
    """Run an async function synchronously using a temporary event loop."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ============================================================================
# Database helpers
# ============================================================================

async def _setup_test_data():
    """Create test company, admin role, and admin user via direct DB connection."""
    db_url = _get_db_url()
    if not db_url:
        pytest.skip("No DATABASE_URL_DEV or DATABASE_URL set")

    conn = await asyncpg.connect(db_url)
    try:
        company_id = str(uuid.uuid4())
        await conn.execute(
            "INSERT INTO companies (id, name, created_at) VALUES ($1, $2, NOW())",
            company_id, f"{TEST_PREFIX}Company",
        )

        row = await conn.fetchrow(
            "SELECT id FROM roles WHERE LOWER(COALESCE(role_name, name)) = 'admin' LIMIT 1"
        )
        if not row:
            pytest.skip("No admin role found in database")
        admin_role_id = row["id"]

        user_id = str(uuid.uuid4())
        email = f"{TEST_PREFIX}admin@test.com"
        password = "TestPassword123!"
        pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        await conn.execute(
            """INSERT INTO users (id, email, first_name, last_name, password,
               role_id, company_id, is_active, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())""",
            user_id, email, "E2E", "Admin", pw_hash, admin_role_id, company_id,
        )

        _state.update({
            "company_id": company_id,
            "admin_role_id": admin_role_id,
            "user_id": user_id,
            "email": email,
            "password": password,
        })
    finally:
        await conn.close()


async def _cleanup_test_data():
    """Remove all test data via direct DB connection."""
    db_url = _get_db_url()
    if not db_url:
        return
    conn = await asyncpg.connect(db_url)
    try:
        cid = _state.get("company_id")
        if not cid:
            return
        for q in [
            "DELETE FROM sessions WHERE sess::text LIKE '%' || $1 || '%'",
            "DELETE FROM schedule_changes WHERE task_id IN (SELECT t.id FROM tasks t JOIN projects p ON t.project_id = p.id WHERE p.company_id = $1)",
            "DELETE FROM client_portal.project_stages WHERE project_id IN (SELECT id::text FROM projects WHERE company_id = $1)",
            "DELETE FROM client_portal.material_items WHERE project_id IN (SELECT id::text FROM projects WHERE company_id = $1)",
            "DELETE FROM client_portal.material_areas WHERE project_id IN (SELECT id::text FROM projects WHERE company_id = $1)",
            "DELETE FROM project_logs WHERE company_id = $1",
            "DELETE FROM photos WHERE company_id = $1",
            "DELETE FROM tasks WHERE project_id IN (SELECT id FROM projects WHERE company_id = $1)",
            "DELETE FROM projects WHERE company_id = $1",
            "DELETE FROM users WHERE company_id = $1",
            "DELETE FROM companies WHERE id = $1",
        ]:
            try:
                await conn.execute(q, cid)
            except Exception:
                pass
    finally:
        await conn.close()


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture(scope="module")
def setup():
    """Create test data in DB, start server, yield, cleanup."""
    _run_async(_setup_test_data())

    # Start FastAPI server on a free port
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

    # Wait for server to become ready
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

    # Teardown: stop server and clean DB
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait()
    _run_async(_cleanup_test_data())


@pytest.fixture(scope="module")
def client(setup):
    """HTTP client pointing to the test server."""
    with httpx.Client(
        base_url=f"http://127.0.0.1:{setup['port']}",
        timeout=30.0,
    ) as c:
        yield c


@pytest.fixture(scope="module")
def admin_session(client, setup):
    """Login as admin and return session info."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": setup["email"], "password": setup["password"]},
        headers=ORIGIN_HEADER,
    )
    assert response.status_code == 200, f"Admin login failed: {response.status_code} {response.text}"

    data = response.json()
    session_id = data.get("session_id") or response.cookies.get("session_id")
    assert session_id, "No session_id in login response"

    _state["session_id"] = session_id
    _state["cookies"] = {"session_id": session_id}
    _state["headers"] = {**ORIGIN_HEADER}
    _state["user_data"] = data.get("user", {})

    yield _state


# ============================================================================
# Auth Tests
# ============================================================================

class TestAdminAuth:
    """Test auth lifecycle for admin users."""

    def test_login_returns_user_data(self, admin_session):
        """Login returns user data with correct email and role."""
        assert admin_session["user_data"]["email"] == admin_session["email"]
        assert "role" in admin_session["user_data"]

    def test_get_current_user(self, client, admin_session):
        """GET /api/v1/auth/user returns user data for authenticated session."""
        response = client.get(
            "/api/v1/auth/user",
            cookies=admin_session["cookies"],
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == admin_session["email"]

    def test_login_rejects_invalid_password(self, client, admin_session):
        """POST /api/v1/auth/login returns 401 for wrong password."""
        response = client.post(
            "/api/v1/auth/login",
            json={"email": admin_session["email"], "password": "WrongPassword!"},
            headers=ORIGIN_HEADER,
        )
        assert response.status_code == 401


# ============================================================================
# Project Tests
# ============================================================================

class TestProjectManagement:
    """Test project CRUD operations."""

    def test_create_project(self, client, admin_session):
        """POST /api/v1/projects creates a project."""
        response = client.post(
            "/api/v1/projects",
            json={
                "name": f"{TEST_PREFIX}Project",
                "description": "E2E test project",
                "status": "active",
            },
            cookies=admin_session["cookies"],
            headers=admin_session["headers"],
        )
        assert response.status_code == 201, f"Create project failed: {response.text}"
        data = response.json()
        assert data["name"] == f"{TEST_PREFIX}Project"
        _state["project_id"] = str(data["id"])

    def test_list_projects(self, client, admin_session):
        """GET /api/v1/projects returns projects list."""
        response = client.get(
            "/api/v1/projects",
            cookies=admin_session["cookies"],
        )
        assert response.status_code == 200
        projects = response.json()
        assert isinstance(projects, list)
        names = [p["name"] for p in projects]
        assert f"{TEST_PREFIX}Project" in names

    def test_get_project_by_id(self, client, admin_session):
        """GET /api/v1/projects/{id} returns the correct project."""
        project_id = _state.get("project_id")
        if not project_id:
            pytest.skip("No test project created")
        response = client.get(
            f"/api/v1/projects/{project_id}",
            cookies=admin_session["cookies"],
        )
        assert response.status_code == 200
        data = response.json()
        assert str(data["id"]) == project_id

    def test_update_project(self, client, admin_session):
        """PATCH /api/v1/projects/{id} updates project fields."""
        project_id = _state.get("project_id")
        if not project_id:
            pytest.skip("No test project created")
        response = client.patch(
            f"/api/v1/projects/{project_id}",
            json={"description": "Updated description"},
            cookies=admin_session["cookies"],
            headers=admin_session["headers"],
        )
        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "Updated description"


# ============================================================================
# Task Tests
# ============================================================================

class TestTaskManagement:
    """Test task CRUD operations."""

    def test_create_task(self, client, admin_session):
        """POST /api/v1/tasks creates a task."""
        project_id = _state.get("project_id")
        if not project_id:
            pytest.skip("No test project")
        response = client.post(
            "/api/v1/tasks",
            json={
                "title": f"{TEST_PREFIX}Task",
                "description": "E2E test task",
                "status": "pending",
                "priority": "medium",
                "projectId": project_id,
            },
            cookies=admin_session["cookies"],
            headers=admin_session["headers"],
        )
        assert response.status_code == 201, f"Create task failed: {response.text}"
        data = response.json()
        assert data["title"] == f"{TEST_PREFIX}Task"
        _state["task_id"] = str(data["id"])

    def test_list_tasks(self, client, admin_session):
        """GET /api/v1/tasks returns tasks."""
        project_id = _state.get("project_id")
        response = client.get(
            f"/api/v1/tasks?projectId={project_id}",
            cookies=admin_session["cookies"],
        )
        assert response.status_code == 200
        tasks = response.json()
        assert isinstance(tasks, list)
        titles = [t["title"] for t in tasks]
        assert f"{TEST_PREFIX}Task" in titles

    def test_update_task(self, client, admin_session):
        """PATCH /api/v1/tasks/{id} updates task."""
        task_id = _state.get("task_id")
        if not task_id:
            pytest.skip("No test task")
        response = client.patch(
            f"/api/v1/tasks/{task_id}",
            json={"status": "in-progress"},
            cookies=admin_session["cookies"],
            headers=admin_session["headers"],
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "in-progress"

    def test_delete_task(self, client, admin_session):
        """DELETE /api/v1/tasks/{id} removes the task."""
        task_id = _state.get("task_id")
        if not task_id:
            pytest.skip("No test task")
        response = client.delete(
            f"/api/v1/tasks/{task_id}",
            cookies=admin_session["cookies"],
            headers=admin_session["headers"],
        )
        assert response.status_code == 204


# ============================================================================
# Stage Tests
# ============================================================================

class TestStageManagement:
    """Test stage CRUD operations."""

    def test_list_templates(self, client, admin_session):
        """GET /api/v1/stages/templates returns stage templates."""
        response = client.get(
            "/api/v1/stages/templates",
            cookies=admin_session["cookies"],
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_create_stage(self, client, admin_session):
        """POST /api/v1/stages creates a stage."""
        project_id = _state.get("project_id")
        if not project_id:
            pytest.skip("No test project")
        response = client.post(
            "/api/v1/stages",
            json={
                "projectId": project_id,
                "name": f"{TEST_PREFIX}Stage",
                "status": "NOT_STARTED",
                "clientVisible": True,
                "startDate": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
                "endDate": (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d"),
            },
            cookies=admin_session["cookies"],
            headers=admin_session["headers"],
        )
        assert response.status_code in [200, 201], f"Create stage failed: {response.text}"
        data = response.json()
        _state["stage_id"] = str(data.get("id", ""))

    def test_update_stage(self, client, admin_session):
        """PATCH /api/v1/stages/{id} updates stage."""
        stage_id = _state.get("stage_id")
        if not stage_id:
            pytest.skip("No test stage")
        response = client.patch(
            f"/api/v1/stages/{stage_id}",
            json={"name": f"{TEST_PREFIX}UpdatedStage"},
            cookies=admin_session["cookies"],
            headers=admin_session["headers"],
        )
        assert response.status_code == 200

    def test_list_stages(self, client, admin_session):
        """GET /api/v1/stages returns project stages."""
        project_id = _state.get("project_id")
        if not project_id:
            pytest.skip("No test project")
        response = client.get(
            f"/api/v1/stages?projectId={project_id}",
            cookies=admin_session["cookies"],
        )
        assert response.status_code == 200
        stages = response.json()
        assert isinstance(stages, list)


# ============================================================================
# Photo Tests
# ============================================================================

class TestPhotoManagement:
    """Test photo upload and listing."""

    def test_upload_photo(self, client, admin_session):
        """POST /api/v1/photos creates a photo record."""
        project_id = _state.get("project_id")
        if not project_id:
            pytest.skip("No test project")
        response = client.post(
            "/api/v1/photos",
            json={
                "projectId": project_id,
                "filename": f"{TEST_PREFIX}photo.jpg",
                "originalName": "test_photo.jpg",
                "description": "E2E test photo",
            },
            cookies=admin_session["cookies"],
            headers=admin_session["headers"],
        )
        assert response.status_code in [200, 201], f"Upload photo failed: {response.text}"
        data = response.json()
        _state["photo_id"] = str(data.get("id", ""))

    def test_list_photos(self, client, admin_session):
        """GET /api/v1/photos returns project photos."""
        project_id = _state.get("project_id")
        response = client.get(
            f"/api/v1/photos?projectId={project_id}",
            cookies=admin_session["cookies"],
        )
        assert response.status_code == 200
        photos = response.json()
        assert isinstance(photos, list)


# ============================================================================
# Log Tests
# ============================================================================

class TestLogManagement:
    """Test project log CRUD."""

    def test_create_log(self, client, admin_session):
        """POST /api/v1/logs creates a log entry."""
        project_id = _state.get("project_id")
        if not project_id:
            pytest.skip("No test project")
        response = client.post(
            "/api/v1/logs",
            json={
                "projectId": project_id,
                "title": f"{TEST_PREFIX}Log",
                "content": "E2E test log entry",
                "logType": "general",
            },
            cookies=admin_session["cookies"],
            headers=admin_session["headers"],
        )
        assert response.status_code in [200, 201], f"Create log failed: {response.text}"
        data = response.json()
        _state["log_id"] = str(data.get("id", ""))

    def test_list_logs(self, client, admin_session):
        """GET /api/v1/logs returns project logs."""
        project_id = _state.get("project_id")
        response = client.get(
            f"/api/v1/logs?projectId={project_id}",
            cookies=admin_session["cookies"],
        )
        assert response.status_code == 200
        logs = response.json()
        assert isinstance(logs, list)

    def test_update_log(self, client, admin_session):
        """PATCH /api/v1/logs/{id} updates log."""
        log_id = _state.get("log_id")
        if not log_id:
            pytest.skip("No test log")
        response = client.patch(
            f"/api/v1/logs/{log_id}",
            json={"content": "Updated log content"},
            cookies=admin_session["cookies"],
            headers=admin_session["headers"],
        )
        assert response.status_code == 200


# ============================================================================
# Material Tests
# ============================================================================

class TestMaterialManagement:
    """Test material areas and items."""

    def test_create_material_area(self, client, admin_session):
        """POST /api/v1/material-areas creates a material area."""
        project_id = _state.get("project_id")
        if not project_id:
            pytest.skip("No test project")
        response = client.post(
            "/api/v1/material-areas",
            json={
                "project_id": project_id,
                "name": f"{TEST_PREFIX}Kitchen",
            },
            cookies=admin_session["cookies"],
            headers=admin_session["headers"],
        )
        assert response.status_code in [200, 201], f"Create area failed: {response.text}"
        data = response.json()
        _state["area_id"] = str(data.get("id", ""))

    def test_create_material_item(self, client, admin_session):
        """POST /api/v1/material-items creates a material item."""
        area_id = _state.get("area_id")
        project_id = _state.get("project_id")
        if not area_id:
            pytest.skip("No test area")
        response = client.post(
            "/api/v1/material-items",
            json={
                "area_id": area_id,
                "project_id": project_id,
                "name": f"{TEST_PREFIX}Granite",
                "spec": "Premium",
                "quantity": "10 slabs",
                "unit_cost": 250.00,
            },
            cookies=admin_session["cookies"],
            headers=admin_session["headers"],
        )
        assert response.status_code in [200, 201], f"Create item failed: {response.text}"
        data = response.json()
        _state["item_id"] = str(data.get("id", ""))

    def test_list_material_items(self, client, admin_session):
        """GET /api/v1/material-items returns items."""
        area_id = _state.get("area_id")
        project_id = _state.get("project_id")
        if not area_id:
            pytest.skip("No test area")
        response = client.get(
            f"/api/v1/material-items?areaId={area_id}&projectId={project_id}",
            cookies=admin_session["cookies"],
        )
        assert response.status_code == 200
        items = response.json()
        assert isinstance(items, list)


# ============================================================================
# User Management Tests
# ============================================================================

class TestUserManagement:
    """Test user CRUD with RBAC."""

    def test_list_roles(self, client, admin_session):
        """GET /api/v1/rbac/roles returns available roles."""
        response = client.get(
            "/api/v1/rbac/roles",
            cookies=admin_session["cookies"],
        )
        assert response.status_code == 200
        roles = response.json()
        assert isinstance(roles, list)
        assert len(roles) > 0

    def test_create_user(self, client, admin_session):
        """POST /api/v1/rbac/users creates a new user."""
        response = client.post(
            "/api/v1/rbac/users",
            json={
                "first_name": "Test",
                "last_name": "User",
                "email": f"{TEST_PREFIX}newuser@test.com",
                "password": "NewUserPass123!",
                "role_id": _state["admin_role_id"],
                "company_id": _state["company_id"],
            },
            cookies=admin_session["cookies"],
            headers=admin_session["headers"],
        )
        assert response.status_code in [200, 201], f"Create user failed: {response.text}"
        data = response.json()
        _state["created_user_id"] = str(data.get("id", ""))

    def test_list_users(self, client, admin_session):
        """GET /api/v1/rbac/users returns users."""
        response = client.get(
            "/api/v1/rbac/users",
            cookies=admin_session["cookies"],
        )
        assert response.status_code == 200
        data = response.json()
        users = data if isinstance(data, list) else data.get("users", [])
        emails = [u.get("email") for u in users]
        assert f"{TEST_PREFIX}newuser@test.com" in emails

    def test_update_user(self, client, admin_session):
        """PATCH /api/v1/rbac/users/{id} updates user."""
        user_id = _state.get("created_user_id")
        if not user_id:
            pytest.skip("No test user")
        response = client.patch(
            f"/api/v1/rbac/users/{user_id}",
            json={"first_name": "Updated"},
            cookies=admin_session["cookies"],
            headers=admin_session["headers"],
        )
        assert response.status_code == 200


# ============================================================================
# Dashboard Tests
# ============================================================================

class TestDashboard:
    """Test dashboard endpoints."""

    def test_get_dashboard_stats(self, client, admin_session):
        """GET /api/v1/dashboard/stats returns stats."""
        response = client.get(
            "/api/v1/dashboard/stats",
            cookies=admin_session["cookies"],
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    def test_get_activities(self, client, admin_session):
        """GET /api/v1/activities returns activity list."""
        response = client.get(
            "/api/v1/activities",
            cookies=admin_session["cookies"],
        )
        assert response.status_code == 200
