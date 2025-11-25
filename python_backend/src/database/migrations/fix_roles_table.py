"""
Migration script to fix the roles table structure.
This migration:
1. Drops the existing roles table (if it exists)
2. Creates a new simple roles table with only: id, role_name, display_name
3. Adds unique constraint on role_name to prevent duplicates
4. Ensures users table has role_id foreign key to roles.id

Usage:
    # From python_backend directory:
    python -m src.database.migrations.fix_roles_table
    
    # Or from project root:
    cd python_backend && python -m src.database.migrations.fix_roles_table
"""

import asyncpg
import sys
from pathlib import Path

# Add python_backend directory to path for imports
script_dir = Path(__file__).resolve().parent
python_backend_dir = script_dir.parent.parent.parent

if str(python_backend_dir) not in sys.path:
    sys.path.insert(0, str(python_backend_dir))

from src.database.connection import get_db_pool

async def run_migration(pool: asyncpg.Pool) -> bool:
    """
    Run migration to fix roles table structure.
    Returns True if migration was successful, False otherwise.
    """
    try:
        async with pool.acquire() as conn:
            # Start transaction
            async with conn.transaction():
                print("🚀 Starting roles table fix migration...")
                
                # Step 1: Check if roles table exists
                table_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT 1 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'roles'
                    )
                """)
                
                if table_exists:
                    print("📋 Dropping existing roles table...")
                    # First, drop the foreign key constraint from users table if it exists
                    # Check if role_id column exists in users table
                    role_id_exists = await conn.fetchval("""
                        SELECT EXISTS (
                            SELECT 1 
                            FROM information_schema.columns 
                            WHERE table_name = 'users' 
                            AND column_name = 'role_id'
                        )
                    """)
                    
                    if role_id_exists:
                        print("📋 Dropping foreign key constraint from users.role_id...")
                        # Drop the foreign key constraint
                        await conn.execute("""
                            ALTER TABLE users 
                            DROP CONSTRAINT IF EXISTS users_role_id_fkey
                        """)
                        print("✅ Dropped foreign key constraint")
                    
                    # Drop indexes on roles table
                    await conn.execute("DROP INDEX IF EXISTS idx_roles_company_id")
                    await conn.execute("DROP INDEX IF EXISTS idx_roles_name")
                    await conn.execute("DROP INDEX IF EXISTS idx_roles_active")
                    
                    # Drop the roles table
                    await conn.execute("DROP TABLE IF EXISTS roles CASCADE")
                    print("✅ Dropped existing roles table")
                else:
                    print("ℹ️  Roles table does not exist, will create new one")
                
                # Step 2: Create new simple roles table
                print("📋 Creating new simple roles table...")
                await conn.execute("""
                    CREATE TABLE roles (
                        id SERIAL PRIMARY KEY,
                        role_name VARCHAR(255) NOT NULL UNIQUE,
                        display_name VARCHAR(255) NOT NULL
                    );
                """)
                print("✅ Created new roles table with columns: id, role_name, display_name")
                
                # Step 3: Ensure users table has role_id foreign key
                role_id_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT 1 
                        FROM information_schema.columns 
                        WHERE table_name = 'users' 
                        AND column_name = 'role_id'
                    )
                """)
                
                if not role_id_exists:
                    print("📋 Adding role_id column to users table...")
                    await conn.execute("""
                        ALTER TABLE users 
                        ADD COLUMN role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL
                    """)
                    print("✅ Added role_id column to users table")
                    
                    # Create index for performance
                    await conn.execute("""
                        CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id)
                    """)
                    print("✅ Created index on role_id")
                
                # Step 4: Insert standard roles (if they don't exist)
                print("📋 Inserting standard roles...")
                standard_roles = [
                    ("admin", "Admin"),
                    ("office_manager", "Office Manager"),
                    ("project_manager", "Project Manager"),
                    ("client", "Client"),
                    ("crew", "Crew"),
                    ("subcontractor", "Subcontractor"),
                ]
                
                roles_inserted = 0
                for role_name, display_name in standard_roles:
                    try:
                        await conn.execute("""
                            INSERT INTO roles (role_name, display_name)
                            VALUES ($1, $2)
                            ON CONFLICT (role_name) DO NOTHING
                        """, role_name, display_name)
                        roles_inserted += 1
                        print(f"  ✅ Inserted role: {display_name}")
                    except Exception as e:
                        print(f"  ⚠️  Could not insert role {role_name}: {e}")
                
                print(f"✅ Inserted {roles_inserted} standard roles")
                
                # Step 5: Clean up invalid role_id values in users table
                # Set any role_id values that don't exist in the new roles table to NULL
                if role_id_exists:
                    print("📋 Cleaning up invalid role_id values in users table...")
                    invalid_count = await conn.fetchval("""
                        SELECT COUNT(*) 
                        FROM users 
                        WHERE role_id IS NOT NULL 
                        AND role_id NOT IN (SELECT id FROM roles)
                    """)
                    
                    if invalid_count > 0:
                        await conn.execute("""
                            UPDATE users 
                            SET role_id = NULL 
                            WHERE role_id IS NOT NULL 
                            AND role_id NOT IN (SELECT id FROM roles)
                        """)
                        print(f"✅ Set {invalid_count} invalid role_id values to NULL")
                    else:
                        print("ℹ️  No invalid role_id values found")
                
                # Step 6: Now add the foreign key constraint if it doesn't exist
                if role_id_exists:
                    constraint_exists = await conn.fetchval("""
                        SELECT EXISTS (
                            SELECT 1 
                            FROM information_schema.table_constraints tc
                            JOIN information_schema.key_column_usage kcu 
                                ON tc.constraint_name = kcu.constraint_name
                            WHERE tc.table_name = 'users' 
                            AND kcu.column_name = 'role_id'
                            AND tc.constraint_type = 'FOREIGN KEY'
                        )
                    """)
                    
                    if not constraint_exists:
                        print("📋 Adding foreign key constraint to users.role_id...")
                        await conn.execute("""
                            ALTER TABLE users 
                            ADD CONSTRAINT users_role_id_fkey 
                            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
                        """)
                        print("✅ Added foreign key constraint")
                    else:
                        print("ℹ️  Foreign key constraint already exists")
                
                # Step 7: Verify migration
                role_count = await conn.fetchval("SELECT COUNT(*) FROM roles")
                users_with_roles = await conn.fetchval("""
                    SELECT COUNT(*) FROM users WHERE role_id IS NOT NULL
                """)
                print(f"\n📊 Migration Summary:")
                print(f"   - Roles in table: {role_count}")
                print(f"   - Users with role_id: {users_with_roles}")
                print(f"   - Table structure: id (SERIAL), role_name (VARCHAR UNIQUE), display_name (VARCHAR)")
                
                return True
                
    except Exception as e:
        print(f"❌ Migration error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def rollback_migration(pool: asyncpg.Pool) -> bool:
    """
    Rollback migration by removing role_id column and roles table.
    WARNING: This will remove the role_id field and all roles data.
    """
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                print("🔄 Rolling back roles migration...")
                
                # Drop role_id column
                await conn.execute("""
                    ALTER TABLE users DROP COLUMN IF EXISTS role_id
                """)
                print("✅ Removed role_id column from users table")
                
                # Drop indexes
                await conn.execute("DROP INDEX IF EXISTS idx_users_role_id")
                
                # Drop roles table
                await conn.execute("DROP TABLE IF EXISTS roles CASCADE")
                print("✅ Dropped roles table")
                
                print("✅ Rollback completed")
                return True
                
    except Exception as e:
        print(f"❌ Rollback error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    import asyncio
    
    async def main():
        pool = await get_db_pool()
        try:
            success = await run_migration(pool)
            if success:
                print("\n✅ Migration completed successfully!")
                print("The roles table now has only: id, role_name, display_name")
                print("Users table has role_id foreign key to roles.id")
            else:
                print("\n❌ Migration failed")
        finally:
            await pool.close()
    
    asyncio.run(main())

