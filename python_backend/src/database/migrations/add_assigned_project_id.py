"""
Migration script to add assigned_project_id field to users table.
This migration adds the assigned_project_id column for client users to be
assigned to a specific project (client portal feature).

Usage:
    # From python_backend directory:
    python -m src.database.migrations.add_assigned_project_id

    # Or from project root:
    cd python_backend && python -m src.database.migrations.add_assigned_project_id

    # Or set PYTHONPATH and run directly:
    PYTHONPATH=python_backend python python_backend/src/database/migrations/add_assigned_project_id.py

    # To rollback:
    python -m src.database.migrations.add_assigned_project_id --rollback
"""

import asyncpg
import os
import sys
from pathlib import Path

# Add python_backend directory to path for imports
# This allows the script to be run from different locations
script_dir = Path(__file__).resolve().parent
# File is at: python_backend/src/database/migrations/add_assigned_project_id.py
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
    Run migration to add assigned_project_id field to users table.
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
                    AND column_name = 'assigned_project_id'
                )
            """)

            if not column_exists:
                # Add assigned_project_id column (varchar to match projects.id type)
                await conn.execute("""
                    ALTER TABLE users
                    ADD COLUMN assigned_project_id VARCHAR(255) DEFAULT NULL
                """)
                print("Added assigned_project_id column to users table")
            else:
                print("assigned_project_id column already exists")

            # Check if foreign key constraint exists
            fk_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.constraint_column_usage ccu
                        ON tc.constraint_name = ccu.constraint_name
                    WHERE tc.table_name = 'users'
                    AND tc.constraint_type = 'FOREIGN KEY'
                    AND ccu.column_name = 'assigned_project_id'
                )
            """)

            if not fk_exists and column_exists or not fk_exists and not column_exists:
                # Add foreign key constraint with ON DELETE SET NULL
                # This means if a project is deleted, the user's assigned_project_id becomes NULL
                try:
                    await conn.execute("""
                        ALTER TABLE users
                        ADD CONSTRAINT fk_users_assigned_project
                        FOREIGN KEY (assigned_project_id)
                        REFERENCES projects(id)
                        ON DELETE SET NULL
                    """)
                    print("Added foreign key constraint to projects table")
                except asyncpg.exceptions.UndefinedTableError:
                    print("Warning: projects table does not exist, skipping foreign key constraint")
                except asyncpg.exceptions.DuplicateObjectError:
                    print("Foreign key constraint already exists")
            else:
                print("Foreign key constraint already exists")

            # Create index on assigned_project_id for efficient lookups
            index_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_indexes
                    WHERE tablename = 'users'
                    AND indexname = 'idx_users_assigned_project_id'
                )
            """)

            if not index_exists:
                await conn.execute("""
                    CREATE INDEX idx_users_assigned_project_id
                    ON users(assigned_project_id)
                    WHERE assigned_project_id IS NOT NULL
                """)
                print("Created index on assigned_project_id field")
            else:
                print("Index on assigned_project_id already exists")

            # Verify the migration
            verify_column = await conn.fetchval("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'users'
                AND column_name = 'assigned_project_id'
            """)

            if verify_column:
                print("Migration verified: assigned_project_id column exists")
                return True
            else:
                print("Migration verification failed: column not found")
                return False

    except Exception as e:
        print(f"Migration error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def rollback_migration(pool: asyncpg.Pool) -> bool:
    """
    Rollback migration by removing assigned_project_id column.
    WARNING: This will remove the assigned_project_id field and all data in it.
    """
    try:
        async with pool.acquire() as conn:
            # Drop index first
            await conn.execute("DROP INDEX IF EXISTS idx_users_assigned_project_id")
            print("Dropped index idx_users_assigned_project_id")

            # Drop foreign key constraint
            # Get the constraint name first since it might vary
            constraint_name = await conn.fetchval("""
                SELECT tc.constraint_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = 'users'
                AND tc.constraint_type = 'FOREIGN KEY'
                AND kcu.column_name = 'assigned_project_id'
            """)

            if constraint_name:
                await conn.execute(f"ALTER TABLE users DROP CONSTRAINT IF EXISTS {constraint_name}")
                print(f"Dropped foreign key constraint {constraint_name}")

            # Also try the expected name
            await conn.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_assigned_project")

            # Drop column
            await conn.execute("ALTER TABLE users DROP COLUMN IF EXISTS assigned_project_id")
            print("Dropped assigned_project_id column")

            print("Rolled back assigned_project_id migration")
            return True

    except Exception as e:
        print(f"Rollback error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def check_status(pool: asyncpg.Pool) -> dict:
    """
    Check the current migration status.
    Returns a dict with migration status details.
    """
    status = {
        "column_exists": False,
        "fk_exists": False,
        "index_exists": False,
        "users_with_assigned_project": 0
    }

    try:
        async with pool.acquire() as conn:
            # Check column
            status["column_exists"] = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'users'
                    AND column_name = 'assigned_project_id'
                )
            """)

            # Check foreign key
            status["fk_exists"] = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                        ON tc.constraint_name = kcu.constraint_name
                    WHERE tc.table_name = 'users'
                    AND tc.constraint_type = 'FOREIGN KEY'
                    AND kcu.column_name = 'assigned_project_id'
                )
            """)

            # Check index
            status["index_exists"] = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_indexes
                    WHERE tablename = 'users'
                    AND indexname = 'idx_users_assigned_project_id'
                )
            """)

            # Count users with assigned project
            if status["column_exists"]:
                status["users_with_assigned_project"] = await conn.fetchval("""
                    SELECT COUNT(*)
                    FROM users
                    WHERE assigned_project_id IS NOT NULL
                """) or 0

    except Exception as e:
        print(f"Status check error: {e}")

    return status


if __name__ == "__main__":
    import asyncio

    async def main():
        # Parse command line arguments
        rollback = "--rollback" in sys.argv
        status_only = "--status" in sys.argv

        pool = await get_db_pool()
        try:
            if status_only:
                print("\n=== Migration Status ===")
                status = await check_status(pool)
                print(f"Column exists: {status['column_exists']}")
                print(f"Foreign key exists: {status['fk_exists']}")
                print(f"Index exists: {status['index_exists']}")
                print(f"Users with assigned project: {status['users_with_assigned_project']}")
                print("========================\n")
            elif rollback:
                print("\n=== Rolling back assigned_project_id migration ===")
                success = await rollback_migration(pool)
                if success:
                    print("Rollback completed successfully")
                else:
                    print("Rollback failed")
                    sys.exit(1)
            else:
                print("\n=== Running assigned_project_id migration ===")
                success = await run_migration(pool)
                if success:
                    print("Migration completed successfully")
                else:
                    print("Migration failed")
                    sys.exit(1)
        finally:
            await pool.close()

    asyncio.run(main())
