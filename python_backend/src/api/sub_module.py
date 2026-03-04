"""
Subcontractor Management Module API endpoints.
Handles sub companies, invitations, tasks, checklists, reviews, milestones, and performance.
"""

import logging
import json
import uuid
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, HTTPException, Request, Response, status, Depends, Query
from pydantic import BaseModel

from ..database.connection import get_db_pool
from ..core.config import settings
from ..services.magic_link_service import MagicLinkService
from .auth import get_current_user_dependency, is_root_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sub", tags=["subcontractor-module"])

# Rate limiting for magic link requests
_rate_limit_store: Dict[str, list] = defaultdict(list)
RATE_LIMIT_WINDOW = 900
RATE_LIMIT_PER_EMAIL = 3
RATE_LIMIT_PER_IP = 10


def _check_rate_limit(key: str, max_requests: int) -> bool:
    now = time.time()
    _rate_limit_store[key] = [t for t in _rate_limit_store[key] if now - t < RATE_LIMIT_WINDOW]
    if len(_rate_limit_store[key]) >= max_requests:
        return False
    _rate_limit_store[key].append(now)
    return True


def _get_company_id(user: dict) -> str:
    """Extract company_id from user dict."""
    cid = user.get("company_id") or user.get("companyId") or ""
    return str(cid)


def _get_user_id(user: dict) -> str:
    """Extract user id from user dict."""
    return str(user.get("id") or user.get("userId") or "")


def _get_role(user: dict) -> str:
    """Extract normalized role from user dict."""
    return (user.get("role_name") or user.get("role") or "").lower()


def _is_pm_or_admin(user: dict) -> bool:
    """Check if user has PM/admin privileges."""
    if is_root_admin(user):
        return True
    role = _get_role(user)
    return role in ("admin", "project_manager", "office_manager", "manager")


def _require_pm_or_admin(user: dict):
    """Raise 403 if user is not a PM or admin."""
    if not _is_pm_or_admin(user):
        raise HTTPException(status_code=403, detail="Insufficient permissions")


async def _get_user_subcontractor_id(user: dict, pool) -> Optional[str]:
    """Get the subcontractor company ID linked to a user."""
    user_id = _get_user_id(user)
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT subcontractor_id FROM users WHERE id = $1", user_id
        )
    return row["subcontractor_id"] if row and row["subcontractor_id"] else None


async def _verify_project_company(project_id: str, company_id: str, pool) -> dict:
    """Verify a project belongs to the user's company. Returns project row."""
    async with pool.acquire() as conn:
        project = await conn.fetchrow(
            "SELECT id, name, company_id FROM projects WHERE id = $1", project_id
        )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if str(project["company_id"]) != company_id:
        raise HTTPException(status_code=403, detail="Access denied to this project")
    return dict(project)


async def _verify_sub_task_access(task_id: str, user: dict, pool) -> dict:
    """Verify user has access to a sub task. Returns task row dict."""
    async with pool.acquire() as conn:
        task = await conn.fetchrow(
            """SELECT st.*, p.company_id, p.name as project_name
               FROM sub_tasks st
               JOIN projects p ON st.project_id = p.id
               WHERE st.id = $1""",
            task_id,
        )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    role = _get_role(user)
    if role in ("subcontractor", "contractor"):
        sub_id = await _get_user_subcontractor_id(user, pool)
        user_id = _get_user_id(user)
        if str(task.get("assigned_to") or "") != str(sub_id or "") and \
           str(task.get("assigned_user_id") or "") != user_id:
            raise HTTPException(status_code=403, detail="Access denied to this task")
    elif not is_root_admin(user):
        company_id = _get_company_id(user)
        if str(task["company_id"]) != company_id:
            raise HTTPException(status_code=403, detail="Access denied to this task")

    return dict(task)


def _parse_datetime(val):
    """Parse a datetime string or return None. Handles ISO format strings."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        try:
            # Handle ISO format with Z suffix
            val = val.replace("Z", "+00:00")
            return datetime.fromisoformat(val)
        except (ValueError, TypeError):
            return None
    return None


def _parse_numeric(val):
    """Parse a numeric value or return None."""
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _row_to_dict(row) -> dict:
    """Convert asyncpg Record to dict with camelCase keys."""
    if row is None:
        return {}
    d = dict(row)
    result = {}
    for key, val in d.items():
        # Convert snake_case to camelCase
        parts = key.split("_")
        camel = parts[0] + "".join(p.capitalize() for p in parts[1:])
        if isinstance(val, datetime):
            result[camel] = val.isoformat()
        elif isinstance(val, uuid.UUID):
            result[camel] = str(val)
        else:
            result[camel] = val
    return result


# ============================================================================
# SUBCONTRACTOR COMPANIES
# ============================================================================

@router.get("/companies")
async def list_sub_companies(
    current_user: dict = Depends(get_current_user_dependency),
):
    """List all subcontractor companies for the GC."""
    _require_pm_or_admin(current_user)
    company_id = _get_company_id(current_user)
    pool = await get_db_pool()

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT s.id, s.name as company_name, s.trade, s.contact_email, s.contact_phone,
                      s.address, s.license_number, s.license_expiry, s.insurance_provider,
                      s.insurance_policy_number, s.insurance_expiry,
                      s.overall_performance_score as performance_score,
                      s.status, s.notes, s.created_at, s.updated_at, s.company_id,
                      (SELECT COUNT(*) FROM subcontractor_assignments sa
                       WHERE sa.sub_company_id = s.id AND sa.status = 'active') as active_assignments
               FROM subcontractors s
               WHERE s.company_id = $1
               ORDER BY s.name""",
            company_id,
        )
    return [_row_to_dict(r) for r in rows]


@router.get("/companies/{sub_id}")
async def get_sub_company(
    sub_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Get a subcontractor company profile."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT id, name as company_name, trade, contact_email, contact_phone,
                      address, license_number, license_expiry, insurance_provider,
                      insurance_policy_number, insurance_expiry,
                      overall_performance_score as performance_score,
                      status, notes, created_at, updated_at, company_id
               FROM subcontractors WHERE id = $1""", sub_id)
    if not row:
        raise HTTPException(status_code=404, detail="Subcontractor not found")

    # Access check
    role = _get_role(current_user)
    if role in ("subcontractor", "contractor"):
        sub_id_user = await _get_user_subcontractor_id(current_user, pool)
        if str(sub_id_user) != sub_id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif not is_root_admin(current_user):
        if str(row["company_id"]) != _get_company_id(current_user):
            raise HTTPException(status_code=403, detail="Access denied")

    return _row_to_dict(row)


@router.post("/companies", status_code=201)
async def create_sub_company(
    request: Request,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Create a new subcontractor company."""
    _require_pm_or_admin(current_user)
    body = await request.json()
    company_id = _get_company_id(current_user)
    pool = await get_db_pool()

    new_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO subcontractors
               (id, company_id, name, trade, contact_email, contact_phone, address,
                license_number, license_expiry, insurance_provider,
                insurance_policy_number, insurance_expiry, notes)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
               RETURNING id, name as company_name, trade, contact_email, contact_phone,
                         address, license_number, license_expiry, insurance_provider,
                         insurance_policy_number, insurance_expiry,
                         overall_performance_score as performance_score,
                         status, notes, created_at, updated_at, company_id""",
            new_id, company_id,
            body.get("name"), body.get("trade"),
            body.get("contactEmail"), body.get("contactPhone"),
            body.get("address"), body.get("licenseNumber"),
            body.get("licenseExpiry"), body.get("insuranceProvider"),
            body.get("insurancePolicyNumber"), body.get("insuranceExpiry"),
            body.get("notes"),
        )
    return _row_to_dict(row)


@router.put("/companies/{sub_id}")
async def update_sub_company(
    sub_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Update a subcontractor company."""
    _require_pm_or_admin(current_user)
    body = await request.json()
    pool = await get_db_pool()

    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT * FROM subcontractors WHERE id = $1", sub_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Subcontractor not found")
        if not is_root_admin(current_user) and str(existing["company_id"]) != _get_company_id(current_user):
            raise HTTPException(status_code=403, detail="Access denied")

        # Build dynamic update
        fields = {
            "name": body.get("name"),
            "trade": body.get("trade"),
            "contact_email": body.get("contactEmail"),
            "contact_phone": body.get("contactPhone"),
            "address": body.get("address"),
            "license_number": body.get("licenseNumber"),
            "license_expiry": body.get("licenseExpiry"),
            "insurance_provider": body.get("insuranceProvider"),
            "insurance_policy_number": body.get("insurancePolicyNumber"),
            "insurance_expiry": body.get("insuranceExpiry"),
            "status": body.get("status"),
            "notes": body.get("notes"),
        }
        updates = []
        values = []
        idx = 1
        for key, val in fields.items():
            if val is not None:
                updates.append(f"{key} = ${idx}")
                values.append(val)
                idx += 1
        if not updates:
            return _row_to_dict(existing)

        updates.append(f"updated_at = ${idx}")
        values.append(datetime.now(timezone.utc))
        idx += 1
        values.append(sub_id)

        returning_cols = """id, name as company_name, trade, contact_email, contact_phone,
                         address, license_number, license_expiry, insurance_provider,
                         insurance_policy_number, insurance_expiry,
                         overall_performance_score as performance_score,
                         status, notes, created_at, updated_at, company_id"""
        query = f"UPDATE subcontractors SET {', '.join(updates)} WHERE id = ${idx} RETURNING {returning_cols}"
        row = await conn.fetchrow(query, *values)
    return _row_to_dict(row)


