"""
Magic Link Token Service for Client Onboarding.
Handles generation, storage, and verification of magic link tokens.
Only SHA-256 hashes are stored in the database; raw tokens are sent via email/SMS.
"""

import secrets
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Token configuration
TOKEN_BYTES = 64  # 512 bits of entropy
INVITE_EXPIRY_HOURS = 72  # 3 days for invite links
LOGIN_EXPIRY_MINUTES = 15  # 15 minutes for login links


def generate_token() -> tuple[str, str]:
    """Generate a crypto-random token and its SHA-256 hash.

    Returns:
        (raw_token, token_hash) - raw_token is URL-safe, token_hash is hex digest
    """
    raw_token = secrets.token_urlsafe(TOKEN_BYTES)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    return raw_token, token_hash


def hash_token(raw_token: str) -> str:
    """Hash a raw token with SHA-256."""
    return hashlib.sha256(raw_token.encode()).hexdigest()


class MagicLinkService:
    """Service for managing magic link tokens."""

    def __init__(self, db_pool):
        self.db_pool = db_pool

    async def create_magic_link(
        self, user_id: str, purpose: str = "login"
    ) -> str:
        """Create and store a magic link token.

        Args:
            user_id: The user this token authenticates
            purpose: 'invite' for first-time invite, 'login' for subsequent logins

        Returns:
            The raw token (to be sent to the user via email/SMS)
        """
        raw_token, token_hash = generate_token()

        if purpose == "invite":
            expires_at = datetime.now(timezone.utc) + timedelta(hours=INVITE_EXPIRY_HOURS)
        else:
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=LOGIN_EXPIRY_MINUTES)

        query = """
            INSERT INTO client_portal.magic_link_tokens
            (user_id, token_hash, purpose, expires_at)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        """

        async with self.db_pool.acquire() as conn:
            await conn.fetchrow(query, user_id, token_hash, purpose, expires_at)

        logger.info(f"Magic link created for user {user_id} (purpose={purpose})")
        return raw_token

    async def verify_and_consume_token(
        self, raw_token: str, ip_address: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Verify a magic link token, mark it as used, and return the associated user.

        Args:
            raw_token: The raw token from the URL
            ip_address: Optional client IP for audit trail

        Returns:
            Dict with user_id and purpose if valid, None if invalid/expired/used
        """
        token_hash = hash_token(raw_token)

        query = """
            UPDATE client_portal.magic_link_tokens
            SET used_at = NOW(), ip_address = $2
            WHERE token_hash = $1
              AND used_at IS NULL
              AND expires_at > NOW()
            RETURNING user_id, purpose
        """

        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow(query, token_hash, ip_address)

        if row:
            logger.info(f"Magic link verified for user {row['user_id']} (purpose={row['purpose']})")
            return {"user_id": row["user_id"], "purpose": row["purpose"]}

        logger.warning(f"Magic link verification failed (token_hash prefix={token_hash[:8]}...)")
        return None

    async def invalidate_user_tokens(
        self, user_id: str, purpose: Optional[str] = None
    ) -> int:
        """Invalidate all outstanding tokens for a user.

        Args:
            user_id: User whose tokens to invalidate
            purpose: Optional filter by purpose ('invite' or 'login')

        Returns:
            Number of tokens invalidated
        """
        if purpose:
            query = """
                UPDATE client_portal.magic_link_tokens
                SET used_at = NOW()
                WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL
            """
            async with self.db_pool.acquire() as conn:
                result = await conn.execute(query, user_id, purpose)
        else:
            query = """
                UPDATE client_portal.magic_link_tokens
                SET used_at = NOW()
                WHERE user_id = $1 AND used_at IS NULL
            """
            async with self.db_pool.acquire() as conn:
                result = await conn.execute(query, user_id)

        # asyncpg returns "UPDATE N"
        count = int(result.split()[-1]) if result else 0
        if count > 0:
            logger.info(f"Invalidated {count} token(s) for user {user_id}")
        return count

    async def cleanup_expired_tokens(self) -> int:
        """Remove tokens that expired more than 24 hours ago.

        Returns:
            Number of tokens deleted
        """
        query = """
            DELETE FROM client_portal.magic_link_tokens
            WHERE expires_at < NOW() - INTERVAL '24 hours'
        """
        async with self.db_pool.acquire() as conn:
            result = await conn.execute(query)

        count = int(result.split()[-1]) if result else 0
        if count > 0:
            logger.info(f"Cleaned up {count} expired magic link token(s)")
        return count
