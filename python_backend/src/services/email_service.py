"""
Email Service using Resend for Client Onboarding.
Sends white-labeled emails branded with the contractor's company identity.
No Proesphere branding appears in any client-facing emails.
"""

import logging
from typing import Optional

try:
    import resend
except ImportError:
    resend = None

from ..core.config import settings

logger = logging.getLogger(__name__)


def _build_invite_html(
    client_first_name: str,
    company_name: str,
    company_logo_url: Optional[str],
    brand_color: str,
    pm_name: str,
    project_name: str,
    magic_link_url: str,
    welcome_note: Optional[str] = None,
) -> str:
    """Build white-labeled HTML for the client invite email."""
    logo_block = ""
    if company_logo_url:
        logo_block = f"""
        <div style="text-align: center; margin-bottom: 24px;">
            <img src="{company_logo_url}" alt="{company_name}"
                 style="max-height: 60px; max-width: 200px;" />
        </div>"""

    welcome_block = ""
    if welcome_note:
        welcome_block = f"""
        <div style="background-color: #f8f9fa; border-left: 3px solid {brand_color};
                    padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #374151; font-style: italic;">
                "{welcome_note}"
            </p>
            <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">
                &mdash; {pm_name}
            </p>
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            {logo_block}

            <h1 style="font-size: 24px; color: #111827; margin: 0 0 16px; text-align: center;">
                Your project dashboard is ready
            </h1>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 12px;">
                Hi {client_first_name},
            </p>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                {pm_name} from <strong>{company_name}</strong> has set up a project dashboard
                for <strong>{project_name}</strong>. You can track progress, view photos,
                communicate with your team, and more &mdash; all in one place.
            </p>

            {welcome_block}

            <div style="text-align: center; margin: 32px 0;">
                <a href="{magic_link_url}" target="_blank" rel="noopener noreferrer"
                   style="display: inline-block; background-color: {brand_color}; color: #ffffff;
                          padding: 14px 32px; border-radius: 8px; text-decoration: none;
                          font-size: 16px; font-weight: 600;">
                    View Your Project
                </a>
            </div>

            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 16px 0 0; word-break: break-all;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="{magic_link_url}" style="color: {brand_color};">{magic_link_url}</a>
            </p>

            <p style="color: #9ca3af; font-size: 13px; text-align: center; margin: 24px 0 0;">
                This link expires in 72 hours. No password needed &mdash; just click and you're in.
            </p>
        </div>

        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
            Sent on behalf of {company_name}
        </p>
    </div>
</body>
</html>"""


def _build_login_html(
    client_first_name: str,
    company_name: str,
    company_logo_url: Optional[str],
    brand_color: str,
    magic_link_url: str,
) -> str:
    """Build white-labeled HTML for the magic link login email."""
    logo_block = ""
    if company_logo_url:
        logo_block = f"""
        <div style="text-align: center; margin-bottom: 24px;">
            <img src="{company_logo_url}" alt="{company_name}"
                 style="max-height: 60px; max-width: 200px;" />
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            {logo_block}

            <h1 style="font-size: 24px; color: #111827; margin: 0 0 16px; text-align: center;">
                Sign in to your project
            </h1>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hi {client_first_name}, click below to access your project dashboard.
            </p>

            <div style="text-align: center; margin: 32px 0;">
                <a href="{magic_link_url}" target="_blank" rel="noopener noreferrer"
                   style="display: inline-block; background-color: {brand_color}; color: #ffffff;
                          padding: 14px 32px; border-radius: 8px; text-decoration: none;
                          font-size: 16px; font-weight: 600;">
                    View Your Project
                </a>
            </div>

            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 16px 0 0; word-break: break-all;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="{magic_link_url}" style="color: {brand_color};">{magic_link_url}</a>
            </p>

            <p style="color: #9ca3af; font-size: 13px; text-align: center; margin: 24px 0 0;">
                This link expires in 15 minutes. If you didn't request this, you can safely ignore it.
            </p>
        </div>

        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
            Sent on behalf of {company_name}
        </p>
    </div>
</body>
</html>"""


class EmailService:
    """Service for sending white-labeled emails via Resend."""

    def __init__(self):
        if resend and settings.resend_api_key:
            resend.api_key = settings.resend_api_key
            self._enabled = True
        else:
            self._enabled = False
            if not resend:
                logger.warning("Resend package not installed. Email delivery disabled.")
            else:
                logger.warning("RESEND_API_KEY not set. Email delivery disabled.")

    def _get_from_address(self, sender_name: Optional[str], company_name: str) -> str:
        """Build the From address using the company's sender name."""
        name = sender_name or company_name
        return f"{name} <noreply@{settings.resend_sender_domain}>"

    async def send_client_invite_email(
        self,
        to_email: str,
        client_first_name: str,
        company_name: str,
        company_logo_url: Optional[str],
        brand_color: str,
        pm_name: str,
        project_name: str,
        magic_link_url: str,
        welcome_note: Optional[str] = None,
        sender_name: Optional[str] = None,
    ) -> bool:
        """Send white-labeled invite email from contractor's company.

        Returns True if sent successfully, False otherwise.
        """
        if not self._enabled:
            logger.warning(f"Email not sent to {to_email}: service disabled")
            return False

        html = _build_invite_html(
            client_first_name=client_first_name,
            company_name=company_name,
            company_logo_url=company_logo_url,
            brand_color=brand_color,
            pm_name=pm_name,
            project_name=project_name,
            magic_link_url=magic_link_url,
            welcome_note=welcome_note,
        )

        try:
            resend.Emails.send({
                "from": self._get_from_address(sender_name, company_name),
                "to": [to_email],
                "subject": f"Your project dashboard is ready \u2014 {company_name}",
                "html": html,
            })
            logger.info(f"Invite email sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send invite email to {to_email}: {e}")
            return False

    async def send_magic_link_email(
        self,
        to_email: str,
        client_first_name: str,
        company_name: str,
        company_logo_url: Optional[str],
        brand_color: str,
        magic_link_url: str,
        sender_name: Optional[str] = None,
    ) -> bool:
        """Send magic link email for subsequent logins.

        Returns True if sent successfully, False otherwise.
        """
        if not self._enabled:
            logger.warning(f"Magic link email not sent to {to_email}: service disabled")
            return False

        html = _build_login_html(
            client_first_name=client_first_name,
            company_name=company_name,
            company_logo_url=company_logo_url,
            brand_color=brand_color,
            magic_link_url=magic_link_url,
        )

        try:
            resend.Emails.send({
                "from": self._get_from_address(sender_name, company_name),
                "to": [to_email],
                "subject": f"Sign in to your project \u2014 {company_name}",
                "html": html,
            })
            logger.info(f"Magic link email sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send magic link email to {to_email}: {e}")
            return False