@router.delete("/companies/{sub_id}")
async def delete_sub_company(
    sub_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Soft-delete a subcontractor company (set status=inactive)."""
    _require_pm_or_admin(current_user)
    pool = await get_db_pool()

    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT * FROM subcontractors WHERE id = $1", sub_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Subcontractor not found")
        if not is_root_admin(current_user) and str(existing["company_id"]) != _get_company_id(current_user):
            raise HTTPException(status_code=403, detail="Access denied")

        await conn.execute(
            "UPDATE subcontractors SET status = 'inactive', updated_at = NOW() WHERE id = $1",
            sub_id,
        )
    return {"message": "Subcontractor deactivated"}


# ============================================================================
# SUBCONTRACTOR INVITATION
# ============================================================================

@router.post("/invite")
async def invite_subcontractor(request: Request, current_user: dict = Depends(get_current_user_dependency)):
    """Invite a subcontractor user. Creates user + sub company (if needed) + magic link email."""
    _require_pm_or_admin(current_user)
    body = await request.json()
    company_id = _get_company_id(current_user)
    pool = await get_db_pool()
    magic_link_svc = MagicLinkService(pool)

    first_name = body.get("firstName", "")
    last_name = body.get("lastName", "")
    email = body.get("email", "").strip().lower()
    phone = body.get("phone")
    sub_company_id = body.get("subcontractorId") or body.get("existingCompanyId")
    company_name_input = body.get("companyName")
    trade = body.get("trade")
    project_id = body.get("projectId")
    specialization = body.get("specialization")
    contract_value = body.get("contractValue")
    start_date = body.get("startDate")
    end_date = body.get("endDate")
    welcome_note = body.get("welcomeNote")

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if not project_id:
        raise HTTPException(status_code=400, detail="Project ID is required")
    if not first_name:
        raise HTTPException(status_code=400, detail="First name is required")

    # Verify project belongs to company
    if not is_root_admin(current_user):
        await _verify_project_company(project_id, company_id, pool)

    async with pool.acquire() as conn:
        # Get subcontractor role_id
        from .auth import get_role_column_name
        role_col = await get_role_column_name(conn)
        sub_role_row = await conn.fetchrow(
            f"SELECT id FROM roles WHERE LOWER({role_col}) = 'subcontractor'" if role_col
            else "SELECT id FROM roles WHERE id = 5"
        )
        sub_role_id = sub_role_row["id"] if sub_role_row else 5

        # CHECK EMAIL FIRST — before creating any records
        existing_user = await conn.fetchrow("SELECT id, role_id FROM users WHERE email = $1", email)
        if existing_user:
            existing_role = None
            if role_col:
                role_row = await conn.fetchrow(
                    f"SELECT {role_col} as rn FROM roles WHERE id = $1", existing_user["role_id"]
                )
                existing_role = role_row["rn"].lower() if role_row else None
            if existing_role and existing_role not in ("subcontractor", "contractor"):
                raise HTTPException(
                    status_code=409,
                    detail=f"User with this email already exists with role '{existing_role}'"
                )

        # Now safe to create sub company (email conflict already checked)
        if not sub_company_id and company_name_input:
            # Check for existing company with same name to prevent duplicates
            existing_sub = await conn.fetchrow(
                "SELECT id FROM subcontractors WHERE company_id = $1 AND LOWER(name) = LOWER($2)",
                company_id, company_name_input,
            )
            if existing_sub:
                sub_company_id = str(existing_sub["id"])
            else:
                sub_company_id = str(uuid.uuid4())
                await conn.execute(
                    """INSERT INTO subcontractors (id, company_id, name, trade, contact_email)
                       VALUES ($1, $2, $3, $4, $5)""",
                    sub_company_id, company_id, company_name_input, trade, email,
                )

        # Create or update user
        if existing_user:
            sub_user_id = str(existing_user["id"])
            if sub_company_id:
                await conn.execute(
                    "UPDATE users SET subcontractor_id = $1, phone = COALESCE($2, phone) WHERE id = $3",
                    sub_company_id, phone, sub_user_id,
                )
        else:
            sub_user_id = str(uuid.uuid4())
            await conn.execute(
                """INSERT INTO users (id, email, username, first_name, last_name, role_id,
                                     company_id, subcontractor_id, phone, is_active, created_at, updated_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,NOW(),NOW())""",
                sub_user_id, email, email, first_name, last_name, sub_role_id,
                company_id, sub_company_id, phone,
            )

        # Create assignment if not already assigned
        existing_assignment = await conn.fetchrow(
            "SELECT id FROM subcontractor_assignments WHERE subcontractor_id = $1 AND project_id = $2",
            sub_user_id, project_id,
        )
        if not existing_assignment:
            assignment_id = str(uuid.uuid4())
            await conn.execute(
                """INSERT INTO subcontractor_assignments
                   (id, subcontractor_id, project_id, assigned_by, specialization,
                    contract_value, sub_company_id, start_date, end_date, status)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active')""",
                assignment_id, sub_user_id, project_id,
                _get_user_id(current_user), specialization,
                _parse_numeric(contract_value), sub_company_id,
                _parse_datetime(start_date), _parse_datetime(end_date),
            )

        # Create invitation record
        await conn.execute(
            """INSERT INTO client_portal.sub_invitations
               (user_id, subcontractor_id, project_id, company_id, invited_by, welcome_note, status)
               VALUES ($1,$2,$3,$4,$5,$6,'pending')""",
            sub_user_id, sub_company_id or "", project_id, company_id,
            _get_user_id(current_user), welcome_note,
        )

        # Generate magic link
        await magic_link_svc.invalidate_user_tokens(sub_user_id, purpose="invite")
        raw_token = await magic_link_svc.create_magic_link(sub_user_id, purpose="invite")
        magic_link_url = f"{settings.magic_link_base_url}/auth/magic-link?token={raw_token}"

        # Fetch company branding for email
        company_row = await conn.fetchrow(
            "SELECT name, COALESCE(logo_url, logo) as logo_url, brand_color FROM companies WHERE id = $1",
            company_id,
        )
        gc_company_name = company_row["name"] if company_row else "Your General Contractor"
        brand_color = (company_row["brand_color"] if company_row else None) or "#2563eb"

        project_row = await conn.fetchrow("SELECT name FROM projects WHERE id = $1", project_id)
        project_name = project_row["name"] if project_row else "Your Project"

        caller_name = f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip()
        if not caller_name:
            caller_name = current_user.get("name", "Project Manager")

    # Send invitation email
    try:
        from ..services.email_service import EmailService
        email_svc = EmailService()
        await email_svc.send_sub_invite_email(
            to_email=email,
            sub_first_name=first_name,
            company_name=gc_company_name,
            brand_color=brand_color,
            pm_name=caller_name,
            project_name=project_name,
            magic_link_url=magic_link_url,
            welcome_note=welcome_note,
        )
    except Exception as e:
        logger.warning(f"Failed to send sub invite email: {e}")

    return {
        "message": "Subcontractor invited successfully",
        "userId": sub_user_id,
        "subcontractorId": sub_company_id,
        "magicLinkUrl": magic_link_url if not settings.is_production else None,
    }


@router.post("/verify-magic-link")
async def verify_sub_magic_link(request: Request, response: Response):
    """Verify a magic link token for subcontractor login."""
    body = await request.json()
    token = body.get("token", "")
    if not token:
        raise HTTPException(status_code=400, detail="Token is required")

    pool = await get_db_pool()
    magic_link_svc = MagicLinkService(pool)
    ip = request.client.host if request.client else None

    result = await magic_link_svc.verify_and_consume_token(token, ip)
    if not result:
        raise HTTPException(status_code=401, detail="Invalid or expired magic link")

    user_id = result["user_id"]
    purpose = result["purpose"]

    # Fetch user data
    from .auth import get_role_column_name
    async with pool.acquire() as conn:
        role_col = await get_role_column_name(conn)
        user_row = await conn.fetchrow(
            f"""SELECT u.*, r.{role_col} as role_name_val
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.id = $1""",
            user_id,
        )
        if not user_row:
            raise HTTPException(status_code=404, detail="User not found")

        role_name = user_row.get("role_name_val") or "subcontractor"
        is_first_login = purpose == "invite"

        if is_first_login:
            # Mark invitation as accepted
            await conn.execute(
                """UPDATE client_portal.sub_invitations
                   SET first_login_at = NOW(), status = 'accepted'
                   WHERE user_id = $1 AND status = 'pending'""",
                user_id,
            )
            await conn.execute(
                "UPDATE users SET last_login_at = NOW() WHERE id = $1", user_id,
            )

    # Create session
    from .auth import create_session, get_navigation_permissions
    from ..middleware.security import generate_csrf_token, store_csrf_token

    permissions = get_navigation_permissions(role_name, False)
    user_data = {
        "id": str(user_row["id"]),
        "userId": str(user_row["id"]),
        "email": user_row["email"],
        "first_name": user_row.get("first_name", ""),
        "last_name": user_row.get("last_name", ""),
        "role": role_name,
        "role_name": role_name,
        "companyId": str(user_row.get("company_id", "")),
        "company_id": str(user_row.get("company_id", "")),
        "isRoot": False,
        "is_root": False,
        "isActive": True,
        "is_active": True,
        "subcontractorId": str(user_row.get("subcontractor_id", "") or ""),
        "permissions": permissions,
    }

    session_id = await create_session(user_id, user_data)
    csrf_token = generate_csrf_token()
    store_csrf_token(session_id, csrf_token)

    # Set cookie
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=604800,
    )
    response.headers["X-CSRF-Token"] = csrf_token

    return {
        **user_data,
        "isFirstLogin": is_first_login,
    }


@router.post("/request-magic-link")
async def request_sub_magic_link(request: Request):
    """Request a new magic link for subcontractor login."""
    body = await request.json()
    email = (body.get("email") or "").strip().lower()
    success_msg = {"message": "If an account exists, a login link has been sent."}

    if not email:
        return success_msg

    # Rate limiting
    ip = request.client.host if request.client else "unknown"
    if not _check_rate_limit(f"email:{email}", RATE_LIMIT_PER_EMAIL):
        return success_msg
    if not _check_rate_limit(f"ip:{ip}", RATE_LIMIT_PER_IP):
        return success_msg

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        user_row = await conn.fetchrow("SELECT id, role_id FROM users WHERE email = $1", email)
        if not user_row:
            return success_msg

        # Verify it's a subcontractor
        from .auth import get_role_column_name
        role_col = await get_role_column_name(conn)
        if role_col:
            role_row = await conn.fetchrow(
                f"SELECT {role_col} as rn FROM roles WHERE id = $1", user_row["role_id"]
            )
            role_name = role_row["rn"].lower() if role_row else ""
        else:
            role_name = ""

        if role_name not in ("subcontractor", "contractor"):
            return success_msg

    magic_link_svc = MagicLinkService(pool)
    raw_token = await magic_link_svc.create_magic_link(str(user_row["id"]), purpose="login")
    magic_link_url = f"{settings.magic_link_base_url}/auth/magic-link?token={raw_token}"

    try:
        from ..services.email_service import EmailService
        email_svc = EmailService()
        await email_svc.send_sub_login_email(
            to_email=email,
            magic_link_url=magic_link_url,
        )
    except Exception as e:
        logger.warning(f"Failed to send sub login email: {e}")

    return success_msg


