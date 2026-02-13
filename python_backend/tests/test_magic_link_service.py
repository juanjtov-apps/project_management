"""
Tests for Magic Link Token Service.
Tests token generation, hashing, expiry, single-use, and invalidation.
"""
import pytest
import hashlib
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone, timedelta

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.services.magic_link_service import (
    generate_token,
    hash_token,
    MagicLinkService,
    TOKEN_BYTES,
    INVITE_EXPIRY_HOURS,
    LOGIN_EXPIRY_MINUTES,
)


class TestTokenGeneration:
    def test_generate_token_returns_tuple(self):
        """generate_token() should return (raw_token, token_hash) tuple."""
        result = generate_token()
        assert isinstance(result, tuple)
        assert len(result) == 2

    def test_generate_token_returns_unique_tokens(self):
        """Each call should produce a different raw_token."""
        tokens = set()
        for _ in range(100):
            raw_token, _ = generate_token()
            tokens.add(raw_token)
        assert len(tokens) == 100, "Tokens should be unique"

    def test_generate_token_hash_matches(self):
        """SHA-256 of raw_token should equal the returned hash."""
        raw_token, token_hash = generate_token()
        expected_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        assert token_hash == expected_hash

    def test_token_has_sufficient_entropy(self):
        """Raw token should be at least 64 bytes (86+ chars URL-safe base64)."""
        raw_token, _ = generate_token()
        # secrets.token_urlsafe(64) produces ~86 characters
        assert len(raw_token) >= 80, f"Token too short: {len(raw_token)} chars"

    def test_hash_token_function(self):
        """hash_token should produce consistent SHA-256 hex digest."""
        raw = "test-token-123"
        expected = hashlib.sha256(raw.encode()).hexdigest()
        assert hash_token(raw) == expected

    def test_hash_token_is_deterministic(self):
        """Same input should always produce same hash."""
        raw = "consistent-token"
        hash1 = hash_token(raw)
        hash2 = hash_token(raw)
        assert hash1 == hash2

    def test_different_tokens_produce_different_hashes(self):
        """Different tokens should produce different hashes."""
        _, hash1 = generate_token()
        _, hash2 = generate_token()
        assert hash1 != hash2


