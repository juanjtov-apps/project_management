"""
Client Onboarding API endpoints.
Handles client invitation, magic link authentication, guided tour, and company branding.
Scope: Client users only (role=client). Other roles are unaffected.
"""

import logging
import time
from collections import defaultdict
from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr

from ..database.connection import get_db_pool
from ..core.config import settings
from ..core.storage import get_storage_config, generate_signed_url
from ..services.magic_link_service import MagicLinkService
from ..services.email_service import EmailService
from ..services.sms_service import SMSService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

# Per-endpoint rate limiting for magic link requests
# key: email or IP -> list of timestamps
_rate_limit_store: Dict[str, list] = defaultdict(list)
RATE_LIMIT_WINDOW = 900  # 15 minutes
RATE_LIMIT_PER_EMAIL = 3
RATE_LIMIT_PER_IP = 10


def _check_rate_limit(key: str, max_requests: int) -> bool:
    """Check if rate limit is exceeded. Returns True if OK, False if exceeded."""
    now = time.time()
    # Clean old entries
    _rate_limit_store[key] = [t for t in _rate_limit_store[key] if now - t < RATE_LIMIT_WINDOW]
    if len(_rate_limit_store[key]) >= max_requests:
        return False
    _rate_limit_store[key].append(now)
    return True


# --- Helper: Get authenticated user from session ---

async def _get_session_user(request: Request) -> Dict[str, Any]:
    """Extract authenticated user from session cookie. Raises 401 if not authenticated."""
    from .auth import get_session

    session_id = request.cookies.get("session_id")
    if not session_id:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_id = auth_header[7:]

    if not session_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    session_data = await get_session(session_id)
    if not session_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired or invalid")

    return session_data["user_data"]


async def _resolve_logo_url(logo_path: Optional[str]) -> Optional[str]:
    """Convert a GCS object path to a signed URL for use in emails.
    Returns None if the path is empty or URL generation fails."""
    if not logo_path:
        return None
    # If it's already a full URL, return as-is
    if logo_path.startswith(("http://", "https://", "data:")):
        return logo_path
    try:
        config = get_storage_config()
        bucket_id = config["bucket_id"]
        # Use 7-day expiry so emails opened days later still show the logo
        signed_url = await generate_signed_url(bucket_id, logo_path, method="GET", expires_minutes=60 * 24 * 7)
        return signed_url
    except Exception as e:
        logger.warning(f"Failed to generate signed URL for logo '{logo_path}': {e}")
        return None


async def _get_role_name(conn, role_id) -> Optional[str]:
    """Get role name from role_id."""
    from .auth import get_role_column_name

    role_col = await get_role_column_name(conn)
    if not role_col or role_id is None:
        return None
    row = await conn.fetchrow(f"SELECT {role_col} as role_name FROM roles WHERE id = $1", role_id)
    return row["role_name"] if row else None


# --- Request/Response Models ---

class InviteClientRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    project_id: str
    welcome_note: Optional[str] = None


class VerifyMagicLinkRequest(BaseModel):
    token: str


class RequestMagicLinkRequest(BaseModel):
    email: EmailStr


class CompanyBrandingRequest(BaseModel):
    logo_url: Optional[str] = None
    brand_color: Optional[str] = None
    sender_name: Optional[str] = None


# --- Endpoints ---