# ============================================================================
# SUB TASKS
# ============================================================================

@router.get("/tasks")
async def list_sub_tasks(
    project_id: Optional[str] = Query(None, alias="projectId"),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user_dependency),
):
    """List sub tasks for a project (PM view)."""
    _require_pm_or_admin(current_user)
    pool = await get_db_pool()
    company_id = _get_company_id(current_user)

    conditions = ["p.company_id = $1"]
    params: list = [company_id]
    idx = 2

    if project_id:
        conditions.append(f"st.project_id = ${idx}")
        params.append(project_id)
        idx += 1
    if status_filter:
        conditions.append(f"st.status = ${idx}")
        params.append(status_filter)
        idx += 1

    where_clause = " AND ".join(conditions)

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""SELECT st.*, p.name as project_name,
                       s.name as subcontractor_name,
                       (SELECT COUNT(*) FROM sub_checklist_items ci
                        JOIN sub_checklists cl ON ci.checklist_id = cl.id
                        WHERE cl.task_id = st.id) as checklist_items_total,
                       (SELECT COUNT(*) FROM sub_checklist_items ci
                        JOIN sub_checklists cl ON ci.checklist_id = cl.id
                        WHERE cl.task_id = st.id AND ci.is_completed = true) as checklist_items_completed
                FROM sub_tasks st
                JOIN projects p ON st.project_id = p.id
                LEFT JOIN subcontractors s ON st.assigned_to = s.id
                WHERE {where_clause}
                ORDER BY st.created_at DESC""",
            *params,
        )
    return [_row_to_dict(r) for r in rows]


@router.get("/my-tasks")
async def get_my_tasks(
    project_id: Optional[str] = Query(None, alias="projectId"),
    current_user: dict = Depends(get_current_user_dependency),
):
    """Get tasks assigned to the current subcontractor."""
    role = _get_role(current_user)
    if role not in ("subcontractor", "contractor"):
        raise HTTPException(status_code=403, detail="Only subcontractors can access this endpoint")

    pool = await get_db_pool()
    sub_id = await _get_user_subcontractor_id(current_user, pool)
    user_id = _get_user_id(current_user)

    conditions = ["(st.assigned_to = $1 OR st.assigned_user_id = $2)"]
    params: list = [sub_id or "", user_id]
    idx = 3

    if project_id:
        conditions.append(f"st.project_id = ${idx}")
        params.append(project_id)
        idx += 1

    where_clause = " AND ".join(conditions)

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""SELECT st.*, p.name as project_name,
                       (SELECT COUNT(*) FROM sub_checklist_items ci
                        JOIN sub_checklists cl ON ci.checklist_id = cl.id
                        WHERE cl.task_id = st.id) as checklist_items_total,
                       (SELECT COUNT(*) FROM sub_checklist_items ci
                        JOIN sub_checklists cl ON ci.checklist_id = cl.id
                        WHERE cl.task_id = st.id AND ci.is_completed = true) as checklist_items_completed
                FROM sub_tasks st
                JOIN projects p ON st.project_id = p.id
                WHERE {where_clause}
                ORDER BY
                    CASE st.status
                        WHEN 'in_progress' THEN 1
                        WHEN 'not_started' THEN 2
                        WHEN 'revision_requested' THEN 3
                        WHEN 'pending_review' THEN 4
                        WHEN 'approved' THEN 5
                        WHEN 'rejected' THEN 6
                        ELSE 7
                    END,
                    st.end_date ASC NULLS LAST""",
            *params,
        )
    return [_row_to_dict(r) for r in rows]


@router.get("/tasks/{task_id}")
async def get_sub_task(
    task_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Get a sub task with its checklists and items."""
    pool = await get_db_pool()
    task = await _verify_sub_task_access(task_id, current_user, pool)

    async with pool.acquire() as conn:
        # Get checklists
        checklists = await conn.fetch(
            """SELECT * FROM sub_checklists WHERE task_id = $1 ORDER BY sort_order""",
            task_id,
        )

        result_checklists = []
        for cl in checklists:
            cl_dict = _row_to_dict(cl)
            # Get items for this checklist
            items = await conn.fetch(
                """SELECT * FROM sub_checklist_items WHERE checklist_id = $1 ORDER BY sort_order""",
                cl["id"],
            )
            item_list = []
            for item in items:
                item_dict = _row_to_dict(item)
                # Get documents for this item
                docs = await conn.fetch(
                    """SELECT * FROM sub_task_documents WHERE checklist_item_id = $1 ORDER BY created_at""",
                    item["id"],
                )
                item_dict["documents"] = [_row_to_dict(d) for d in docs]
                item_list.append(item_dict)
            cl_dict["items"] = item_list
            result_checklists.append(cl_dict)

        # Get reviews
        reviews = await conn.fetch(
            """SELECT r.*, u.first_name || ' ' || u.last_name as reviewer_name
               FROM sub_task_reviews r
               LEFT JOIN users u ON r.reviewer_id = u.id
               WHERE r.task_id = $1
               ORDER BY r.created_at DESC""",
            task_id,
        )

        # Get sub company name
        sub_name = None
        if task.get("assigned_to"):
            sub_row = await conn.fetchrow(
                "SELECT name FROM subcontractors WHERE id = $1", task["assigned_to"]
            )
            sub_name = sub_row["name"] if sub_row else None

    task_result = _row_to_dict(dict(task))
    task_result["checklists"] = result_checklists
    task_result["reviews"] = [_row_to_dict(r) for r in reviews]
    task_result["subcontractorName"] = sub_name

    return task_result


@router.post("/tasks", status_code=201)
async def create_sub_task(
    request: Request,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Create a new sub task."""
    _require_pm_or_admin(current_user)
    body = await request.json()
    pool = await get_db_pool()
    company_id = _get_company_id(current_user)

    project_id = body.get("projectId")
    if not project_id:
        raise HTTPException(status_code=400, detail="projectId is required")
    if not body.get("name"):
        raise HTTPException(status_code=400, detail="name is required")

    if not is_root_admin(current_user):
        await _verify_project_company(project_id, company_id, pool)

    task_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO sub_tasks
               (id, project_id, assignment_id, assigned_to, assigned_user_id,
                name, description, instructions, priority, location_tag,
                start_date, end_date, estimated_hours, created_by)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
               RETURNING *""",
            task_id, project_id,
            body.get("assignmentId"), body.get("assignedTo"),
            body.get("assignedUserId"),
            body.get("name"), body.get("description"),
            body.get("instructions"), body.get("priority", "medium"),
            body.get("locationTag"),
            _parse_datetime(body.get("startDate")),
            _parse_datetime(body.get("endDate")),
            _parse_numeric(body.get("estimatedHours")),
            _get_user_id(current_user),
        )

    # Link task to payment milestone if provided
    milestone_id = body.get("milestoneId")
    if milestone_id:
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    """UPDATE sub_payment_milestones
                       SET linked_task_ids = COALESCE(linked_task_ids, '[]'::jsonb) || to_jsonb($1::text),
                           updated_at = NOW()
                       WHERE id = $2""",
                    task_id, milestone_id,
                )
        except Exception as e:
            logger.warning(f"Failed to link task to milestone: {e}")

    # Send notification email to assigned sub
    if body.get("assignedUserId") or body.get("assignedTo"):
        try:
            await _send_task_assignment_email(task_id, pool)
        except Exception as e:
            logger.warning(f"Failed to send task assignment email: {e}")

    return _row_to_dict(row)


@router.put("/tasks/{task_id}")
async def update_sub_task(
    task_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Update a sub task (PM only)."""
    _require_pm_or_admin(current_user)
    body = await request.json()
    pool = await get_db_pool()

    task = await _verify_sub_task_access(task_id, current_user, pool)

    field_map = {
        "name": "name", "description": "description", "instructions": "instructions",
        "priority": "priority", "locationTag": "location_tag",
        "startDate": "start_date", "endDate": "end_date",
        "estimatedHours": "estimated_hours", "actualHours": "actual_hours",
        "assignedTo": "assigned_to", "assignedUserId": "assigned_user_id",
        "status": "status",
    }

    datetime_fields = {"startDate", "endDate"}
    numeric_fields = {"estimatedHours", "actualHours"}

    updates = []
    values = []
    idx = 1
    for camel, snake in field_map.items():
        if camel in body:
            val = body[camel]
            if camel in datetime_fields:
                val = _parse_datetime(val)
            elif camel in numeric_fields:
                val = _parse_numeric(val)
            updates.append(f"{snake} = ${idx}")
            values.append(val)
            idx += 1

    if not updates:
        return _row_to_dict(task)

    updates.append(f"updated_at = ${idx}")
    values.append(datetime.now(timezone.utc))
    idx += 1
    values.append(task_id)

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"UPDATE sub_tasks SET {', '.join(updates)} WHERE id = ${idx} RETURNING *",
            *values,
        )
    return _row_to_dict(row)


