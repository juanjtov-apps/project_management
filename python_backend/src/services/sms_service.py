"""
SMS Service using Twilio for Client Onboarding.
Sends deep-link SMS messages to clients when they are invited to a project.
"""

import asyncio
import logging
from typing import Optional

try:
    from twilio.rest import Client as TwilioClient
except ImportError:
    TwilioClient = None

from ..core.config import settings

logger = logging.getLogger(__name__)


class SMSService:
    """Service for sending SMS messages via Twilio."""

    def __init__(self):
        if (
            TwilioClient
            and settings.twilio_account_sid
            and settings.twilio_auth_token
            and settings.twilio_phone_number
        ):
            self._client = TwilioClient(
                settings.twilio_account_sid, settings.twilio_auth_token
            )
            self._from_number = settings.twilio_phone_number
            self._enabled = True
        else:
            self._client = None
            self._from_number = None
            self._enabled = False
            if not TwilioClient:
                logger.warning("Twilio package not installed. SMS delivery disabled.")
            else:
                logger.warning("Twilio credentials not configured. SMS delivery disabled.")

    def _send_message(self, to: str, body: str) -> Optional[str]:
        """Synchronous Twilio send (called via asyncio.to_thread)."""
        message = self._client.messages.create(
            to=to,
            from_=self._from_number,
            body=body,
        )
        return message.sid

    async def send_invite_sms(
        self,
        to_phone: str,
        client_first_name: str,
        pm_name: str,
        company_name: str,
        magic_link_url: str,
    ) -> bool:
        """Send SMS with deep-link to the client's project portal.

        Returns True if sent successfully, False otherwise.
        """
        if not self._enabled:
            logger.warning(f"SMS not sent to {to_phone}: service disabled")
            return False

        body = (
            f"Hi {client_first_name}, {pm_name} from {company_name} "
            f"just set up your project portal. "
            f"Tap to view your project \u2192 {magic_link_url}"
        )

        try:
            sid = await asyncio.to_thread(self._send_message, to_phone, body)
            logger.info(f"Invite SMS sent to {to_phone} (sid={sid})")
            return True
        except Exception as e:
            logger.error(f"Failed to send invite SMS to {to_phone}: {e}")
            return False
