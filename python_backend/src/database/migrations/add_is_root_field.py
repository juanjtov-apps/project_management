"""
Migration script to add is_root field to users table.
This migration adds the is_root boolean field and updates the root user record.

Usage:
    # From python_backend directory:
    python -m src.database.migrations.add_is_root_field
    
    # Or from project root:
    cd python_backend && python -m src.database.migrations.add_is_root_field
    
    # Or set PYTHONPATH and run directly:
    PYTHONPATH=python_backend python python_backend/src/database/migrations/add_is_root_field.py
"""

import asyncpg
import os
from typing import Optional
import sys
from pathlib import Path

# Add python_backend directory to path for imports
# This allows the script to be run from different locations
script_dir = Path(__file__).resolve().parent
# File is at: python_backend/src/database/migrations/add_is_root_field.py
# Go up: migrations -> database -> src -> python_backend
python_backend_dir = script_dir.parent.parent.parent

# Add python_backend to path so we can import from src.*
if str(python_backend_dir) not in sys.path:
    sys.path.insert(0, str(python_backend_dir))

# Now we can import using absolute imports from src.*
from src.core.config import settings
from src.database.connection import get_db_pool

async def run_migration(pool: asyncpg.Pool) -> bool:
    """
    Run migration to add is_root field to users table.
    Returns True if migration was successful, False otherwise.
    """
    try:
        async with pool.acquire() as conn:
            # Check if column already exists
            column_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' 
                    AND column_name = 'is_root'
                )
            """)
            
            if not column_exists:
                # Add is_root column
                await conn.execute("""
                    ALTER TABLE users 
                    ADD COLUMN is_root BOOLEAN DEFAULT FALSE NOT NULL
                """)
                print("✅ Added is_root column to users table")
            else:
                print("ℹ️  is_root column already exists")
            
            # Update root user (id = '0' or emails from environment variable) to set is_root = TRUE
            # Use centralized config to get root user emails
            # Note: This will raise an error if ROOT_USER_EMAILS is not set, which is intentional for security
            try:
                root_emails = settings.root_user_emails_list
            except ValueError as e:
                print(f"❌ Error: {e}")
                print("⚠️  Migration cannot proceed without ROOT_USER_EMAILS environment variable.")
                print("   Please set ROOT_USER_EMAILS before running this migration.")
                return False
            
            # Update by ID
            result = await conn.execute("""
                UPDATE users 
                SET is_root = TRUE 
                WHERE id = '0' AND (is_root IS NULL OR is_root = FALSE)
            """)
            
            # Update by email
            for email in root_emails:
                await conn.execute("""
                    UPDATE users 
                    SET is_root = TRUE 
                    WHERE email = $1 AND (is_root IS NULL OR is_root = FALSE)
                """, email)
            
            print("✅ Updated root user records to set is_root = TRUE")
            
            # Create index on is_root for faster queries
            index_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1 
                    FROM pg_indexes 
                    WHERE tablename = 'users' 
                    AND indexname = 'idx_users_is_root'
                )
            """)
            
            if not index_exists:
                await conn.execute("""
                    CREATE INDEX idx_users_is_root ON users(is_root) 
                    WHERE is_root = TRUE
                """)
                print("✅ Created index on is_root field")
            
            return True
            
    except Exception as e:
        print(f"❌ Migration error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def rollback_migration(pool: asyncpg.Pool) -> bool:
    """
    Rollback migration by removing is_root column.
    WARNING: This will remove the is_root field and all data in it.
    """
    try:
        async with pool.acquire() as conn:
            # Drop index first
            await conn.execute("DROP INDEX IF EXISTS idx_users_is_root")
            
            # Drop column
            await conn.execute("ALTER TABLE users DROP COLUMN IF EXISTS is_root")
            
            print("✅ Rolled back is_root migration")
            return True
            
    except Exception as e:
        print(f"❌ Rollback error: {e}")
        return False

if __name__ == "__main__":
    import asyncio
    
    async def main():
        # get_db_pool is already imported at the top
        pool = await get_db_pool()
        try:
            success = await run_migration(pool)
            if success:
                print("✅ Migration completed successfully")
            else:
                print("❌ Migration failed")
        finally:
            await pool.close()
    
    asyncio.run(main())

