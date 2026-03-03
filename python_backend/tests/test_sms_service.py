"""
Tests for SMS Service (Twilio).
Tests message formatting and Twilio API calls.
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.services.sms_service import SMSService


class TestSMSServiceInit:
    @patch("src.services.sms_service.TwilioClient", None)
    @patch("src.services.sms_service.settings")
    def test_disabled_when_twilio_not_installed(self, mock_settings):
        """Service should be disabled when twilio package is not installed."""
        service = SMSService()
        assert service._enabled is False

    @patch("src.services.sms_service.settings")
    def test_disabled_when_credentials_missing(self, mock_settings):
        """Service should be disabled when Twilio credentials are empty."""
        mock_settings.twilio_account_sid = ""
        mock_settings.twilio_auth_token = ""
        mock_settings.twilio_phone_number = ""
        service = SMSService()
        assert service._enabled is False


class TestSMSDelivery:
    @pytest.mark.asyncio
    async def test_send_returns_false_when_disabled(self):
        """send_invite_sms should return False when service is disabled."""
        with patch("src.services.sms_service.settings") as mock_settings:
            mock_settings.twilio_account_sid = ""
            mock_settings.twilio_auth_token = ""
            mock_settings.twilio_phone_number = ""
            service = SMSService()
            result = await service.send_invite_sms(
                to_phone="+15551234567",
                client_first_name="John",
                pm_name="Mike",
                company_name="ABC Construction",
                magic_link_url="https://example.com/link",
            )
            assert result is False

    @pytest.mark.asyncio
    @patch("src.services.sms_service.asyncio")
    @patch("src.services.sms_service.settings")
    @patch("src.services.sms_service.TwilioClient")
    async def test_sms_body_format(self, mock_twilio_class, mock_settings, mock_asyncio):
        """SMS body should match the PRD format."""
        mock_settings.twilio_account_sid = "AC123"
        mock_settings.twilio_auth_token = "auth123"
        mock_settings.twilio_phone_number = "+15559999999"

        mock_client = MagicMock()
        mock_twilio_class.return_value = mock_client

        service = SMSService()
        # Capture the body by mocking _send_message
        captured_body = None

        async def fake_to_thread(fn, to, body):
            nonlocal captured_body
            captured_body = body
            return "SM123"

        mock_asyncio.to_thread = fake_to_thread

        await service.send_invite_sms(
            to_phone="+15551234567",
            client_first_name="John",
            pm_name="Mike",
            company_name="ABC Construction",
            magic_link_url="https://example.com/link",
        )

        assert captured_body is not None
        assert "John" in captured_body
        assert "Mike" in captured_body
        assert "ABC Construction" in captured_body
        assert "https://example.com/link" in captured_body
        assert "project portal" in captured_body