@router.delete("/tasks/{task_id}")
async def delete_sub_task(
    task_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Delete a sub task (PM only)."""
    _require_pm_or_admin(current_user)
    pool = await get_db_pool()
    await _verify_sub_task_access(task_id, current_user, pool)

    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM sub_tasks WHERE id = $1", task_id)
    return {"message": "Task deleted"}


@router.put("/tasks/{task_id}/status")
async def update_task_status(
    task_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Update task status (sub can submit for review, PM can change status)."""
    body = await request.json()
    new_status = body.get("status")
    pool = await get_db_pool()

    task = await _verify_sub_task_access(task_id, current_user, pool)

    role = _get_role(current_user)
    allowed_sub_transitions = {
        "not_started": ["in_progress"],
        "in_progress": ["pending_review"],
        "revision_requested": ["in_progress", "pending_review"],
    }

    if role in ("subcontractor", "contractor"):
        current_status = task["status"]
        allowed = allowed_sub_transitions.get(current_status, [])
        if new_status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot transition from '{current_status}' to '{new_status}'"
            )

        # If submitting for review, verify all required-doc items have documents
        if new_status == "pending_review":
            async with pool.acquire() as conn:
                missing_docs = await conn.fetchval(
                    """SELECT COUNT(*) FROM sub_checklist_items ci
                       JOIN sub_checklists cl ON ci.checklist_id = cl.id
                       WHERE cl.task_id = $1
                         AND ci.item_type = 'doc_required'
                         AND ci.is_completed = false""",
                    task_id,
                )
                if missing_docs > 0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"{missing_docs} documentation-required item(s) are not completed"
                    )

    completed_at = datetime.now(timezone.utc) if new_status == "pending_review" else None

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """UPDATE sub_tasks SET status = $1, completed_at = COALESCE($2, completed_at),
               updated_at = NOW() WHERE id = $3 RETURNING *""",
            new_status, completed_at, task_id,
        )

    # Notify PMs/admins when a task is submitted for review
    if new_status == "pending_review":
        try:
            from ..services.notification_service import NotificationService
            notification_svc = NotificationService(pool)
            task_name = row["name"] if row else "Task"
            project_id = row["project_id"] if row else ""
            company_id = _get_company_id(current_user)

            async with pool.acquire() as conn:
                # Find all PM and admin users in the same company
                from .auth import get_role_column_name
                role_col = await get_role_column_name(conn)
                managers = await conn.fetch(
                    f"""SELECT u.id FROM users u
                       JOIN roles r ON u.role_id = r.id
                       WHERE u.company_id = $1 AND u.is_active = true
                       AND (r.{role_col} ILIKE '%%admin%%' OR r.{role_col} ILIKE '%%project_manager%%')""",
                    company_id,
                )

            for manager in managers:
                try:
                    await notification_svc.create_notification(
                        project_id=project_id,
                        recipient_user_id=str(manager["id"]),
                        notification_type="task_submitted",
                        source_kind="task",
                        source_id=task_id,
                        title=f"Task submitted for review: {task_name}",
                        body=f"A subcontractor has submitted \"{task_name}\" for your review.",
                    )
                except Exception:
                    pass  # Don't fail the request if notification fails
        except Exception as e:
            logger.warning(f"Failed to send review notification: {e}")

    return _row_to_dict(row)


# ============================================================================
# CHECKLISTS & ITEMS
# ============================================================================

