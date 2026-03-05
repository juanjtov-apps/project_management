"""
Beta Invitations Database Schema Initialization.
Safe, additive migration that creates the beta_invitations table
for inviting new company admins during the beta period.
"""

from .connection import get_db_pool


async def init_beta_schema():
    """Initialize beta invitations table in public schema."""
    pool = await get_db_pool()

    init_sql = """
    BEGIN;

    -- =============================================
    -- BETA INVITATIONS (platform-level, no company yet)
    -- =============================================
    CREATE TABLE IF NOT EXISTS public.beta_invitations(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(320) NOT NULL,
        token_hash varchar(128) NOT NULL,
        purpose varchar(20) NOT NULL DEFAULT 'invite',
        invited_by varchar NOT NULL,
        target_user_id varchar,
        expires_at timestamptz NOT NULL,
        used_at timestamptz,
        created_user_id varchar,
        created_company_id varchar,
        ip_address varchar(45),
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_beta_invite_inviter FOREIGN KEY(invited_by)
            REFERENCES public.users(id) ON DELETE RESTRICT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_beta_invite_token_hash
        ON public.beta_invitations(token_hash);
    CREATE INDEX IF NOT EXISTS idx_beta_invite_email
        ON public.beta_invitations(email);
    CREATE INDEX IF NOT EXISTS idx_beta_invite_expires
        ON public.beta_invitations(expires_at);

    COMMIT;
    """

    try:
        async with pool.acquire() as conn:
            await conn.execute(init_sql)
            print("Beta invitations schema initialized successfully")
            return True
    except Exception as e:
        print(f"Error initializing beta invitations schema: {e}")
        raise