@router.post("/invite-client")
async def invite_client(body: InviteClientRequest, request: Request):
    """Invite a client to their project portal.

    Creates a client user (no password), sends a white-labeled email
    with a magic link, and optionally sends an SMS deep-link.
    Auth: admin, project_manager, office_manager only.
    """
    user_data = await _get_session_user(request)
    caller_role = (user_data.get("role_name") or user_data.get("role", "")).lower()

    allowed_roles = {"admin", "project_manager", "office_manager", "manager"}
    is_root = user_data.get("is_root") or user_data.get("isRoot")
    if not is_root and caller_role not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    company_id = str(user_data.get("company_id") or user_data.get("companyId") or "")
    if not company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No company context")

    pool = await get_db_pool()
    magic_link_svc = MagicLinkService(pool)
    email_svc = EmailService()
    sms_svc = SMSService()

    async with pool.acquire() as conn:
        # Check if user with this email already exists
        existing_user = await conn.fetchrow(
            "SELECT id, role_id FROM users WHERE email = $1", body.email
        )

        if existing_user:
            existing_role = await _get_role_name(conn, existing_user["role_id"])
            if existing_role and existing_role.lower() != "client":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"User with this email already exists with role '{existing_role}'"
                )
            # Re-invite existing client user
            client_user_id = str(existing_user["id"])
            # Update their assigned project if needed
            await conn.execute(
                "UPDATE users SET assigned_project_id = $1, phone = COALESCE($2, phone) WHERE id = $3",
                body.project_id, body.phone, client_user_id,
            )
        else:
            # Create new client user with NO password (magic link only)
            # Look up client role_id
            from .auth import get_role_column_name

            role_col = await get_role_column_name(conn)
            client_role_row = await conn.fetchrow(
                f"SELECT id FROM roles WHERE LOWER({role_col}) = 'client'" if role_col else "SELECT id FROM roles WHERE id = 6"
            )
            client_role_id = client_role_row["id"] if client_role_row else 6

            import uuid

            client_user_id = str(uuid.uuid4())
            full_name = f"{body.first_name} {body.last_name}".strip()
            await conn.execute(
                """
                INSERT INTO users (id, email, username, name, first_name, last_name, role_id, company_id,
                                   assigned_project_id, phone, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW(), NOW())
                """,
                client_user_id,
                body.email,
                body.email,
                full_name,
                body.first_name,
                body.last_name,
                client_role_id,
                company_id,
                body.project_id,
                body.phone,
            )

        # Create invitation record
        import uuid as uuid_mod

        await conn.execute(
            """
            INSERT INTO client_portal.client_invitations
            (id, user_id, project_id, company_id, invited_by, welcome_note, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'pending')
            """,
            str(uuid_mod.uuid4()),
            client_user_id,
            body.project_id,
            company_id,
            str(user_data.get("id") or user_data.get("userId") or ""),
            body.welcome_note,
        )

        # Invalidate any previous magic link tokens for this user
        await magic_link_svc.invalidate_user_tokens(client_user_id, purpose="invite")

        # Generate new magic link
        raw_token = await magic_link_svc.create_magic_link(client_user_id, purpose="invite")
        magic_link_url = f"{settings.magic_link_base_url}/auth/magic-link?token={raw_token}"

        # Fetch company branding
        company_row = await conn.fetchrow(
            "SELECT name, COALESCE(logo_url, logo) as logo_url, brand_color, sender_name FROM companies WHERE id = $1",
            company_id,
        )

        company_name = company_row["name"] if company_row else "Your Contractor"
        company_logo_path = company_row["logo_url"] if company_row else None
        brand_color = (company_row["brand_color"] if company_row else None) or "#2563eb"
        sender_name = company_row["sender_name"] if company_row else None

    # Resolve logo object path to a signed URL for the email
    company_logo_url = await _resolve_logo_url(company_logo_path)

    logger.info(f"Magic link URL for {body.email}: {magic_link_url}")

    async with pool.acquire() as conn:
        # Fetch project name
        project_row = await conn.fetchrow(
            "SELECT name FROM projects WHERE id = $1", body.project_id
        )
        project_name = project_row["name"] if project_row else "Your Project"

        # Get caller's name for email
        caller_name = f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip()
        if not caller_name:
            caller_name = user_data.get("name", "Your Project Manager")

    # Send email (non-blocking — log failures but don't fail the invite)
    email_sent = await email_svc.send_client_invite_email(
        to_email=body.email,
        client_first_name=body.first_name,
        company_name=company_name,
        company_logo_url=company_logo_url,
        brand_color=brand_color,
        pm_name=caller_name,
        project_name=project_name,
        magic_link_url=magic_link_url,
        welcome_note=body.welcome_note,
        sender_name=sender_name,
    )

    # Send SMS if phone provided
    sms_sent = False
    if body.phone:
        sms_sent = await sms_svc.send_invite_sms(
            to_phone=body.phone,
            client_first_name=body.first_name,
            pm_name=caller_name,
            company_name=company_name,
            magic_link_url=magic_link_url,
        )

    # Update invitation with delivery timestamps
    async with pool.acquire() as conn:
        from datetime import datetime, timezone

        if email_sent:
            await conn.execute(
                """
                UPDATE client_portal.client_invitations
                SET email_sent_at = $1
                WHERE id = (
                    SELECT id FROM client_portal.client_invitations
                    WHERE user_id = $2 AND status = 'pending'
                    ORDER BY created_at DESC LIMIT 1
                )
                """,
                datetime.now(timezone.utc),
                client_user_id,
            )
        if sms_sent:
            await conn.execute(
                """
                UPDATE client_portal.client_invitations
                SET sms_sent_at = $1
                WHERE id = (
                    SELECT id FROM client_portal.client_invitations
                    WHERE user_id = $2 AND status = 'pending'
                    ORDER BY created_at DESC LIMIT 1
                )
                """,
                datetime.now(timezone.utc),
                client_user_id,
            )

    return {
        "success": True,
        "userId": client_user_id,
        "email": body.email,
        "emailSent": email_sent,
        "smsSent": sms_sent,
        "projectName": project_name,
    }


