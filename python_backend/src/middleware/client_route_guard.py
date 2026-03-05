"""
Client Route Guard Middleware

Defense-in-depth security layer that restricts client-role users to a whitelist
of API endpoints. Even if individual endpoint handlers miss a role check, this
middleware ensures client users can NEVER access admin/PM-only API routes.
"""
import logging
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# Whitelist of API path prefixes that client-role users are allowed to access.
# Any /api/* path NOT matching this list will return 403 for client users.
CLIENT_ALLOWED_PATHS = [
    # Auth — check session + logout
    "/api/v1/auth/user",
    "/api/v1/auth/logout",
    # Onboarding — magic link verification and request flows
    "/api/v1/onboarding/",
    # Client portal endpoints (issues, forum, stats, notifications, etc.)
    "/api/v1/client-",
    # Materials — clients can browse and suggest items
    "/api/v1/material-",
    # Payments — clients can view schedules and upload receipts
    "/api/v1/payment-",
    "/api/v1/invoices",
    # Projects — endpoint already restricts clients to assigned project only
    "/api/v1/projects",
    # Stages — filtered to client-visible stages by the endpoint
    "/api/v1/stages",
    # File uploads/downloads (photos, documents)
    "/api/v1/objects/",
    # Notifications
    "/api/v1/notifications",
]


class ClientRouteGuardMiddleware(BaseHTTPMiddleware):
    """Middleware that blocks client-role users from non-whitelisted API routes."""

    async def dispatch(self, request: Request, call_next):
        # Only guard /api/ paths — skip health checks, docs, static assets
        path = request.url.path
        if not path.startswith("/api/"):
            return await call_next(request)

        # Retrieve session from cookie (lightweight — reads from memory cache)
        session_id = request.cookies.get("session_id")
        if not session_id:
            # No session — let the endpoint handler return 401
            return await call_next(request)

        try:
            from ..api.auth import get_session

            session_data = await get_session(session_id)
            if not session_data:
                # Expired/invalid session — let endpoint handle 401
                return await call_next(request)

            user_data = session_data.get("user_data", {})
            role = (
                user_data.get("role_name")
                or user_data.get("role")
                or ""
            ).lower().strip()

            # Non-client users pass through — no restriction
            if role != "client":
                return await call_next(request)

            # CLIENT USER: enforce whitelist
            if not any(path.startswith(allowed) for allowed in CLIENT_ALLOWED_PATHS):
                logger.warning(
                    f"Client route guard blocked: user={user_data.get('email')} "
                    f"path={path} method={request.method}"
                )
                return JSONResponse(
                    status_code=403,
                    content={
                        "detail": "Access denied: this endpoint is not available for client users"
                    },
                )
        except Exception as e:
            # If session lookup fails, let the request through —
            # the endpoint's own auth dependency will catch it.
            logger.warning(f"Client route guard error (allowing through): {e}")

        return await call_next(request)
