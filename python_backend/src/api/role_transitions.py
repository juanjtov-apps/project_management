"""
Role transition side-effect handlers for Proesphere.

When a user's role changes (e.g. crew → subcontractor, client → PM), these
functions handle the data operations that must accompany the change:
  - Subcontractor: create/link/unlink sub company, manage assignments
  - Client: create/cancel invitations, clear project assignment
  - All transitions: invalidate sessions so user gets fresh role on re-login
"""

import uuid as uuid_mod
import logging
from typing import Any, Dict, Optional

from fastapi import HTTPException
from ..database.connection import get_db_pool

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def handle_role_transition(
    user_id: str,
    old_role_id: Optional[int],
    new_role_id: int,
    user_info: Dict[str, Any],
    current_user: Dict[str, Any],
    sub_company_id: Optional[str] = None,
    sub_company_name: Optional[str] = None,
    sub_trade: Optional[str] = None,
) -> None:
    """Orchestrate all side effects when a user's role_id changes.

    Called by both ``user_management.update_user`` and
    ``company_admin.assign_role``.
    """
    pool = await get_db_pool()

    old_role_name = await _get_role_name(old_role_id, pool) if old_role_id else None
    new_role_name = await _get_role_name(new_role_id, pool)

    if not new_role_name:
        logger.warning(f"Could not resolve role name for new_role_id={new_role_id}")
        return

    logger.info(
        f"Role transition for user {user_id}: "
        f"{old_role_name}({old_role_id}) -> {new_role_name}({new_role_id})"
    )

    company_id = str(
        user_info.get("companyId")
        or user_info.get("company_id")
        or ""
    )

    # ---- LEAVING subcontractor ----
    if old_role_name == "subcontractor" and new_role_name != "subcontractor":
        await _transition_from_subcontractor(user_id, pool)

    # ---- LEAVING client ----
    if old_role_name == "client" and new_role_name != "client":
        await _transition_from_client(user_id, pool)

    # ---- ENTERING subcontractor ----
    if new_role_name == "subcontractor" and old_role_name != "subcontractor":
        await _transition_to_subcontractor(
            user_id=user_id,
            company_id=company_id,
            pool=pool,
            sub_company_id=sub_company_id,
            sub_company_name=sub_company_name,
            sub_trade=sub_trade,
        )

    # ---- ENTERING client ----
    if new_role_name == "client" and old_role_name != "client":
        await _transition_to_client(
            user_id=user_id,
            company_id=company_id,
            pool=pool,
            current_user=current_user,
        )

    # ---- Always invalidate sessions so user re-logs with fresh role ----
    await invalidate_user_sessions(user_id, pool)


# ---------------------------------------------------------------------------
# Session invalidation
# ---------------------------------------------------------------------------

async def invalidate_user_sessions(user_id: str, pool=None) -> None:
    """Remove all sessions for *user_id* from both DB and in-memory store.

    Mirrors the pattern in ``company_admin.suspend_user``.
    """
    if pool is None:
        pool = await get_db_pool()

    async with pool.acquire() as conn:
        await conn.execute(
            "DELETE FROM sessions WHERE sess->>'id' = $1",
            str(user_id),
        )
        # Fallback key used by some session formats
        await conn.execute(
            "DELETE FROM sessions WHERE sess->>'userId' = $1",
            str(user_id),
        )

    # Clear from in-memory store
    from .auth import session_store

    sessions_to_remove = [
        sid
        for sid, data in session_store.items()
        if str(data.get("userId")) == str(user_id)
        or str(data.get("user_data", {}).get("id")) == str(user_id)
    ]
    for sid in sessions_to_remove:
        del session_store[sid]

    if sessions_to_remove:
        logger.info(
            f"Invalidated {len(sessions_to_remove)} session(s) for user {user_id}"
        )


# ---------------------------------------------------------------------------
# Transition helpers
# ---------------------------------------------------------------------------

async def _get_role_name(role_id: int, pool) -> Optional[str]:
    """Resolve a role_id to its lowercase name."""
    async with pool.acquire() as conn:
        from .auth import get_role_column_name

        role_col = await get_role_column_name(conn)
        if not role_col:
            return None
        row = await conn.fetchrow(
            f"SELECT {role_col} as role_name FROM roles WHERE id = $1",
            role_id,
        )
        return row["role_name"].lower() if row and row["role_name"] else None