@router.post("/verify-magic-link")
async def verify_magic_link(body: VerifyMagicLinkRequest, request: Request, response: Response):
    """Verify a magic link token and create a session.

    Public endpoint — this IS the authentication mechanism for client users.
    Returns user data + isFirstLogin flag.
    """
    client_ip = request.client.host if request.client else None

    pool = await get_db_pool()
    magic_link_svc = MagicLinkService(pool)

    result = await magic_link_svc.verify_and_consume_token(body.token, ip_address=client_ip)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid, expired, or already used link. Please request a new one.",
        )

    user_id = result["user_id"]
    purpose = result["purpose"]

    async with pool.acquire() as conn:
        # Fetch full user data with role
        from .auth import get_role_column_name

        role_col = await get_role_column_name(conn)
        if role_col:
            user_row = await conn.fetchrow(
                f"SELECT u.*, r.{role_col} as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1",
                user_id,
            )
        else:
            user_row = await conn.fetchrow(
                "SELECT u.*, NULL as role_name FROM users u WHERE u.id = $1", user_id
            )

        if not user_row:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

        user_data = dict(user_row)

        if not user_data.get("is_active", True):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

        # Update last_login_at (non-critical — don't fail login if column missing)
        try:
            await conn.execute("UPDATE users SET last_login_at = NOW() WHERE id = $1", user_id)
        except Exception as e:
            logger.warning(f"Failed to update last_login_at for user {user_id}: {e}")

        # Check if first login (for showing tour)
        is_first_login = False
        if purpose == "invite":
            invitation = await conn.fetchrow(
                """
                SELECT id, first_login_at FROM client_portal.client_invitations
                WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1
                """,
                user_id,
            )
            if invitation and invitation["first_login_at"] is None:
                is_first_login = True
                await conn.execute(
                    "UPDATE client_portal.client_invitations SET first_login_at = NOW(), status = 'accepted' WHERE id = $1",
                    invitation["id"],
                )

    # Create session (reuse auth.py pattern)
    from .auth import (
        create_session,
        get_navigation_permissions,
        is_root_admin,
        filter_permissions_by_company_modules,
        SESSION_TTL,
        get_cookie_secure,
    )
    from ..middleware.security import generate_csrf_token, store_csrf_token

    session_id = await create_session(user_data["id"], user_data)

    csrf_token = generate_csrf_token()
    store_csrf_token(session_id, csrf_token)

    response.set_cookie(
        key="session_id",
        value=session_id,
        max_age=SESSION_TTL,
        httponly=True,
        secure=get_cookie_secure(),
        samesite="lax",
    )

    response.headers["X-CSRF-Token"] = csrf_token

    # Build user response
    user_data.pop("password", None)

    if "company_id" in user_data:
        user_data["companyId"] = user_data["company_id"]
    if "is_root" in user_data:
        user_data["isRoot"] = user_data["is_root"]
    if "assigned_project_id" in user_data:
        user_data["assignedProjectId"] = user_data["assigned_project_id"]

    role_name = user_data.get("role_name") or user_data.get("role", "client")
    user_data["role"] = role_name

    is_root = is_root_admin(user_data)
    permissions = get_navigation_permissions(role_name, is_root)
    company_id = user_data.get("company_id") or user_data.get("companyId")
    permissions = await filter_permissions_by_company_modules(permissions, company_id, is_root, pool)

    user_data["permissions"] = permissions
    user_data["isRootAdmin"] = is_root

    return {
        "user": user_data,
        "sessionId": session_id,
        "isFirstLogin": is_first_login,
    }