class TestMagicLinkService:
    @pytest.fixture
    def mock_pool(self):
        """Create a mock database pool."""
        pool = MagicMock()
        conn = AsyncMock()
        conn.fetchrow = AsyncMock(return_value={"id": "test-id"})
        conn.execute = AsyncMock(return_value="UPDATE 1")

        # Make pool.acquire() return an async context manager
        cm = AsyncMock()
        cm.__aenter__ = AsyncMock(return_value=conn)
        cm.__aexit__ = AsyncMock(return_value=False)
        pool.acquire.return_value = cm

        return pool, conn

    @pytest.fixture
    def service(self, mock_pool):
        pool, _ = mock_pool
        return MagicLinkService(pool)

    @pytest.mark.asyncio
    async def test_create_magic_link_returns_raw_token(self, service):
        """create_magic_link should return a raw token string."""
        raw_token = await service.create_magic_link("user-123", purpose="login")
        assert isinstance(raw_token, str)
        assert len(raw_token) >= 80

    @pytest.mark.asyncio
    async def test_create_magic_link_stores_hash_not_raw(self, service, mock_pool):
        """create_magic_link should store hash in DB, not raw token."""
        _, conn = mock_pool
        raw_token = await service.create_magic_link("user-123", purpose="login")

        # Verify the INSERT was called
        conn.fetchrow.assert_called_once()
        call_args = conn.fetchrow.call_args
        # The token_hash should be the SHA-256 of the raw token
        stored_hash = call_args[0][2]  # third positional arg ($2 = token_hash)
        expected_hash = hash_token(raw_token)
        assert stored_hash == expected_hash

    @pytest.mark.asyncio
    async def test_create_invite_token_has_72h_expiry(self, service, mock_pool):
        """Invite tokens should expire in 72 hours."""
        _, conn = mock_pool
        await service.create_magic_link("user-123", purpose="invite")

        call_args = conn.fetchrow.call_args
        # fetchrow(query, user_id, token_hash, purpose, expires_at)
        # Positional args after query are $1..$4
        # Find the datetime arg (expires_at is $4)
        all_args = call_args[0]
        expires_at = None
        for arg in all_args:
            if isinstance(arg, datetime):
                expires_at = arg
                break
        assert expires_at is not None, "expires_at datetime not found in call args"
        now = datetime.now(timezone.utc)
        expected_expiry = now + timedelta(hours=INVITE_EXPIRY_HOURS)
        assert abs((expires_at - expected_expiry).total_seconds()) < 5

    @pytest.mark.asyncio
    async def test_create_login_token_has_15min_expiry(self, service, mock_pool):
        """Login tokens should expire in 15 minutes."""
        _, conn = mock_pool
        await service.create_magic_link("user-123", purpose="login")

        call_args = conn.fetchrow.call_args
        all_args = call_args[0]
        expires_at = None
        for arg in all_args:
            if isinstance(arg, datetime):
                expires_at = arg
                break
        assert expires_at is not None, "expires_at datetime not found in call args"
        now = datetime.now(timezone.utc)
        expected_expiry = now + timedelta(minutes=LOGIN_EXPIRY_MINUTES)
        assert abs((expires_at - expected_expiry).total_seconds()) < 5

    @pytest.mark.asyncio
    async def test_verify_valid_token_returns_user_data(self, mock_pool):
        """verify_and_consume_token should return user_id and purpose for valid tokens."""
        pool, conn = mock_pool
        conn.fetchrow = AsyncMock(
            return_value={"user_id": "user-123", "purpose": "invite"}
        )
        service = MagicLinkService(pool)

        result = await service.verify_and_consume_token("some-raw-token")
        assert result is not None
        assert result["user_id"] == "user-123"
        assert result["purpose"] == "invite"

    @pytest.mark.asyncio
    async def test_verify_invalid_token_returns_none(self, mock_pool):
        """verify_and_consume_token should return None for invalid tokens."""
        pool, conn = mock_pool
        conn.fetchrow = AsyncMock(return_value=None)  # No matching token
        service = MagicLinkService(pool)

        result = await service.verify_and_consume_token("bad-token")
        assert result is None

    @pytest.mark.asyncio
    async def test_verify_sends_hashed_token_to_db(self, mock_pool):
        """verify should hash the raw token before querying DB."""
        pool, conn = mock_pool
        conn.fetchrow = AsyncMock(return_value=None)
        service = MagicLinkService(pool)

        raw = "my-raw-token"
        await service.verify_and_consume_token(raw)

        call_args = conn.fetchrow.call_args
        queried_hash = call_args[0][1]  # $1 param
        assert queried_hash == hash_token(raw)

    @pytest.mark.asyncio
    async def test_invalidate_user_tokens(self, service, mock_pool):
        """invalidate_user_tokens should mark all user tokens as used."""
        _, conn = mock_pool
        conn.execute = AsyncMock(return_value="UPDATE 3")

        count = await service.invalidate_user_tokens("user-123")
        assert count == 3
        conn.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_invalidate_user_tokens_with_purpose(self, service, mock_pool):
        """invalidate_user_tokens with purpose should filter by purpose."""
        _, conn = mock_pool
        conn.execute = AsyncMock(return_value="UPDATE 1")

        count = await service.invalidate_user_tokens("user-123", purpose="invite")
        assert count == 1
        # Should have passed purpose as second arg
        call_args = conn.execute.call_args
        assert "purpose" in call_args[0][0]  # SQL contains purpose filter

    @pytest.mark.asyncio
    async def test_cleanup_expired_tokens(self, service, mock_pool):
        """cleanup_expired_tokens should delete old expired tokens."""
        _, conn = mock_pool
        conn.execute = AsyncMock(return_value="DELETE 5")

        count = await service.cleanup_expired_tokens()
        assert count == 5
