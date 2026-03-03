"""
API Route Tests - Verify all v1 endpoints are accessible.

These tests verify that endpoints exist and return appropriate auth errors (not 404s).
They don't test actual functionality - just route registration.
"""
import pytest
from httpx import AsyncClient, ASGITransport

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app


@pytest.fixture
async def client():
    """Create an async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ============================================================================
# AUTH ENDPOINTS
# ============================================================================

class TestAuthRoutes:
    @pytest.mark.asyncio
    async def test_auth_user_returns_401_without_session(self, client):
        """GET /api/v1/auth/user should return 401 without session."""
        response = await client.get("/api/v1/auth/user")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_auth_login_endpoint_exists(self, client):
        """POST /api/v1/auth/login should exist (not 404)."""
        response = await client.post("/api/v1/auth/login", json={})
        assert response.status_code in [400, 401, 422], f"Expected 400/401/422, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_auth_logout_endpoint_exists(self, client):
        """POST /api/v1/auth/logout should exist (not 404)."""
        response = await client.post("/api/v1/auth/logout")
        # Logout without session should still work or return auth error
        assert response.status_code != 404, f"Endpoint returned 404"


# ============================================================================
# PROJECT ENDPOINTS
# ============================================================================

class TestProjectRoutes:
    @pytest.mark.asyncio
    async def test_projects_requires_auth(self, client):
        """GET /api/v1/projects should return 401 without auth."""
        response = await client.get("/api/v1/projects")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_projects_post_requires_auth(self, client):
        """POST /api/v1/projects should return 401 or 403 without auth."""
        response = await client.post("/api/v1/projects", json={})
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


# ============================================================================
# TASK ENDPOINTS
# ============================================================================

class TestTaskRoutes:
    @pytest.mark.asyncio
    async def test_tasks_requires_auth(self, client):
        """GET /api/v1/tasks should return 401 without auth."""
        response = await client.get("/api/v1/tasks")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


# ============================================================================
# PHOTO ENDPOINTS
# ============================================================================

class TestPhotoRoutes:
    @pytest.mark.asyncio
    async def test_photos_requires_auth(self, client):
        """GET /api/v1/photos should return 401 without auth."""
        response = await client.get("/api/v1/photos")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


# ============================================================================
# SCHEDULE CHANGES ENDPOINTS
# ============================================================================

class TestScheduleRoutes:
    @pytest.mark.asyncio
    async def test_schedule_changes_requires_auth(self, client):
        """GET /api/v1/schedule-changes should return 401 without auth."""
        response = await client.get("/api/v1/schedule-changes")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


# ============================================================================
# PAYMENT ENDPOINTS
# ============================================================================

class TestPaymentRoutes:
    @pytest.mark.asyncio
    async def test_payment_schedules_requires_auth(self, client):
        """GET /api/v1/payment-schedules should return 401 without auth."""
        response = await client.get("/api/v1/payment-schedules?project_id=test")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_payment_installments_requires_auth(self, client):
        """GET /api/v1/payment-installments should return 401 without auth."""
        response = await client.get("/api/v1/payment-installments?project_id=test")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_payment_documents_requires_auth(self, client):
        """GET /api/v1/payment-documents should return 401 without auth."""
        response = await client.get("/api/v1/payment-documents?project_id=test")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_payment_receipts_requires_auth(self, client):
        """GET /api/v1/payment-receipts should return 401 without auth."""
        response = await client.get("/api/v1/payment-receipts?project_id=test")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


# ============================================================================
# CLIENT PORTAL ENDPOINTS
# ============================================================================

class TestClientPortalRoutes:
    @pytest.mark.asyncio
    async def test_client_issues_requires_auth(self, client):
        """GET /api/v1/client-issues should return 401 without auth."""
        response = await client.get("/api/v1/client-issues?project_id=test")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_forum_threads_requires_auth(self, client):
        """GET /api/v1/client-forum should return 401 without auth."""
        response = await client.get("/api/v1/client-forum?project_id=test")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_material_areas_requires_auth(self, client):
        """GET /api/v1/material-areas should return 401 without auth."""
        response = await client.get("/api/v1/material-areas?project_id=test")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


# ============================================================================
# NOTIFICATIONS ENDPOINTS
# ============================================================================

class TestNotificationRoutes:
    @pytest.mark.asyncio
    async def test_pm_notifications_requires_auth(self, client):
        """GET /api/v1/pm-notifications should return 401 without auth."""
        response = await client.get("/api/v1/pm-notifications")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


# ============================================================================
# DASHBOARD ENDPOINTS
# ============================================================================

class TestDashboardRoutes:
    @pytest.mark.asyncio
    async def test_dashboard_stats_requires_auth(self, client):
        """GET /api/v1/dashboard/stats should return 401 without auth."""
        response = await client.get("/api/v1/dashboard/stats")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


# ============================================================================
# STAGES ENDPOINTS
# ============================================================================

class TestStagesRoutes:
    @pytest.mark.asyncio
    async def test_stages_requires_auth(self, client):
        """GET /api/v1/stages should return 401 without auth."""
        response = await client.get("/api/v1/stages?project_id=test")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_stage_templates_requires_auth(self, client):
        """GET /api/v1/stages/templates should return 401 without auth."""
        response = await client.get("/api/v1/stages/templates")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


# ============================================================================
# MATERIALS ENDPOINTS
# ============================================================================

class TestMaterialsRoutes:
    @pytest.mark.asyncio
    async def test_materials_suggested_requires_auth(self, client):
        """GET /api/v1/materials/suggested should return 401 without auth."""
        response = await client.get("/api/v1/materials/suggested?project_id=test")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


# ============================================================================
# LOGS ENDPOINTS
# ============================================================================

class TestLogsRoutes:
    @pytest.mark.asyncio
    async def test_logs_requires_auth(self, client):
        """GET /api/v1/logs should return 401 without auth."""
        response = await client.get("/api/v1/logs?project_id=test")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


# ============================================================================
# USERS ENDPOINTS
# ============================================================================

class TestUsersRoutes:
    @pytest.mark.asyncio
    async def test_users_requires_auth(self, client):
        """GET /api/v1/users should return 401 without auth."""
        response = await client.get("/api/v1/users")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_users_managers_requires_auth(self, client):
        """GET /api/v1/users/managers should return 401 without auth."""
        response = await client.get("/api/v1/users/managers")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


# ============================================================================
# RBAC ENDPOINTS
# ============================================================================

class TestRBACRoutes:
    @pytest.mark.asyncio
    async def test_rbac_roles_requires_auth(self, client):
        """GET /api/v1/rbac/roles should return 401 without auth."""
        response = await client.get("/api/v1/rbac/roles")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_rbac_permissions_requires_auth(self, client):
        """GET /api/v1/rbac/permissions should return 401 without auth."""
        response = await client.get("/api/v1/rbac/permissions")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


# ============================================================================
# SUBCONTRACTOR ASSIGNMENTS ENDPOINTS
# ============================================================================

class TestSubcontractorRoutes:
    @pytest.mark.asyncio
    async def test_subcontractor_assignments_requires_auth(self, client):
        """GET /api/v1/subcontractor-assignments/ should return 401 without auth."""
        # Note: trailing slash required for this endpoint
        response = await client.get("/api/v1/subcontractor-assignments/")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


# ============================================================================
# OBJECTS/UPLOAD ENDPOINTS
# ============================================================================

class TestObjectsRoutes:
    @pytest.mark.asyncio
    async def test_objects_upload_requires_auth(self, client):
        """POST /api/v1/objects/upload should return 401 or 403 without auth."""
        response = await client.post("/api/v1/objects/upload")
        # May return 403 due to CSRF protection before auth check
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


# ============================================================================
# COMPANIES ENDPOINTS
# ============================================================================

class TestCompaniesRoutes:
    @pytest.mark.asyncio
    async def test_companies_requires_auth(self, client):
        """GET /api/v1/companies should return 401 without auth."""
        response = await client.get("/api/v1/companies")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


# ============================================================================
# ADMIN ENDPOINTS
# ============================================================================

class TestAdminRoutes:
    @pytest.mark.asyncio
    async def test_admin_companies_requires_auth(self, client):
        """GET /api/v1/admin/companies should return 401 without auth."""
        response = await client.get("/api/v1/admin/companies")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_admin_users_requires_auth(self, client):
        """GET /api/v1/admin/users should return 401 without auth."""
        response = await client.get("/api/v1/admin/users")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


# ============================================================================
# COMPANY ADMIN ENDPOINTS
# ============================================================================

class TestCompanyAdminRoutes:
    @pytest.mark.asyncio
    async def test_company_admin_users_requires_auth(self, client):
        """GET /api/v1/company-admin/users should return 401 without auth."""
        response = await client.get("/api/v1/company-admin/users")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


# ============================================================================
# ACTIVITIES ENDPOINTS
# ============================================================================

class TestActivitiesRoutes:
    @pytest.mark.asyncio
    async def test_activities_requires_auth(self, client):
        """GET /api/v1/activities should return 401 without auth."""
        response = await client.get("/api/v1/activities")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


# ============================================================================
# COMMUNICATIONS ENDPOINTS
# ============================================================================


# ============================================================================
# WAITLIST ENDPOINTS (PUBLIC)
# ============================================================================

class TestWaitlistRoutes:
    @pytest.mark.asyncio
    async def test_waitlist_accepts_post(self, client):
        """POST /api/v1/waitlist should exist (not 404)."""
        response = await client.post("/api/v1/waitlist", json={"email": "test@example.com"})
        # Should not be 404 - either success, validation error, or duplicate
        assert response.status_code != 404, f"Endpoint returned 404"


# ============================================================================
# HEALTH CHECK
# ============================================================================

class TestHealthRoutes:
    @pytest.mark.asyncio
    async def test_health_endpoint(self, client):
        """GET /health should return 200."""
        response = await client.get("/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