@router.post("/request-magic-link")
async def request_magic_link(body: RequestMagicLinkRequest, request: Request):
    """Request a new magic link for login.

    Public endpoint. Always returns 200 to prevent email enumeration.
    Rate limited: 3 per email per 15 min, 10 per IP per 15 min.
    Only sends magic links for client role users.
    """
    client_ip = request.client.host if request.client else "unknown"

    # Rate limit by email
    if not _check_rate_limit(f"email:{body.email}", RATE_LIMIT_PER_EMAIL):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests. Try again later.")

    # Rate limit by IP
    if not _check_rate_limit(f"ip:{client_ip}", RATE_LIMIT_PER_IP):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests. Try again later.")

    pool = await get_db_pool()

    async with pool.acquire() as conn:
        from .auth import get_role_column_name

        role_col = await get_role_column_name(conn)
        if role_col:
            user_row = await conn.fetchrow(
                f"""
                SELECT u.id, u.email, u.first_name, u.is_active, u.company_id,
                       r.{role_col} as role_name
                FROM users u LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.email = $1
                """,
                body.email,
            )
        else:
            user_row = await conn.fetchrow(
                "SELECT id, email, first_name, is_active, company_id, NULL as role_name FROM users WHERE email = $1",
                body.email,
            )

    # Anti-enumeration: always return same response
    success_msg = {"message": "If an account exists, a magic link has been sent to your email."}

    if not user_row:
        return success_msg

    # Only send magic links for client users
    role_name = (user_row.get("role_name") or "").lower()
    if role_name != "client":
        return success_msg

    if not user_row.get("is_active", True):
        return success_msg

    # Generate magic link
    magic_link_svc = MagicLinkService(pool)
    raw_token = await magic_link_svc.create_magic_link(str(user_row["id"]), purpose="login")
    magic_link_url = f"{settings.magic_link_base_url}/auth/magic-link?token={raw_token}"

    # Fetch company branding
    company_id = user_row.get("company_id")
    async with pool.acquire() as conn:
        company_row = None
        if company_id:
            try:
                company_row = await conn.fetchrow(
                    "SELECT name, COALESCE(logo_url, logo) as logo_url, brand_color, sender_name FROM companies WHERE id = $1",
                    company_id,
                )
            except Exception:
                pass

    company_name = company_row["name"] if company_row else "Your Contractor"
    company_logo_path = company_row["logo_url"] if company_row else None
    brand_color = (company_row["brand_color"] if company_row else None) or "#2563eb"
    sender_name = company_row["sender_name"] if company_row else None

    # Resolve logo object path to a signed URL for the email
    company_logo_url = await _resolve_logo_url(company_logo_path)

    logger.info(f"Magic link URL for {body.email}: {magic_link_url}")

    email_svc = EmailService()
    await email_svc.send_magic_link_email(
        to_email=body.email,
        client_first_name=user_row.get("first_name", ""),
        company_name=company_name,
        company_logo_url=company_logo_url,
        brand_color=brand_color,
        magic_link_url=magic_link_url,
        sender_name=sender_name,
    )

    return success_msg


@router.post("/complete-tour")
async def complete_tour(request: Request):
    """Mark the guided tour as completed for the current client user.

    Auth: Authenticated client user.
    """
    user_data = await _get_session_user(request)
    user_id = str(user_data.get("id") or user_data.get("userId") or "")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            """
            UPDATE client_portal.client_invitations
            SET has_completed_tour = true
            WHERE user_id = $1 AND has_completed_tour = false
            """,
            user_id,
        )

    return {"success": True}


@router.get("/invitation-status")
async def invitation_status(request: Request):
    """Get the onboarding status for the current client user.

    Auth: Authenticated client user.
    Returns has_completed_tour and first_login_at for deciding whether to show the tour.
    """
    user_data = await _get_session_user(request)
    user_id = str(user_data.get("id") or user_data.get("userId") or "")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        invitation = await conn.fetchrow(
            """
            SELECT has_completed_tour, first_login_at, status, created_at
            FROM client_portal.client_invitations
            WHERE user_id = $1
            ORDER BY created_at DESC LIMIT 1
            """,
            user_id,
        )

    if not invitation:
        return {
            "hasInvitation": False,
            "hasCompletedTour": True,  # No invitation = don't show tour
            "firstLoginAt": None,
        }

    return {
        "hasInvitation": True,
        "hasCompletedTour": invitation["has_completed_tour"],
        "firstLoginAt": invitation["first_login_at"].isoformat() if invitation["first_login_at"] else None,
        "status": invitation["status"],
    }


@router.put("/company-branding")
async def update_company_branding(body: CompanyBrandingRequest, request: Request):
    """Update company branding for white-labeled emails.

    Auth: Admin only.
    """
    user_data = await _get_session_user(request)
    caller_role = (user_data.get("role_name") or user_data.get("role", "")).lower()
    is_root = user_data.get("is_root") or user_data.get("isRoot")

    if not is_root and caller_role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    company_id = str(user_data.get("company_id") or user_data.get("companyId") or "")
    if not company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No company context")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Build dynamic update
        updates = []
        params = []
        idx = 1

        if body.logo_url is not None:
            updates.append(f"logo_url = ${idx}")
            params.append(body.logo_url)
            idx += 1
        if body.brand_color is not None:
            updates.append(f"brand_color = ${idx}")
            params.append(body.brand_color)
            idx += 1
        if body.sender_name is not None:
            updates.append(f"sender_name = ${idx}")
            params.append(body.sender_name)
            idx += 1

        if not updates:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

        params.append(company_id)
        query = f"UPDATE companies SET {', '.join(updates)} WHERE id = ${idx} RETURNING id, name, logo_url, brand_color, sender_name"

        row = await conn.fetchrow(query, *params)

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    return {
        "id": row["id"],
        "name": row["name"],
        "logoUrl": row["logo_url"],
        "brandColor": row["brand_color"],
        "senderName": row["sender_name"],
    }
