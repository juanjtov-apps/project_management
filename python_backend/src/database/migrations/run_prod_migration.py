"""
Run production migration to sync PROD schema with DEV
Usage: python -m src.database.migrations.run_prod_migration
"""

import os
import asyncio
import asyncpg
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL_PROD = os.getenv("DATABASE_URL_PROD")

if not DATABASE_URL_PROD:
    raise ValueError("DATABASE_URL_PROD is required")


async def run_migration():
    """Run the production migration"""
    print("=" * 70)
    print("PRODUCTION DATABASE MIGRATION")
    print("=" * 70)

    # Confirm before proceeding
    print(f"\nTarget: PRODUCTION DATABASE")
    print("This will apply the following changes:")
    print("  1. Add users.assigned_project_id column")
    print("  2. Add foreign key constraint to projects table")
    print("  3. Create index on assigned_project_id")
    print("  4. Make projects.location nullable")
    print()

    confirm = input("Are you sure you want to proceed? (yes/no): ")
    if confirm.lower() != 'yes':
        print("Migration cancelled.")
        return

    print("\nConnecting to PROD database...")
    try:
        conn = await asyncpg.connect(DATABASE_URL_PROD, ssl='require')
        print("Connected to PROD database")
    except Exception as e:
        print(f"Failed to connect: {e}")
        return

    try:
        # Read and execute migration SQL
        migration_path = Path(__file__).parent / "sync_prod_with_dev.sql"

        if not migration_path.exists():
            print(f"Migration file not found: {migration_path}")
            return

        sql = migration_path.read_text()

        print("\nRunning migration...")
        print("-" * 70)

        # Execute the migration
        await conn.execute(sql)

        print("-" * 70)
        print("\nMigration completed successfully!")

        # Run verification
        print("\n" + "=" * 70)
        print("VERIFICATION")
        print("=" * 70)

        # Check column exists
        col_check = await conn.fetchval("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'assigned_project_id'
            )
        """)
        print(f"users.assigned_project_id column: {'OK' if col_check else 'MISSING'}")

        # Check FK exists
        fk_check = await conn.fetchval("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'fk_users_assigned_project'
            )
        """)
        print(f"fk_users_assigned_project constraint: {'OK' if fk_check else 'MISSING'}")

        # Check index exists
        idx_check = await conn.fetchval("""
            SELECT EXISTS (
                SELECT 1 FROM pg_indexes
                WHERE indexname = 'idx_users_assigned_project_id'
            )
        """)
        print(f"idx_users_assigned_project_id index: {'OK' if idx_check else 'MISSING'}")

        # Check location nullable
        loc_nullable = await conn.fetchval("""
            SELECT is_nullable FROM information_schema.columns
            WHERE table_name = 'projects' AND column_name = 'location'
        """)
        print(f"projects.location nullable: {'OK' if loc_nullable == 'YES' else 'NOT NULLABLE'}")

        all_ok = col_check and fk_check and idx_check and loc_nullable == 'YES'

        print("\n" + "=" * 70)
        if all_ok:
            print("ALL CHECKS PASSED - PROD is now synced with DEV")
        else:
            print("SOME CHECKS FAILED - Review the migration")
        print("=" * 70)

    except Exception as e:
        print(f"\nMigration failed: {e}")
        raise
    finally:
        await conn.close()
        print("\nConnection closed.")


if __name__ == "__main__":
    asyncio.run(run_migration())