@router.get("/tasks/{task_id}/checklists")
async def get_task_checklists(
    task_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Get checklists for a task."""
    pool = await get_db_pool()
    await _verify_sub_task_access(task_id, current_user, pool)

    async with pool.acquire() as conn:
        checklists = await conn.fetch(
            "SELECT * FROM sub_checklists WHERE task_id = $1 ORDER BY sort_order", task_id
        )
        result = []
        for cl in checklists:
            cl_dict = _row_to_dict(cl)
            items = await conn.fetch(
                "SELECT * FROM sub_checklist_items WHERE checklist_id = $1 ORDER BY sort_order",
                cl["id"],
            )
            item_list = []
            for item in items:
                item_dict = _row_to_dict(item)
                docs = await conn.fetch(
                    "SELECT * FROM sub_task_documents WHERE checklist_item_id = $1",
                    item["id"],
                )
                item_dict["documents"] = [_row_to_dict(d) for d in docs]
                item_list.append(item_dict)
            cl_dict["items"] = item_list
            result.append(cl_dict)
    return result


@router.post("/tasks/{task_id}/checklists", status_code=201)
async def create_checklist(
    task_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Create a checklist on a task (PM only)."""
    _require_pm_or_admin(current_user)
    body = await request.json()
    pool = await get_db_pool()
    await _verify_sub_task_access(task_id, current_user, pool)

    checklist_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO sub_checklists (id, task_id, name, template_id, sort_order)
               VALUES ($1, $2, $3, $4, $5)""",
            checklist_id, task_id,
            body.get("name", "Checklist"),
            body.get("templateId"),
            body.get("sortOrder", 0),
        )

        # Create items if provided
        items = body.get("items", [])
        for i, item in enumerate(items):
            await conn.execute(
                """INSERT INTO sub_checklist_items (id, checklist_id, description, item_type, sort_order)
                   VALUES ($1, $2, $3, $4, $5)""",
                str(uuid.uuid4()), checklist_id,
                item.get("description", ""),
                item.get("itemType", "standard"),
                item.get("sortOrder", i),
            )

        # Return full checklist with items
        cl_row = await conn.fetchrow("SELECT * FROM sub_checklists WHERE id = $1", checklist_id)
        cl_dict = _row_to_dict(cl_row)
        items_rows = await conn.fetch(
            "SELECT * FROM sub_checklist_items WHERE checklist_id = $1 ORDER BY sort_order",
            checklist_id,
        )
        cl_dict["items"] = [_row_to_dict(r) for r in items_rows]
    return cl_dict


@router.delete("/checklists/{checklist_id}")
async def delete_checklist(
    checklist_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Delete a checklist and all its items (PM only)."""
    _require_pm_or_admin(current_user)
    pool = await get_db_pool()

    async with pool.acquire() as conn:
        cl = await conn.fetchrow("SELECT * FROM sub_checklists WHERE id = $1", checklist_id)
        if not cl:
            raise HTTPException(status_code=404, detail="Checklist not found")

    await _verify_sub_task_access(cl["task_id"], current_user, pool)

    async with pool.acquire() as conn:
        # Delete documents attached to items in this checklist
        await conn.execute(
            """DELETE FROM sub_task_documents WHERE checklist_item_id IN
               (SELECT id FROM sub_checklist_items WHERE checklist_id = $1)""",
            checklist_id,
        )
        # Delete items then checklist
        await conn.execute("DELETE FROM sub_checklist_items WHERE checklist_id = $1", checklist_id)
        await conn.execute("DELETE FROM sub_checklists WHERE id = $1", checklist_id)
    return {"message": "Checklist deleted"}


@router.post("/checklists/{checklist_id}/items", status_code=201)
async def add_checklist_item(
    checklist_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Add an item to an existing checklist (PM only)."""
    _require_pm_or_admin(current_user)
    body = await request.json()
    pool = await get_db_pool()

    async with pool.acquire() as conn:
        cl = await conn.fetchrow("SELECT * FROM sub_checklists WHERE id = $1", checklist_id)
        if not cl:
            raise HTTPException(status_code=404, detail="Checklist not found")

    await _verify_sub_task_access(cl["task_id"], current_user, pool)

    item_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        max_order = await conn.fetchval(
            "SELECT COALESCE(MAX(sort_order), -1) FROM sub_checklist_items WHERE checklist_id = $1",
            checklist_id,
        )
        row = await conn.fetchrow(
            """INSERT INTO sub_checklist_items (id, checklist_id, description, item_type, sort_order)
               VALUES ($1, $2, $3, $4, $5) RETURNING *""",
            item_id, checklist_id,
            body.get("description", ""),
            body.get("itemType", "standard"),
            (max_order or 0) + 1,
        )
    return _row_to_dict(row)


@router.delete("/checklist-items/{item_id}")
async def delete_checklist_item(
    item_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Delete a checklist item (PM only)."""
    _require_pm_or_admin(current_user)
    pool = await get_db_pool()

    async with pool.acquire() as conn:
        item = await conn.fetchrow(
            """SELECT ci.*, cl.task_id
               FROM sub_checklist_items ci
               JOIN sub_checklists cl ON ci.checklist_id = cl.id
               WHERE ci.id = $1""",
            item_id,
        )
        if not item:
            raise HTTPException(status_code=404, detail="Checklist item not found")

    await _verify_sub_task_access(item["task_id"], current_user, pool)

    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM sub_task_documents WHERE checklist_item_id = $1", item_id)
        await conn.execute("DELETE FROM sub_checklist_items WHERE id = $1", item_id)
    return {"message": "Checklist item deleted"}


@router.put("/checklist-items/{item_id}/complete")
async def complete_checklist_item(
    item_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Mark a checklist item as complete (sub or PM)."""
    body = await request.json()
    pool = await get_db_pool()

    # Verify access through the task chain
    async with pool.acquire() as conn:
        item = await conn.fetchrow(
            """SELECT ci.*, cl.task_id
               FROM sub_checklist_items ci
               JOIN sub_checklists cl ON ci.checklist_id = cl.id
               WHERE ci.id = $1""",
            item_id,
        )
        if not item:
            raise HTTPException(status_code=404, detail="Checklist item not found")

    await _verify_sub_task_access(item["task_id"], current_user, pool)

    # Check if doc_required item has documents
    if item["item_type"] == "doc_required":
        async with pool.acquire() as conn:
            doc_count = await conn.fetchval(
                "SELECT COUNT(*) FROM sub_task_documents WHERE checklist_item_id = $1",
                item_id,
            )
            if doc_count == 0:
                raise HTTPException(
                    status_code=400,
                    detail="This item requires documentation before it can be completed"
                )

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """UPDATE sub_checklist_items
               SET is_completed = true, completed_by = $1, completed_at = NOW(),
                   notes = COALESCE($2, notes), updated_at = NOW()
               WHERE id = $3 RETURNING *""",
            _get_user_id(current_user),
            body.get("notes"),
            item_id,
        )
    return _row_to_dict(row)


@router.put("/checklist-items/{item_id}/uncomplete")
async def uncomplete_checklist_item(
    item_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Unmark a checklist item."""
    pool = await get_db_pool()

    async with pool.acquire() as conn:
        item = await conn.fetchrow(
            """SELECT ci.*, cl.task_id
               FROM sub_checklist_items ci
               JOIN sub_checklists cl ON ci.checklist_id = cl.id
               WHERE ci.id = $1""",
            item_id,
        )
        if not item:
            raise HTTPException(status_code=404, detail="Checklist item not found")

    await _verify_sub_task_access(item["task_id"], current_user, pool)

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """UPDATE sub_checklist_items
               SET is_completed = false, completed_by = NULL, completed_at = NULL, updated_at = NOW()
               WHERE id = $1 RETURNING *""",
            item_id,
        )
    return _row_to_dict(row)


# ============================================================================
# DOCUMENTS
# ============================================================================

@router.post("/checklist-items/{item_id}/documents", status_code=201)
async def upload_document(
    item_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Upload a document to a checklist item."""
    body = await request.json()
    pool = await get_db_pool()

    async with pool.acquire() as conn:
        item = await conn.fetchrow(
            """SELECT ci.*, cl.task_id
               FROM sub_checklist_items ci
               JOIN sub_checklists cl ON ci.checklist_id = cl.id
               WHERE ci.id = $1""",
            item_id,
        )
        if not item:
            raise HTTPException(status_code=404, detail="Checklist item not found")

    await _verify_sub_task_access(item["task_id"], current_user, pool)

    doc_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO sub_task_documents
               (id, checklist_item_id, task_id, file_path, file_name, mime_type, file_size, uploaded_by)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *""",
            doc_id, item_id, item["task_id"],
            body.get("filePath", ""),
            body.get("fileName", ""),
            body.get("mimeType"),
            body.get("fileSize"),
            _get_user_id(current_user),
        )
    return _row_to_dict(row)


@router.get("/checklist-items/{item_id}/documents")
async def list_item_documents(
    item_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """List documents for a checklist item."""
    pool = await get_db_pool()

    async with pool.acquire() as conn:
        item = await conn.fetchrow(
            """SELECT ci.*, cl.task_id
               FROM sub_checklist_items ci
               JOIN sub_checklists cl ON ci.checklist_id = cl.id
               WHERE ci.id = $1""",
            item_id,
        )
        if not item:
            raise HTTPException(status_code=404, detail="Checklist item not found")

    await _verify_sub_task_access(item["task_id"], current_user, pool)

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM sub_task_documents WHERE checklist_item_id = $1 ORDER BY created_at",
            item_id,
        )
    return [_row_to_dict(r) for r in rows]


@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Delete a document (PM only)."""
    _require_pm_or_admin(current_user)
    pool = await get_db_pool()

    async with pool.acquire() as conn:
        doc = await conn.fetchrow("SELECT * FROM sub_task_documents WHERE id = $1", doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        await _verify_sub_task_access(doc["task_id"], current_user, pool)
        await conn.execute("DELETE FROM sub_task_documents WHERE id = $1", doc_id)
    return {"message": "Document deleted"}


# ============================================================================
# REVIEWS (PM APPROVAL WORKFLOW)
# ============================================================================

@router.get("/reviews/queue")
async def get_review_queue(
    project_id: Optional[str] = Query(None, alias="projectId"),
    current_user: dict = Depends(get_current_user_dependency),
):
    """Get all tasks pending review (PM/Admin)."""
    _require_pm_or_admin(current_user)
    pool = await get_db_pool()
    company_id = _get_company_id(current_user)

    conditions = ["p.company_id = $1", "st.status = 'pending_review'"]
    params: list = [company_id]
    idx = 2

    if project_id:
        conditions.append(f"st.project_id = ${idx}")
        params.append(project_id)
        idx += 1

    where_clause = " AND ".join(conditions)

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""SELECT st.*, p.name as project_name, s.name as subcontractor_name,
                       (SELECT COUNT(*) FROM sub_checklist_items ci
                        JOIN sub_checklists cl ON ci.checklist_id = cl.id
                        WHERE cl.task_id = st.id) as checklist_items_total,
                       (SELECT COUNT(*) FROM sub_checklist_items ci
                        JOIN sub_checklists cl ON ci.checklist_id = cl.id
                        WHERE cl.task_id = st.id AND ci.is_completed = true) as checklist_items_completed
                FROM sub_tasks st
                JOIN projects p ON st.project_id = p.id
                LEFT JOIN subcontractors s ON st.assigned_to = s.id
                WHERE {where_clause}
                ORDER BY st.completed_at ASC NULLS LAST""",
            *params,
        )

        result = []
        for row in rows:
            task_dict = _row_to_dict(row)
            # Nest checklists with items and documents
            checklists = await conn.fetch(
                "SELECT * FROM sub_checklists WHERE task_id = $1 ORDER BY sort_order",
                row["id"],
            )
            cl_list = []
            for cl in checklists:
                cl_dict = _row_to_dict(cl)
                items = await conn.fetch(
                    "SELECT * FROM sub_checklist_items WHERE checklist_id = $1 ORDER BY sort_order",
                    cl["id"],
                )
                item_list = []
                for item in items:
                    item_dict = _row_to_dict(item)
                    docs = await conn.fetch(
                        "SELECT * FROM sub_task_documents WHERE checklist_item_id = $1 ORDER BY created_at",
                        item["id"],
                    )
                    item_dict["documents"] = [_row_to_dict(d) for d in docs]
                    item_list.append(item_dict)
                cl_dict["items"] = item_list
                cl_list.append(cl_dict)
            task_dict["checklists"] = cl_list
            result.append(task_dict)

    return result


@router.get("/reviews/history")
async def get_review_history(
    project_id: Optional[str] = Query(None, alias="projectId"),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user_dependency),
):
    """Get recently reviewed tasks (approved/rejected) with review details."""
    _require_pm_or_admin(current_user)
    pool = await get_db_pool()
    company_id = _get_company_id(current_user)

    conditions = ["p.company_id = $1", "st.status IN ('approved', 'rejected')"]
    params: list = [company_id]
    idx = 2

    if project_id:
        conditions.append(f"st.project_id = ${idx}")
        params.append(project_id)
        idx += 1

    params.append(limit)
    limit_param = f"${idx}"

    where_clause = " AND ".join(conditions)

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""SELECT st.*, p.name as project_name, s.name as subcontractor_name,
                       r.decision as review_decision,
                       r.feedback as review_feedback,
                       r.rejection_reason as review_rejection_reason,
                       r.created_at as reviewed_at,
                       COALESCE(u.first_name || ' ' || u.last_name, u.username, 'PM') as reviewer_name,
                       (SELECT COUNT(*) FROM sub_checklist_items ci
                        JOIN sub_checklists cl ON ci.checklist_id = cl.id
                        WHERE cl.task_id = st.id) as checklist_items_total,
                       (SELECT COUNT(*) FROM sub_checklist_items ci
                        JOIN sub_checklists cl ON ci.checklist_id = cl.id
                        WHERE cl.task_id = st.id AND ci.is_completed = true) as checklist_items_completed
                FROM sub_tasks st
                JOIN projects p ON st.project_id = p.id
                LEFT JOIN subcontractors s ON st.assigned_to = s.id
                LEFT JOIN LATERAL (
                    SELECT * FROM sub_task_reviews
                    WHERE task_id = st.id
                    ORDER BY created_at DESC
                    LIMIT 1
                ) r ON true
                LEFT JOIN users u ON r.reviewer_id = u.id
                WHERE {where_clause}
                ORDER BY r.created_at DESC NULLS LAST
                LIMIT {limit_param}""",
            *params,
        )

        result = []
        for row in rows:
            task_dict = _row_to_dict(row)
            # Nest checklists with items and documents
            checklists = await conn.fetch(
                "SELECT * FROM sub_checklists WHERE task_id = $1 ORDER BY sort_order",
                row["id"],
            )
            cl_list = []
            for cl in checklists:
                cl_dict = _row_to_dict(cl)
                items = await conn.fetch(
                    "SELECT * FROM sub_checklist_items WHERE checklist_id = $1 ORDER BY sort_order",
                    cl["id"],
                )
                item_list = []
                for item in items:
                    item_dict = _row_to_dict(item)
                    docs = await conn.fetch(
                        "SELECT * FROM sub_task_documents WHERE checklist_item_id = $1 ORDER BY created_at",
                        item["id"],
                    )
                    item_dict["documents"] = [_row_to_dict(d) for d in docs]
                    item_list.append(item_dict)
                cl_dict["items"] = item_list
                cl_list.append(cl_dict)
            task_dict["checklists"] = cl_list
            result.append(task_dict)

    return result


@router.post("/tasks/{task_id}/review")
async def submit_review(
    task_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Submit a review for a task (PM only)."""
    _require_pm_or_admin(current_user)
    body = await request.json()
    pool = await get_db_pool()

    task = await _verify_sub_task_access(task_id, current_user, pool)

    decision = body.get("decision")
    if decision not in ("approved", "rejected", "revision_requested"):
        raise HTTPException(status_code=400, detail="Invalid decision. Must be: approved, rejected, revision_requested")

    if task["status"] != "pending_review":
        raise HTTPException(status_code=400, detail="Task is not in 'pending_review' status")

    if decision in ("rejected", "revision_requested") and not body.get("feedback"):
        raise HTTPException(status_code=400, detail="Feedback is required for rejections and revision requests")

    # Map decision to task status
    status_map = {
        "approved": "approved",
        "rejected": "rejected",
        "revision_requested": "revision_requested",
    }
    new_status = status_map[decision]

    async with pool.acquire() as conn:
        # Create review record
        await conn.execute(
            """INSERT INTO sub_task_reviews (id, task_id, reviewer_id, decision, feedback, rejection_reason)
               VALUES ($1,$2,$3,$4,$5,$6)""",
            str(uuid.uuid4()), task_id, _get_user_id(current_user),
            decision, body.get("feedback"), body.get("rejectionReason"),
        )

        # Update task status
        await conn.execute(
            "UPDATE sub_tasks SET status = $1, updated_at = NOW() WHERE id = $2",
            new_status, task_id,
        )

        # If approved, check if any milestones should become payable
        if decision == "approved":
            await _check_milestone_payability(task_id, conn)

    # Send notification to sub
    try:
        await _send_review_notification_email(task_id, decision, body.get("feedback"), pool)
    except Exception as e:
        logger.warning(f"Failed to send review notification: {e}")

    return {"message": f"Task {decision}", "status": new_status}


