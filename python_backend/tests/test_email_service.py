"""
Tests for Email Service (Resend).
Tests white-labeled HTML templates and API calls.
"""
import pytest
from unittest.mock import patch, MagicMock

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.services.email_service import _build_invite_html, _build_login_html, EmailService


class TestInviteEmailTemplate:
    def test_contains_company_name(self):
        """White-labeled email should contain the contractor's company name."""
        html = _build_invite_html(
            client_first_name="John",
            company_name="ABC Construction",
            company_logo_url=None,
            brand_color="#2563eb",
            pm_name="Mike",
            project_name="Kitchen Remodel",
            magic_link_url="https://app.example.com/auth/magic-link?token=abc",
        )
        assert "ABC Construction" in html

    def test_does_not_contain_proesphere(self):
        """White-labeled email should NOT mention 'Proesphere'."""
        html = _build_invite_html(
            client_first_name="John",
            company_name="ABC Construction",
            company_logo_url=None,
            brand_color="#2563eb",
            pm_name="Mike",
            project_name="Kitchen Remodel",
            magic_link_url="https://app.example.com/auth/magic-link?token=abc",
        )
        assert "Proesphere" not in html
        assert "proesphere" not in html.lower()

    def test_contains_magic_link_url(self):
        """Email should contain the magic link URL."""
        link = "https://app.example.com/auth/magic-link?token=xyz123"
        html = _build_invite_html(
            client_first_name="John",
            company_name="ABC Construction",
            company_logo_url=None,
            brand_color="#2563eb",
            pm_name="Mike",
            project_name="Kitchen Remodel",
            magic_link_url=link,
        )
        assert link in html

    def test_contains_client_name(self):
        """Email should address the client by first name."""
        html = _build_invite_html(
            client_first_name="Sarah",
            company_name="ABC Construction",
            company_logo_url=None,
            brand_color="#2563eb",
            pm_name="Mike",
            project_name="Kitchen Remodel",
            magic_link_url="https://example.com/link",
        )
        assert "Sarah" in html

    def test_contains_project_name(self):
        """Email should mention the project name."""
        html = _build_invite_html(
            client_first_name="John",
            company_name="ABC Construction",
            company_logo_url=None,
            brand_color="#2563eb",
            pm_name="Mike",
            project_name="Kitchen Remodel",
            magic_link_url="https://example.com/link",
        )
        assert "Kitchen Remodel" in html

    def test_contains_pm_name(self):
        """Email should mention the PM's name."""
        html = _build_invite_html(
            client_first_name="John",
            company_name="ABC Construction",
            company_logo_url=None,
            brand_color="#2563eb",
            pm_name="Mike Johnson",
            project_name="Kitchen Remodel",
            magic_link_url="https://example.com/link",
        )
        assert "Mike Johnson" in html

    def test_includes_logo_when_provided(self):
        """Email should include an img tag when logo URL is provided."""
        html = _build_invite_html(
            client_first_name="John",
            company_name="ABC Construction",
            company_logo_url="https://storage.example.com/logo.png",
            brand_color="#2563eb",
            pm_name="Mike",
            project_name="Kitchen Remodel",
            magic_link_url="https://example.com/link",
        )
        assert "https://storage.example.com/logo.png" in html
        assert "<img" in html

    def test_no_logo_when_not_provided(self):
        """Email should not have img tag when no logo URL."""
        html = _build_invite_html(
            client_first_name="John",
            company_name="ABC Construction",
            company_logo_url=None,
            brand_color="#2563eb",
            pm_name="Mike",
            project_name="Kitchen Remodel",
            magic_link_url="https://example.com/link",
        )
        assert "<img" not in html

    def test_includes_welcome_note(self):
        """Email should include the welcome note when provided."""
        html = _build_invite_html(
            client_first_name="John",
            company_name="ABC Construction",
            company_logo_url=None,
            brand_color="#2563eb",
            pm_name="Mike",
            project_name="Kitchen Remodel",
            magic_link_url="https://example.com/link",
            welcome_note="Looking forward to building your dream kitchen!",
        )
        assert "Looking forward to building your dream kitchen!" in html

    def test_brand_color_used_in_button(self):
        """Email button should use the brand color."""
        html = _build_invite_html(
            client_first_name="John",
            company_name="ABC Construction",
            company_logo_url=None,
            brand_color="#FF5733",
            pm_name="Mike",
            project_name="Kitchen Remodel",
            magic_link_url="https://example.com/link",
        )
        assert "#FF5733" in html


class TestLoginEmailTemplate:
    def test_contains_magic_link(self):
        """Login email should contain the magic link URL."""
        link = "https://app.example.com/auth/magic-link?token=login123"
        html = _build_login_html(
            client_first_name="John",
            company_name="ABC Construction",
            company_logo_url=None,
            brand_color="#2563eb",
            magic_link_url=link,
        )
        assert link in html

    def test_does_not_contain_proesphere(self):
        """Login email should not mention Proesphere."""
        html = _build_login_html(
            client_first_name="John",
            company_name="ABC Construction",
            company_logo_url=None,
            brand_color="#2563eb",
            magic_link_url="https://example.com/link",
        )
        assert "Proesphere" not in html
        assert "proesphere" not in html.lower()

    def test_mentions_15_minute_expiry(self):
        """Login email should mention the 15-minute expiry."""
        html = _build_login_html(
            client_first_name="John",
            company_name="ABC Construction",
            company_logo_url=None,
            brand_color="#2563eb",
            magic_link_url="https://example.com/link",
        )
        assert "15 minutes" in html


class TestEmailServiceInit:
    @patch("src.services.email_service.settings")
    @patch("src.services.email_service.resend", None)
    def test_disabled_when_resend_not_installed(self, mock_settings):
        """Service should be disabled when resend package is not installed."""
        service = EmailService()
        assert service._enabled is False

    @patch("src.services.email_service.settings")
    def test_disabled_when_api_key_empty(self, mock_settings):
        """Service should be disabled when RESEND_API_KEY is empty."""
        mock_settings.resend_api_key = ""
        service = EmailService()
        assert service._enabled is False