async def _transition_to_subcontractor(
    user_id: str,
    company_id: str,
    pool,
    sub_company_id: Optional[str] = None,
    sub_company_name: Optional[str] = None,
    sub_trade: Optional[str] = None,
) -> None:
    """Create / link a sub-company when a user becomes a subcontractor."""
    async with pool.acquire() as conn:
        async with conn.transaction():
            user_email = await conn.fetchval(
                "SELECT email FROM users WHERE id = $1", user_id
            )

            if sub_company_id:
                # Validate provided sub company
                existing = await conn.fetchrow(
                    "SELECT id, company_id FROM subcontractors WHERE id = $1",
                    sub_company_id,
                )
                if not existing:
                    raise HTTPException(
                        status_code=400,
                        detail="Selected subcontractor company not found",
                    )
                if str(existing["company_id"]) != company_id:
                    raise HTTPException(
                        status_code=403,
                        detail="Subcontractor company does not belong to your company",
                    )
                # Update contact email to the new user's email
                await conn.execute(
                    "UPDATE subcontractors SET contact_email = $2, updated_at = NOW() "
                    "WHERE id = $1",
                    sub_company_id, user_email,
                )

            elif sub_company_name:
                # De-dup by name within the same GC company
                existing = await conn.fetchrow(
                    "SELECT id FROM subcontractors "
                    "WHERE company_id = $1 AND LOWER(name) = LOWER($2)",
                    company_id,
                    sub_company_name,
                )
                if existing:
                    sub_company_id = str(existing["id"])
                    # Update contact email to the new user's email
                    await conn.execute(
                        "UPDATE subcontractors SET contact_email = $2, updated_at = NOW() "
                        "WHERE id = $1",
                        sub_company_id, user_email,
                    )
                else:
                    sub_company_id = str(uuid_mod.uuid4())
                    await conn.execute(
                        """INSERT INTO subcontractors
                           (id, company_id, name, trade, contact_email)
                           VALUES ($1, $2, $3, $4, $5)""",
                        sub_company_id,
                        company_id,
                        sub_company_name,
                        sub_trade,
                        user_email,
                    )
            else:
                # Fallback: create from user's name
                user_row = await conn.fetchrow(
                    "SELECT first_name, last_name FROM users WHERE id = $1",
                    user_id,
                )
                if user_row:
                    fallback_name = (
                        f"{user_row['first_name'] or ''} {user_row['last_name'] or ''}".strip()
                        or "Unknown Subcontractor"
                    )
                    sub_company_id = str(uuid_mod.uuid4())
                    await conn.execute(
                        """INSERT INTO subcontractors
                           (id, company_id, name, contact_email)
                           VALUES ($1, $2, $3, $4)""",
                        sub_company_id,
                        company_id,
                        fallback_name,
                        user_email,
                    )

            # Link the user to the sub company and reactivate if needed
            if sub_company_id:
                await conn.execute(
                    "UPDATE users SET subcontractor_id = $1, updated_at = NOW() "
                    "WHERE id = $2",
                    sub_company_id,
                    user_id,
                )
                # Reactivate the sub company if it was previously deactivated
                await conn.execute(
                    "UPDATE subcontractors SET status = 'active', updated_at = NOW() "
                    "WHERE id = $1 AND status != 'active'",
                    sub_company_id,
                )

    logger.info(
        f"User {user_id} transitioned TO subcontractor, "
        f"sub_company={sub_company_id}"
    )


async def _transition_from_subcontractor(user_id: str, pool) -> None:
    """Clean up when a user leaves the subcontractor role."""
    async with pool.acquire() as conn:
        async with conn.transaction():
            # Capture current link before clearing
            row = await conn.fetchrow(
                "SELECT subcontractor_id FROM users WHERE id = $1", user_id
            )
            sub_company_id = (
                row["subcontractor_id"] if row and row["subcontractor_id"] else None
            )

            # Clear the user's sub company link
            await conn.execute(
                "UPDATE users SET subcontractor_id = NULL, updated_at = NOW() "
                "WHERE id = $1",
                user_id,
            )

            # Terminate active assignments for this user
            try:
                await conn.execute(
                    "UPDATE subcontractor_assignments "
                    "SET status = 'terminated', updated_at = NOW() "
                    "WHERE subcontractor_id = $1 AND status = 'active'",
                    user_id,
                )
            except Exception:
                pass  # table may not exist in minimal setups

            # Deactivate orphaned sub company (mirrors auth_repositories.delete_user)
            if sub_company_id:
                remaining = await conn.fetchval(
                    "SELECT COUNT(*) FROM users WHERE subcontractor_id = $1",
                    sub_company_id,
                )
                if remaining == 0:
                    await conn.execute(
                        "UPDATE subcontractors SET status = 'inactive', "
                        "updated_at = NOW() WHERE id = $1",
                        sub_company_id,
                    )
                    logger.info(
                        f"Deactivated orphaned sub company {sub_company_id}"
                    )

    logger.info(f"User {user_id} transitioned FROM subcontractor")


async def _transition_to_client(
    user_id: str,
    company_id: str,
    pool,
    current_user: Dict[str, Any],
) -> None:
    """Create a client invitation when a user becomes a client."""
    async with pool.acquire() as conn:
        # Check if a pending invitation already exists
        existing_invite = await conn.fetchrow(
            "SELECT id FROM client_portal.client_invitations "
            "WHERE user_id = $1 AND status = 'pending'",
            user_id,
        )
        if not existing_invite:
            user_row = await conn.fetchrow(
                "SELECT assigned_project_id FROM users WHERE id = $1", user_id
            )
            project_id = (
                user_row["assigned_project_id"] if user_row else None
            ) or ""

            caller_id = str(
                current_user.get("id")
                or current_user.get("userId")
                or ""
            )
            try:
                await conn.execute(
                    """INSERT INTO client_portal.client_invitations
                       (id, user_id, project_id, company_id, invited_by, status)
                       VALUES ($1, $2, $3, $4, $5, 'pending')""",
                    str(uuid_mod.uuid4()),
                    user_id,
                    project_id,
                    company_id,
                    caller_id,
                )
            except Exception as e:
                logger.warning(f"Could not create client invitation: {e}")

    logger.info(f"User {user_id} transitioned TO client")


async def _transition_from_client(user_id: str, pool) -> None:
    """Clean up when a user leaves the client role."""
    async with pool.acquire() as conn:
        async with conn.transaction():
            # Clear project assignment
            await conn.execute(
                "UPDATE users SET assigned_project_id = NULL, updated_at = NOW() "
                "WHERE id = $1",
                user_id,
            )

            # Cancel pending invitations
            try:
                await conn.execute(
                    "UPDATE client_portal.client_invitations "
                    "SET status = 'cancelled' "
                    "WHERE user_id = $1 AND status = 'pending'",
                    user_id,
                )
            except Exception as e:
                logger.warning(f"Could not cancel client invitations: {e}")

    logger.info(f"User {user_id} transitioned FROM client")