@router.get("/tasks/{task_id}/reviews")
async def get_task_reviews(
    task_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Get review history for a task."""
    pool = await get_db_pool()
    await _verify_sub_task_access(task_id, current_user, pool)

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT r.*, u.first_name || ' ' || u.last_name as reviewer_name
               FROM sub_task_reviews r
               LEFT JOIN users u ON r.reviewer_id = u.id
               WHERE r.task_id = $1
               ORDER BY r.created_at DESC""",
            task_id,
        )
    return [_row_to_dict(r) for r in rows]


# ============================================================================
# CHECKLIST TEMPLATES
# ============================================================================

@router.get("/templates")
async def list_templates(
    current_user: dict = Depends(get_current_user_dependency),
):
    """List checklist templates."""
    _require_pm_or_admin(current_user)
    pool = await get_db_pool()
    company_id = _get_company_id(current_user)

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM sub_checklist_templates WHERE company_id = $1 ORDER BY name",
            company_id,
        )
    return [_row_to_dict(r) for r in rows]


@router.post("/templates", status_code=201)
async def create_template(
    request: Request,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Create a checklist template."""
    _require_pm_or_admin(current_user)
    body = await request.json()
    pool = await get_db_pool()
    company_id = _get_company_id(current_user)

    template_id = str(uuid.uuid4())
    items_json = json.dumps(body.get("items", []))

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO sub_checklist_templates (id, company_id, name, trade_category, items, created_by)
               VALUES ($1,$2,$3,$4,$5::jsonb,$6) RETURNING *""",
            template_id, company_id,
            body.get("name", "Template"),
            body.get("tradeCategory"),
            items_json,
            _get_user_id(current_user),
        )
    return _row_to_dict(row)


@router.put("/templates/{template_id}")
async def update_template(
    template_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Update a checklist template."""
    _require_pm_or_admin(current_user)
    body = await request.json()
    pool = await get_db_pool()

    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT * FROM sub_checklist_templates WHERE id = $1", template_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Template not found")
        if not is_root_admin(current_user) and str(existing["company_id"]) != _get_company_id(current_user):
            raise HTTPException(status_code=403, detail="Access denied")

        updates = []
        values = []
        idx = 1
        if "name" in body:
            updates.append(f"name = ${idx}")
            values.append(body["name"])
            idx += 1
        if "tradeCategory" in body:
            updates.append(f"trade_category = ${idx}")
            values.append(body["tradeCategory"])
            idx += 1
        if "items" in body:
            updates.append(f"items = ${idx}::jsonb")
            values.append(json.dumps(body["items"]))
            idx += 1

        if not updates:
            return _row_to_dict(existing)

        updates.append(f"updated_at = ${idx}")
        values.append(datetime.now(timezone.utc))
        idx += 1
        values.append(template_id)

        row = await conn.fetchrow(
            f"UPDATE sub_checklist_templates SET {', '.join(updates)} WHERE id = ${idx} RETURNING *",
            *values,
        )
    return _row_to_dict(row)


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Delete a checklist template."""
    _require_pm_or_admin(current_user)
    pool = await get_db_pool()

    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT * FROM sub_checklist_templates WHERE id = $1", template_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Template not found")
        if not is_root_admin(current_user) and str(existing["company_id"]) != _get_company_id(current_user):
            raise HTTPException(status_code=403, detail="Access denied")
        await conn.execute("DELETE FROM sub_checklist_templates WHERE id = $1", template_id)
    return {"message": "Template deleted"}


