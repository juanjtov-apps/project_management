"""
Onboarding API Route Tests.
Verifies endpoint registration, auth enforcement, and basic request validation.
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
# ROUTE EXISTENCE AND AUTH ENFORCEMENT
# ============================================================================

class TestOnboardingRouteRegistration:
    """Verify all onboarding endpoints are registered (not returning 404)."""

    @pytest.mark.asyncio
    async def test_invite_client_endpoint_exists(self, client):
        """POST /api/v1/onboarding/invite-client should exist (not 404)."""
        response = await client.post("/api/v1/onboarding/invite-client", json={})
        assert response.status_code != 404, f"Endpoint returned 404"

    @pytest.mark.asyncio
    async def test_verify_magic_link_endpoint_exists(self, client):
        """POST /api/v1/onboarding/verify-magic-link should exist (not 404)."""
        response = await client.post("/api/v1/onboarding/verify-magic-link", json={"token": "test"})
        assert response.status_code != 404, f"Endpoint returned 404"

    @pytest.mark.asyncio
    async def test_request_magic_link_endpoint_exists(self, client):
        """POST /api/v1/onboarding/request-magic-link should exist (not 404)."""
        response = await client.post(
            "/api/v1/onboarding/request-magic-link",
            json={"email": "test@example.com"},
        )
        assert response.status_code != 404, f"Endpoint returned 404"

    @pytest.mark.asyncio
    async def test_complete_tour_endpoint_exists(self, client):
        """POST /api/v1/onboarding/complete-tour should exist (not 404)."""
        response = await client.post("/api/v1/onboarding/complete-tour")
        assert response.status_code != 404, f"Endpoint returned 404"

    @pytest.mark.asyncio
    async def test_invitation_status_endpoint_exists(self, client):
        """GET /api/v1/onboarding/invitation-status should exist (not 404)."""
        response = await client.get("/api/v1/onboarding/invitation-status")
        assert response.status_code != 404, f"Endpoint returned 404"

    @pytest.mark.asyncio
    async def test_company_branding_endpoint_exists(self, client):
        """PUT /api/v1/onboarding/company-branding should exist (not 404)."""
        response = await client.put("/api/v1/onboarding/company-branding", json={})
        assert response.status_code != 404, f"Endpoint returned 404"


class TestOnboardingAuthEnforcement:
    """Verify auth is required on protected endpoints."""

    @pytest.mark.asyncio
    async def test_invite_client_requires_auth(self, client):
        """POST /api/v1/onboarding/invite-client should return 401 without auth."""
        response = await client.post(
            "/api/v1/onboarding/invite-client",
            json={
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
                "project_id": "test-project",
            },
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_complete_tour_requires_auth(self, client):
        """POST /api/v1/onboarding/complete-tour should return 401 without auth."""
        response = await client.post("/api/v1/onboarding/complete-tour")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_invitation_status_requires_auth(self, client):
        """GET /api/v1/onboarding/invitation-status should return 401 without auth."""
        response = await client.get("/api/v1/onboarding/invitation-status")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_company_branding_requires_auth(self, client):
        """PUT /api/v1/onboarding/company-branding should return 401 without auth."""
        response = await client.put(
            "/api/v1/onboarding/company-branding",
            json={"brand_color": "#FF0000"},
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestOnboardingPublicEndpoints:
    """Verify public endpoints don't require auth."""

    @pytest.mark.asyncio
    async def test_verify_magic_link_is_public(self, client):
        """POST /api/v1/onboarding/verify-magic-link should not return 401."""
        response = await client.post(
            "/api/v1/onboarding/verify-magic-link", json={"token": "invalid-token"}
        )
        # Should return 401 for invalid token (auth failed), not for missing session
        assert response.status_code == 401
        data = response.json()
        assert "expired" in data.get("detail", "").lower() or "invalid" in data.get("detail", "").lower()

    @pytest.mark.asyncio
    async def test_request_magic_link_is_public(self, client):
        """POST /api/v1/onboarding/request-magic-link should return 200 for any email."""
        response = await client.post(
            "/api/v1/onboarding/request-magic-link",
            json={"email": "nonexistent@example.com"},
        )
        # Should always return 200 (anti-enumeration)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "message" in data


class TestOnboardingValidation:
    """Verify request body validation."""

    @pytest.mark.asyncio
    async def test_verify_magic_link_requires_token(self, client):
        """POST /api/v1/onboarding/verify-magic-link should require token field."""
        response = await client.post("/api/v1/onboarding/verify-magic-link", json={})
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_request_magic_link_requires_email(self, client):
        """POST /api/v1/onboarding/request-magic-link should require email field."""
        response = await client.post("/api/v1/onboarding/request-magic-link", json={})
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_request_magic_link_validates_email_format(self, client):
        """POST /api/v1/onboarding/request-magic-link should reject invalid email."""
        response = await client.post(
            "/api/v1/onboarding/request-magic-link", json={"email": "not-an-email"}
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
