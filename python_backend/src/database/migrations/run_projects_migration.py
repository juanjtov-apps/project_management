#!/usr/bin/env python3
"""
Migration script: Make location field nullable in projects table
Run from python_backend directory: python3 src/database/migrations/run_migration.py
"""
import asyncio
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from database.connection import get_db_pool

async def run_migration():
    """Apply migration to make projects.location nullable"""
    print("Applying migration: ALTER TABLE projects ALTER COLUMN location DROP NOT NULL")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Check current state
        result = await conn.fetchrow("""
            SELECT is_nullable
            FROM information_schema.columns
            WHERE table_name = 'projects' AND column_name = 'location'
        """)

        if result and result['is_nullable'] == 'YES':
            print("✅ Column 'location' is already nullable. No changes needed.")
            return

        # Apply migration
        await conn.execute('ALTER TABLE projects ALTER COLUMN location DROP NOT NULL')
        print("✅ Migration applied successfully: location is now nullable")

if __name__ == "__main__":
    asyncio.run(run_migration())