@router.post("/templates/{template_id}/apply/{task_id}")
async def apply_template_to_task(
    template_id: str,
    task_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Apply a checklist template to a task."""
    _require_pm_or_admin(current_user)
    pool = await get_db_pool()
    await _verify_sub_task_access(task_id, current_user, pool)

    async with pool.acquire() as conn:
        template = await conn.fetchrow(
            "SELECT * FROM sub_checklist_templates WHERE id = $1", template_id
        )
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        # Create checklist from template
        checklist_id = str(uuid.uuid4())
        await conn.execute(
            """INSERT INTO sub_checklists (id, task_id, name, template_id, sort_order)
               VALUES ($1, $2, $3, $4, 0)""",
            checklist_id, task_id, template["name"], template_id,
        )

        # Create items from template
        items = template["items"] if isinstance(template["items"], list) else json.loads(template["items"] or "[]")
        for i, item in enumerate(items):
            await conn.execute(
                """INSERT INTO sub_checklist_items (id, checklist_id, description, item_type, sort_order)
                   VALUES ($1, $2, $3, $4, $5)""",
                str(uuid.uuid4()), checklist_id,
                item.get("description", ""),
                item.get("itemType", item.get("item_type", "standard")),
                item.get("sortOrder", item.get("sort_order", i)),
            )

        # Return the created checklist
        cl_row = await conn.fetchrow("SELECT * FROM sub_checklists WHERE id = $1", checklist_id)
        cl_dict = _row_to_dict(cl_row)
        item_rows = await conn.fetch(
            "SELECT * FROM sub_checklist_items WHERE checklist_id = $1 ORDER BY sort_order",
            checklist_id,
        )
        cl_dict["items"] = [_row_to_dict(r) for r in item_rows]
    return cl_dict


# ============================================================================
# CONTRACT VALUE
# ============================================================================

@router.put("/assignments/{assignment_id}/contract-value")
async def update_contract_value(
    assignment_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Update the contract value for a subcontractor assignment."""
    _require_pm_or_admin(current_user)
    body = await request.json()
    contract_value = body.get("contractValue")
    if contract_value is None:
        raise HTTPException(status_code=400, detail="contractValue is required")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        assignment = await conn.fetchrow(
            """SELECT sa.*, p.company_id
               FROM subcontractor_assignments sa
               JOIN projects p ON sa.project_id = p.id
               WHERE sa.id = $1""",
            assignment_id,
        )
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        if not is_root_admin(current_user) and str(assignment["company_id"]) != _get_company_id(current_user):
            raise HTTPException(status_code=403, detail="Access denied")

        row = await conn.fetchrow(
            """UPDATE subcontractor_assignments
               SET contract_value = $1, updated_at = NOW()
               WHERE id = $2
               RETURNING *""",
            float(contract_value), assignment_id,
        )
    return _row_to_dict(row)


# ============================================================================
# PAYMENT MILESTONES
# ============================================================================

@router.get("/assignments/{assignment_id}/milestones")
async def list_milestones(
    assignment_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """List milestones for an assignment."""
    pool = await get_db_pool()

    # Verify access to assignment
    async with pool.acquire() as conn:
        assignment = await conn.fetchrow(
            """SELECT sa.*, p.company_id
               FROM subcontractor_assignments sa
               JOIN projects p ON sa.project_id = p.id
               WHERE sa.id = $1""",
            assignment_id,
        )
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")

        role = _get_role(current_user)
        if role in ("subcontractor", "contractor"):
            sub_id = await _get_user_subcontractor_id(current_user, pool)
            user_id = _get_user_id(current_user)
            if str(assignment.get("subcontractor_id", "")) != user_id and \
               str(assignment.get("sub_company_id", "") or "") != str(sub_id or ""):
                raise HTTPException(status_code=403, detail="Access denied")
        elif not is_root_admin(current_user):
            if str(assignment["company_id"]) != _get_company_id(current_user):
                raise HTTPException(status_code=403, detail="Access denied")

        rows = await conn.fetch(
            "SELECT * FROM sub_payment_milestones WHERE assignment_id = $1 ORDER BY created_at",
            assignment_id,
        )
    return [_row_to_dict(r) for r in rows]


@router.post("/assignments/{assignment_id}/milestones", status_code=201)
async def create_milestone(
    assignment_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Create a payment milestone."""
    _require_pm_or_admin(current_user)
    body = await request.json()
    pool = await get_db_pool()

    async with pool.acquire() as conn:
        assignment = await conn.fetchrow(
            """SELECT sa.*, p.company_id
               FROM subcontractor_assignments sa
               JOIN projects p ON sa.project_id = p.id
               WHERE sa.id = $1""",
            assignment_id,
        )
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        if not is_root_admin(current_user) and str(assignment["company_id"]) != _get_company_id(current_user):
            raise HTTPException(status_code=403, detail="Access denied")

        linked_task_ids = body.get("linkedTaskIds", [])
        milestone_id = str(uuid.uuid4())
        row = await conn.fetchrow(
            """INSERT INTO sub_payment_milestones
               (id, assignment_id, name, description, amount, retention_pct,
                milestone_type, linked_task_ids)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb) RETURNING *""",
            milestone_id, assignment_id,
            body.get("name", "Milestone"),
            body.get("description"),
            body.get("amount", 0),
            body.get("retentionPct", 0),
            body.get("milestoneType", "fixed"),
            json.dumps(linked_task_ids),
        )

        # Check if milestone should be immediately payable (all linked tasks already approved)
        if linked_task_ids:
            all_approved = True
            for tid in linked_task_ids:
                t = await conn.fetchrow("SELECT status FROM sub_tasks WHERE id = $1", tid)
                if not t or t["status"] != "approved":
                    all_approved = False
                    break
            if all_approved:
                await conn.execute(
                    "UPDATE sub_payment_milestones SET status = 'payable', updated_at = NOW() WHERE id = $1",
                    milestone_id,
                )
                row = await conn.fetchrow("SELECT * FROM sub_payment_milestones WHERE id = $1", milestone_id)

    return _row_to_dict(row)


@router.put("/milestones/{milestone_id}")
async def update_milestone(
    milestone_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Update a payment milestone."""
    _require_pm_or_admin(current_user)
    body = await request.json()
    pool = await get_db_pool()

    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            """SELECT m.*, sa.project_id, p.company_id
               FROM sub_payment_milestones m
               JOIN subcontractor_assignments sa ON m.assignment_id = sa.id
               JOIN projects p ON sa.project_id = p.id
               WHERE m.id = $1""",
            milestone_id,
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Milestone not found")
        if not is_root_admin(current_user) and str(existing["company_id"]) != _get_company_id(current_user):
            raise HTTPException(status_code=403, detail="Access denied")

        field_map = {
            "name": "name", "description": "description", "amount": "amount",
            "retentionPct": "retention_pct", "milestoneType": "milestone_type",
            "status": "status", "paidAmount": "paid_amount",
        }
        updates = []
        values = []
        idx = 1
        for camel, snake in field_map.items():
            if camel in body:
                updates.append(f"{snake} = ${idx}")
                values.append(body[camel])
                idx += 1

        if "linkedTaskIds" in body:
            updates.append(f"linked_task_ids = ${idx}::jsonb")
            values.append(json.dumps(body["linkedTaskIds"]))
            idx += 1

        if not updates:
            return _row_to_dict(existing)

        updates.append(f"updated_at = ${idx}")
        values.append(datetime.now(timezone.utc))
        idx += 1
        values.append(milestone_id)

        row = await conn.fetchrow(
            f"UPDATE sub_payment_milestones SET {', '.join(updates)} WHERE id = ${idx} RETURNING *",
            *values,
        )
    return _row_to_dict(row)


@router.put("/milestones/{milestone_id}/mark-paid")
async def mark_milestone_paid(
    milestone_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Mark a milestone as paid (Admin only)."""
    role = _get_role(current_user)
    if not is_root_admin(current_user) and role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can mark milestones as paid")

    body = await request.json()
    pool = await get_db_pool()

    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT * FROM sub_payment_milestones WHERE id = $1", milestone_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Milestone not found")
        if existing["status"] not in ("payable", "approved"):
            raise HTTPException(status_code=400, detail="Milestone must be payable or approved before marking as paid")

        row = await conn.fetchrow(
            """UPDATE sub_payment_milestones
               SET status = 'paid', paid_at = NOW(),
                   paid_amount = COALESCE($1, amount), updated_at = NOW()
               WHERE id = $2 RETURNING *""",
            body.get("paidAmount"),
            milestone_id,
        )
    return _row_to_dict(row)


@router.get("/my-milestones")
async def get_my_milestones(
    project_id: Optional[str] = Query(None, alias="projectId"),
    current_user: dict = Depends(get_current_user_dependency),
):
    """Get payment summary and milestones for current subcontractor."""
    role = _get_role(current_user)
    if role not in ("subcontractor", "contractor"):
        raise HTTPException(status_code=403, detail="Only subcontractors can access this endpoint")

    pool = await get_db_pool()
    user_id = _get_user_id(current_user)
    sub_id = await _get_user_subcontractor_id(current_user, pool)

    async with pool.acquire() as conn:
        # Build query with optional project filter
        base_where = "(sa.subcontractor_id = $1 OR sa.sub_company_id = $2)"
        params: list = [user_id, sub_id or ""]

        if project_id:
            project_filter = f" AND sa.project_id = ${len(params) + 1}"
            params.append(project_id)
        else:
            project_filter = ""

        rows = await conn.fetch(
            f"""SELECT m.id, m.name, m.description, m.amount, m.status,
                       m.retention_pct, m.paid_at, m.paid_amount,
                       m.linked_task_ids,
                       sa.contract_value
                FROM sub_payment_milestones m
                JOIN subcontractor_assignments sa ON m.assignment_id = sa.id
                WHERE {base_where}{project_filter}
                ORDER BY m.created_at""",
            *params,
        )

        # If no milestones but projectId given, still fetch contract_value
        contract_value = 0
        if rows:
            contract_value = float(rows[0]["contract_value"] or 0)
        elif project_id:
            cv_row = await conn.fetchrow(
                f"""SELECT sa.contract_value
                    FROM subcontractor_assignments sa
                    WHERE {base_where} AND sa.project_id = ${len(params) + 1 if not project_filter else 3}""",
                *params[:2], project_id,
            )
            if cv_row:
                contract_value = float(cv_row["contract_value"] or 0)

    # Build milestones list and compute aggregates
    earned = 0.0
    paid = 0.0
    retention = 0.0
    milestones_list = []

    for r in rows:
        amount = float(r["amount"] or 0)
        status = r["status"] or "pending"
        retention_pct = float(r["retention_pct"] or 0)
        linked_tasks = r["linked_task_ids"] if r["linked_task_ids"] else []
        linked_count = len(linked_tasks) if isinstance(linked_tasks, list) else 0

        # Earned = milestones that are approved, payable, or paid
        if status in ("approved", "payable", "paid"):
            earned += amount
            retention += amount * retention_pct / 100

        # Paid = actually paid milestones
        if status == "paid":
            paid_amount = float(r["paid_amount"] or 0)
            paid += paid_amount if paid_amount > 0 else amount

        milestones_list.append({
            "id": r["id"],
            "name": r["name"],
            "description": r["description"],
            "amount": amount,
            "status": status,
            "linkedTasksCount": linked_count,
            "paidDate": r["paid_at"].isoformat() if r["paid_at"] else None,
        })

    remaining = contract_value - earned

    return {
        "totalContractValue": contract_value,
        "earned": earned,
        "paid": paid,
        "retention": retention,
        "remaining": remaining,
        "milestones": milestones_list,
    }


# ============================================================================
# PERFORMANCE
# ============================================================================

@router.get("/companies/{sub_id}/performance")
async def get_performance_scores(
    sub_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Get performance scores for a subcontractor."""
    pool = await get_db_pool()

    # Access check
    role = _get_role(current_user)
    if role in ("subcontractor", "contractor"):
        user_sub_id = await _get_user_subcontractor_id(current_user, pool)
        if str(user_sub_id) != sub_id:
            raise HTTPException(status_code=403, detail="Access denied")

    async with pool.acquire() as conn:
        if not is_root_admin(current_user) and role not in ("subcontractor", "contractor"):
            sub = await conn.fetchrow("SELECT company_id FROM subcontractors WHERE id = $1", sub_id)
            if not sub or str(sub["company_id"]) != _get_company_id(current_user):
                raise HTTPException(status_code=403, detail="Access denied")

        rows = await conn.fetch(
            """SELECT ps.*, p.name as project_name
               FROM sub_performance_scores ps
               JOIN projects p ON ps.project_id = p.id
               WHERE ps.subcontractor_id = $1
               ORDER BY ps.calculated_at DESC""",
            sub_id,
        )
    return [_row_to_dict(r) for r in rows]


@router.post("/companies/{sub_id}/calculate-performance")
async def calculate_performance(
    sub_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Calculate/recalculate performance scores for a subcontractor."""
    _require_pm_or_admin(current_user)
    pool = await get_db_pool()

    async with pool.acquire() as conn:
        sub = await conn.fetchrow("SELECT * FROM subcontractors WHERE id = $1", sub_id)
        if not sub:
            raise HTTPException(status_code=404, detail="Subcontractor not found")
        if not is_root_admin(current_user) and str(sub["company_id"]) != _get_company_id(current_user):
            raise HTTPException(status_code=403, detail="Access denied")

        # Get all projects this sub has tasks in
        projects = await conn.fetch(
            """SELECT DISTINCT st.project_id
               FROM sub_tasks st
               WHERE st.assigned_to = $1""",
            sub_id,
        )

        scores = []
        for proj in projects:
            project_id = proj["project_id"]

            # Calculate timeliness: % of tasks completed on or before deadline
            tasks = await conn.fetch(
                """SELECT id, end_date, completed_at, status
                   FROM sub_tasks WHERE assigned_to = $1 AND project_id = $2""",
                sub_id, project_id,
            )
            total = len(tasks)
            if total == 0:
                continue

            on_time = sum(
                1 for t in tasks
                if t["status"] == "approved" and t["completed_at"] and t["end_date"]
                and t["completed_at"] <= t["end_date"]
            )
            completed_tasks = [t for t in tasks if t["status"] == "approved"]
            total_completed = len(completed_tasks)

            # Timeliness score (30% weight)
            timeliness = (on_time / total_completed * 100) if total_completed > 0 else 0

            # Quality: first-pass approval rate
            tasks_with_reviews = 0
            first_pass_approved = 0
            for t in completed_tasks:
                reviews = await conn.fetch(
                    "SELECT decision FROM sub_task_reviews WHERE task_id = $1 ORDER BY created_at",
                    t["id"],
                )
                if reviews:
                    tasks_with_reviews += 1
                    if reviews[0]["decision"] == "approved":
                        first_pass_approved += 1
            quality = (first_pass_approved / tasks_with_reviews * 100) if tasks_with_reviews > 0 else 100

            # Documentation: % of doc-required items with documents
            doc_required = await conn.fetchval(
                """SELECT COUNT(*) FROM sub_checklist_items ci
                   JOIN sub_checklists cl ON ci.checklist_id = cl.id
                   WHERE cl.task_id = ANY(SELECT id FROM sub_tasks WHERE assigned_to = $1 AND project_id = $2)
                     AND ci.item_type = 'doc_required'""",
                sub_id, project_id,
            )
            doc_with_uploads = await conn.fetchval(
                """SELECT COUNT(DISTINCT ci.id)
                   FROM sub_checklist_items ci
                   JOIN sub_checklists cl ON ci.checklist_id = cl.id
                   JOIN sub_task_documents d ON d.checklist_item_id = ci.id
                   WHERE cl.task_id = ANY(SELECT id FROM sub_tasks WHERE assigned_to = $1 AND project_id = $2)
                     AND ci.item_type = 'doc_required'""",
                sub_id, project_id,
            )
            documentation = (doc_with_uploads / doc_required * 100) if doc_required > 0 else 100

            # Responsiveness: placeholder (100 for now)
            responsiveness = 100

            # Safety: placeholder (100 for now)
            safety = 100

            # Composite score
            composite = (
                timeliness * 0.30 +
                quality * 0.30 +
                documentation * 0.15 +
                responsiveness * 0.15 +
                safety * 0.10
            )

            # Upsert score
            await conn.execute(
                """INSERT INTO sub_performance_scores
                   (id, subcontractor_id, project_id, timeliness_score, quality_score,
                    documentation_score, responsiveness_score, safety_score, composite_score,
                    tasks_total, tasks_on_time, tasks_approved_first_pass, calculated_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
                   ON CONFLICT (subcontractor_id, project_id)
                   DO UPDATE SET
                    timeliness_score = $4, quality_score = $5,
                    documentation_score = $6, responsiveness_score = $7,
                    safety_score = $8, composite_score = $9,
                    tasks_total = $10, tasks_on_time = $11,
                    tasks_approved_first_pass = $12, calculated_at = NOW()""",
                str(uuid.uuid4()), sub_id, project_id,
                round(timeliness, 2), round(quality, 2),
                round(documentation, 2), round(responsiveness, 2),
                round(safety, 2), round(composite, 2),
                total, on_time, first_pass_approved,
            )

            scores.append({
                "projectId": project_id,
                "timeliness": round(timeliness, 2),
                "quality": round(quality, 2),
                "documentation": round(documentation, 2),
                "responsiveness": round(responsiveness, 2),
                "safety": round(safety, 2),
                "composite": round(composite, 2),
            })

        # Update overall score on subcontractors table
        if scores:
            avg_composite = sum(s["composite"] for s in scores) / len(scores)
            await conn.execute(
                "UPDATE subcontractors SET overall_performance_score = $1, updated_at = NOW() WHERE id = $2",
                round(avg_composite, 2), sub_id,
            )

    return {"subcontractorId": sub_id, "scores": scores}


@router.get("/performance/dashboard")
async def performance_dashboard(
    current_user: dict = Depends(get_current_user_dependency),
):
    """Get performance dashboard with top/bottom performers."""
    _require_pm_or_admin(current_user)
    pool = await get_db_pool()
    company_id = _get_company_id(current_user)

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT s.id, s.name, s.trade, s.overall_performance_score,
                      COUNT(DISTINCT sa.project_id) as project_count
               FROM subcontractors s
               LEFT JOIN subcontractor_assignments sa ON sa.sub_company_id = s.id AND sa.status = 'active'
               WHERE s.company_id = $1 AND s.status = 'active'
               GROUP BY s.id, s.name, s.trade, s.overall_performance_score
               ORDER BY s.overall_performance_score DESC""",
            company_id,
        )
    return [_row_to_dict(r) for r in rows]


# ============================================================================
# SUB COMPANY PROJECTS (PM view — projects assigned to a sub company)
# ============================================================================

@router.get("/companies/{sub_id}/projects")
async def get_sub_company_projects(
    sub_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Get projects assigned to a subcontractor company (PM/Admin view)."""
    _require_pm_or_admin(current_user)
    pool = await get_db_pool()
    company_id = _get_company_id(current_user)

    async with pool.acquire() as conn:
        # Verify sub company belongs to this GC
        sub = await conn.fetchrow("SELECT company_id FROM subcontractors WHERE id = $1", sub_id)
        if not sub:
            raise HTTPException(status_code=404, detail="Subcontractor not found")
        if not is_root_admin(current_user) and str(sub["company_id"]) != company_id:
            raise HTTPException(status_code=403, detail="Access denied")

        rows = await conn.fetch(
            """SELECT p.id, p.name, p.status, sa.id as assignment_id,
                      sa.specialization, sa.contract_value, sa.status as assignment_status
               FROM projects p
               JOIN subcontractor_assignments sa ON sa.project_id = p.id
               WHERE sa.sub_company_id = $1
               ORDER BY sa.created_at DESC""",
            sub_id,
        )
    return [_row_to_dict(r) for r in rows]


@router.post("/companies/{sub_id}/assign-project")
async def assign_sub_to_project(
    sub_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Assign a subcontractor company to a project."""
    _require_pm_or_admin(current_user)
    body = await request.json()
    project_id = body.get("projectId")
    if not project_id:
        raise HTTPException(status_code=400, detail="projectId is required")

    pool = await get_db_pool()
    company_id = _get_company_id(current_user)

    async with pool.acquire() as conn:
        # Verify sub and project belong to same company
        sub = await conn.fetchrow("SELECT company_id FROM subcontractors WHERE id = $1", sub_id)
        if not sub:
            raise HTTPException(status_code=404, detail="Subcontractor not found")
        if not is_root_admin(current_user) and str(sub["company_id"]) != company_id:
            raise HTTPException(status_code=403, detail="Access denied")

        project = await conn.fetchrow("SELECT id, company_id FROM projects WHERE id = $1", project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if not is_root_admin(current_user) and str(project["company_id"]) != company_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Check not already assigned
        existing = await conn.fetchrow(
            "SELECT id FROM subcontractor_assignments WHERE sub_company_id = $1 AND project_id = $2",
            sub_id, project_id,
        )
        if existing:
            return _row_to_dict(existing)

        # Find a user for this sub company to use as subcontractor_id
        sub_user = await conn.fetchrow(
            "SELECT id FROM users WHERE subcontractor_id = $1 LIMIT 1", sub_id
        )
        sub_user_id = str(sub_user["id"]) if sub_user else _get_user_id(current_user)

        assignment_id = str(uuid.uuid4())
        row = await conn.fetchrow(
            """INSERT INTO subcontractor_assignments
               (id, subcontractor_id, project_id, assigned_by, sub_company_id,
                specialization, status)
               VALUES ($1,$2,$3,$4,$5,$6,'active')
               RETURNING *""",
            assignment_id, sub_user_id, project_id,
            _get_user_id(current_user), sub_id,
            body.get("specialization"),
        )
    return _row_to_dict(row)


# ============================================================================
# SUB PORTAL DASHBOARD DATA
# ============================================================================

@router.get("/my-projects")
async def get_my_projects(
    current_user: dict = Depends(get_current_user_dependency),
):
    """Get projects assigned to the current subcontractor."""
    role = _get_role(current_user)
    if role not in ("subcontractor", "contractor"):
        raise HTTPException(status_code=403, detail="Only subcontractors can access this endpoint")

    pool = await get_db_pool()
    user_id = _get_user_id(current_user)
    sub_id = await _get_user_subcontractor_id(current_user, pool)

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT p.id, p.name, p.status, sa.id as assignment_id,
                      sa.specialization, sa.contract_value, sa.start_date, sa.end_date,
                      (SELECT COUNT(*) FROM sub_tasks st
                       WHERE st.project_id = p.id
                         AND (st.assigned_to = $2 OR st.assigned_user_id = $1)) as task_count,
                      (SELECT COUNT(*) FROM sub_tasks st
                       WHERE st.project_id = p.id
                         AND (st.assigned_to = $2 OR st.assigned_user_id = $1)
                         AND st.status = 'approved') as completed_count
               FROM projects p
               JOIN subcontractor_assignments sa ON sa.project_id = p.id
               WHERE sa.subcontractor_id = $1 OR sa.sub_company_id = $2
               ORDER BY sa.created_at DESC""",
            user_id, sub_id or "",
        )
    return [_row_to_dict(r) for r in rows]


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def _check_milestone_payability(task_id: str, conn):
    """Check if any milestones linked to this task should become payable."""
    milestones = await conn.fetch(
        "SELECT * FROM sub_payment_milestones WHERE status = 'pending'",
    )
    for m in milestones:
        linked_ids = m["linked_task_ids"] if isinstance(m["linked_task_ids"], list) else json.loads(m["linked_task_ids"] or "[]")
        if not linked_ids:
            continue  # Milestones without linked tasks must be manually marked
        if task_id not in linked_ids:
            continue
        # Check if ALL linked tasks are approved
        all_approved = True
        for tid in linked_ids:
            t = await conn.fetchrow(
                "SELECT status FROM sub_tasks WHERE id = $1", tid
            )
            if not t or t["status"] != "approved":
                all_approved = False
                break
        if all_approved:
            await conn.execute(
                "UPDATE sub_payment_milestones SET status = 'payable', updated_at = NOW() WHERE id = $1",
                m["id"],
            )
            logger.info(f"Milestone {m['id']} is now payable (all linked tasks approved)")


async def _send_task_assignment_email(task_id: str, pool):
    """Send email notification when a task is assigned to a sub."""
    async with pool.acquire() as conn:
        task = await conn.fetchrow(
            """SELECT st.*, p.name as project_name
               FROM sub_tasks st
               JOIN projects p ON st.project_id = p.id
               WHERE st.id = $1""",
            task_id,
        )
        if not task:
            return

        user_id = task.get("assigned_user_id")
        if not user_id and task.get("assigned_to"):
            # Get a user from the sub company
            user_row = await conn.fetchrow(
                "SELECT id, email, first_name FROM users WHERE subcontractor_id = $1 LIMIT 1",
                task["assigned_to"],
            )
            if user_row:
                user_id = user_row["id"]

        if not user_id:
            return

        user = await conn.fetchrow("SELECT email, first_name FROM users WHERE id = $1", user_id)
        if not user:
            return

    try:
        from ..services.email_service import EmailService
        email_svc = EmailService()
        await email_svc.send_sub_task_assignment_email(
            to_email=user["email"],
            sub_first_name=user["first_name"] or "Contractor",
            task_name=task["name"],
            project_name=task["project_name"],
            magic_link_url=f"{settings.magic_link_base_url}/auth/magic-link",
        )
    except Exception as e:
        logger.warning(f"Failed to send task assignment email: {e}")


async def _send_review_notification_email(task_id: str, decision: str, feedback: str, pool):
    """Send email notification when a review is submitted."""
    async with pool.acquire() as conn:
        task = await conn.fetchrow(
            """SELECT st.*, p.name as project_name
               FROM sub_tasks st
               JOIN projects p ON st.project_id = p.id
               WHERE st.id = $1""",
            task_id,
        )
        if not task:
            return

        user_id = task.get("assigned_user_id")
        if not user_id and task.get("assigned_to"):
            user_row = await conn.fetchrow(
                "SELECT id FROM users WHERE subcontractor_id = $1 LIMIT 1",
                task["assigned_to"],
            )
            user_id = user_row["id"] if user_row else None

        if not user_id:
            return

        user = await conn.fetchrow("SELECT email, first_name FROM users WHERE id = $1", user_id)
        if not user:
            return

    try:
        from ..services.email_service import EmailService
        email_svc = EmailService()
        await email_svc.send_sub_review_notification_email(
            to_email=user["email"],
            sub_first_name=user["first_name"] or "Contractor",
            task_name=task["name"],
            project_name=task["project_name"],
            decision=decision,
            feedback=feedback,
        )
    except Exception as e:
        logger.warning(f"Failed to send review notification email: {e}")
