#!/usr/bin/env python3
"""
Seed Production Database with Project Stage Templates

This script runs the seed_production_templates.sql migration against the production database.
It reads the DATABASE_URL_PROD environment variable for the connection string.

Usage:
    # Set the production database URL
    export DATABASE_URL_PROD="postgresql://user:password@host:port/database"

    # Run the script
    python scripts/seed_production_db.py

    # Or run with inline environment variable
    DATABASE_URL_PROD="..." python scripts/seed_production_db.py
"""

import os
import sys
import asyncio
from pathlib import Path

try:
    import asyncpg
except ImportError:
    print("Error: asyncpg is not installed. Run: pip install asyncpg")
    sys.exit(1)


# Path to the SQL migration file
MIGRATION_FILE = Path(__file__).parent.parent / "src" / "database" / "migrations" / "seed_production_templates.sql"


async def get_connection_params(database_url: str) -> dict:
    """Parse DATABASE_URL into connection parameters."""
    # Handle both postgres:// and postgresql:// prefixes
    url = database_url.replace("postgres://", "postgresql://")

    # Parse the URL
    from urllib.parse import urlparse, parse_qs
    parsed = urlparse(url)

    params = {
        "user": parsed.username,
        "password": parsed.password,
        "host": parsed.hostname,
        "port": parsed.port or 5432,
        "database": parsed.path.lstrip("/"),
    }

    # Check for SSL parameters
    query_params = parse_qs(parsed.query)
    if "sslmode" in query_params:
        sslmode = query_params["sslmode"][0]
        if sslmode in ("require", "verify-ca", "verify-full"):
            params["ssl"] = "require"

    return params


async def run_migration():
    """Run the SQL migration against the production database."""

    # Get production database URL
    database_url = os.environ.get("DATABASE_URL_PROD")

    if not database_url:
        print("Error: DATABASE_URL_PROD environment variable is not set.")
        print("\nUsage:")
        print('  export DATABASE_URL_PROD="postgresql://user:password@host:port/database"')
        print("  python scripts/seed_production_db.py")
        sys.exit(1)

    # Verify migration file exists
    if not MIGRATION_FILE.exists():
        print(f"Error: Migration file not found: {MIGRATION_FILE}")
        sys.exit(1)

    # Read the SQL migration
    print(f"Reading migration file: {MIGRATION_FILE}")
    sql_content = MIGRATION_FILE.read_text()

    # Parse connection parameters
    conn_params = await get_connection_params(database_url)

    # Mask password for display
    display_host = f"{conn_params['host']}:{conn_params['port']}/{conn_params['database']}"
    print(f"Connecting to: {display_host}")

    try:
        # Connect to the database
        conn = await asyncpg.connect(**conn_params)
        print("Connected successfully!")

        # Check current template count before migration
        before_count = await conn.fetchval(
            "SELECT COUNT(*) FROM client_portal.stage_templates"
        )
        print(f"Templates before migration: {before_count}")

        # Execute the migration
        print("Running migration...")
        await conn.execute(sql_content)
        print("Migration completed successfully!")

        # Verify results
        print("\n--- Verification ---")

        # Check template count after
        after_count = await conn.fetchval(
            "SELECT COUNT(*) FROM client_portal.stage_templates"
        )
        print(f"Templates after migration: {after_count}")

        # List all templates with stage counts
        templates = await conn.fetch("""
            SELECT st.name, st.category, COUNT(sti.id) as stage_count
            FROM client_portal.stage_templates st
            LEFT JOIN client_portal.stage_template_items sti ON st.id = sti.template_id
            GROUP BY st.name, st.category
            ORDER BY st.name
        """)

        print("\nTemplates and stage counts:")
        print("-" * 50)
        for row in templates:
            print(f"  {row['name']}: {row['stage_count']} stages ({row['category']})")

        # Check material templates count
        material_count = await conn.fetchval(
            "SELECT COUNT(*) FROM client_portal.material_templates"
        )
        print(f"\nTotal material templates: {material_count}")

        # Check alembic version
        version = await conn.fetchval(
            "SELECT version_num FROM client_portal.alembic_version WHERE version_num = 'seed_production_templates_001'"
        )
        if version:
            print(f"Migration version recorded: {version}")

        await conn.close()
        print("\n--- Migration Complete ---")

    except asyncpg.PostgresError as e:
        print(f"\nDatabase error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    print("=" * 60)
    print("Seed Production Database with Project Stage Templates")
    print("=" * 60)
    print()

    asyncio.run(run_migration())
