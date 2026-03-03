"""
Production Migration Runner for Proesphere

Applies all pending migrations to the database in order.
Uses idempotent SQL (IF NOT EXISTS) so safe to re-run.

Usage:
    cd python_backend
    NODE_ENV=production python -m src.database.migrations.run_all_migrations

Prerequisites:
    - DATABASE_URL_PROD environment variable set
    - Python 3.9+ with asyncpg installed
"""
import asyncio
import os
import sys
from pathlib import Path

# Add python_backend to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from src.database.connection import get_db_pool

# Migrations to apply in order
# All migrations use IF NOT EXISTS / ON CONFLICT DO NOTHING for idempotency
MIGRATIONS = [
    # Core client portal schema additions
    "add_material_areas.sql",
    "add_notifications_system.sql",
    "add_payment_system.sql",
    "add_project_stages.sql",
    "add_material_templates.sql",

    # Public schema sync
    "sync_prod_with_dev.sql",

    # Feature additions
    "add_issue_resolution_fields.sql",
    "add_notification_types.sql",
    "add_issue_audit_log.sql",
    "add_installment_paid_notification.sql",

    # Fixes and constraints
    "fix_all_notification_constraints.sql",
    "add_material_order_status.sql",
    "add_material_documents.sql",

    # Seed data
    "seed_production_templates.sql",
]


async def check_migration_applied(conn, version: str) -> bool:
    """Check if a migration version has been applied."""
    try:
        row = await conn.fetchrow(
            "SELECT 1 FROM client_portal.alembic_version WHERE version_num = $1",
            version
        )
        return row is not None
    except Exception:
        # Table might not exist yet
        return False


async def run_migrations(dry_run: bool = False):
    """Run all pending migrations in order."""
    print("=" * 60)
    print("  Proesphere Database Migration Runner")
    print("=" * 60)
    print()

    # Check environment
    node_env = os.getenv("NODE_ENV", "development")
    print(f"Environment: {node_env}")

    if node_env == "production":
        db_url = os.getenv("DATABASE_URL_PROD")
        if not db_url:
            print("ERROR: DATABASE_URL_PROD not set for production")
            return False
        print("Target: Production Database")
    else:
        db_url = os.getenv("DATABASE_URL_DEV")
        if not db_url:
            print("WARNING: DATABASE_URL_DEV not set, using DATABASE_URL")
        print("Target: Development Database")

    print()

    if dry_run:
        print("DRY RUN - No changes will be made")
        print()

    pool = await get_db_pool()
    migrations_dir = Path(__file__).parent

    success_count = 0
    skip_count = 0
    error_count = 0

    async with pool.acquire() as conn:
        for migration_file in MIGRATIONS:
            migration_path = migrations_dir / migration_file

            if not migration_path.exists():
                print(f"  SKIP: {migration_file} (file not found)")
                skip_count += 1
                continue

            # Read migration SQL
            sql = migration_path.read_text()

            print(f"  Running: {migration_file}...", end=" ")

            if dry_run:
                print("(dry run)")
                continue

            try:
                # Execute migration
                await conn.execute(sql)
                print("OK")
                success_count += 1
            except Exception as e:
                error_str = str(e).lower()
                if "already exists" in error_str or "duplicate" in error_str:
                    print("SKIP (already applied)")
                    skip_count += 1
                else:
                    print(f"ERROR: {e}")
                    error_count += 1
                    # Continue with other migrations unless critical

    print()
    print("=" * 60)
    print(f"  Results: {success_count} applied, {skip_count} skipped, {error_count} errors")
    print("=" * 60)

    if error_count > 0:
        print()
        print("WARNING: Some migrations failed. Review errors above.")
        return False

    print()
    print("All migrations completed successfully!")
    return True


async def verify_schema():
    """Verify expected tables exist after migration."""
    print()
    print("Verifying schema...")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Check client_portal tables
        tables = await conn.fetch("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'client_portal'
            ORDER BY table_name
        """)

        expected_tables = [
            "alembic_version",
            "forum_attachments",
            "forum_messages",
            "forum_threads",
            "invoices",
            "issue_attachments",
            "issue_audit_log",
            "issue_comments",
            "issues",
            "material_areas",
            "material_items",
            "material_templates",
            "payment_documents",
            "payment_events",
            "payment_installments",
            "payment_receipts",
            "payment_schedules",
            "pm_notification_prefs",
            "pm_notifications",
            "project_stages",
            "stage_template_items",
            "stage_templates",
        ]

        actual_tables = [t["table_name"] for t in tables]

        print(f"  Found {len(actual_tables)} tables in client_portal schema")

        missing = set(expected_tables) - set(actual_tables)
        if missing:
            print(f"  WARNING: Missing tables: {', '.join(sorted(missing))}")
            return False

        # Check users.assigned_project_id
        col_check = await conn.fetchrow("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'assigned_project_id'
        """)

        if col_check:
            print("  users.assigned_project_id: OK")
        else:
            print("  WARNING: users.assigned_project_id column missing")
            return False

        # Check issues resolution fields
        resolution_cols = await conn.fetch("""
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'client_portal'
            AND table_name = 'issues'
            AND column_name IN ('resolved_by', 'resolved_at')
        """)

        if len(resolution_cols) == 2:
            print("  issues.resolved_by/resolved_at: OK")
        else:
            print("  WARNING: Issue resolution columns missing")
            return False

    print()
    print("Schema verification passed!")
    return True


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Run Proesphere database migrations")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without making changes")
    parser.add_argument("--verify-only", action="store_true", help="Only verify schema, don't run migrations")
    args = parser.parse_args()

    async def main():
        if args.verify_only:
            success = await verify_schema()
        else:
            success = await run_migrations(dry_run=args.dry_run)
            if success and not args.dry_run:
                await verify_schema()

        return success

    success = asyncio.run(main())
    sys.exit(0 if success else 1)
