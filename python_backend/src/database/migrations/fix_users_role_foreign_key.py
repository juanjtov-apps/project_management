"""
Migration script to fix users table role foreign key.
This migration:
1. Ensures users.role_id column exists and is properly typed as INTEGER
2. Migrates existing text role values to integer role_id by joining with roles.name
3. Adds foreign key constraint from users.role_id to roles.id
4. Optionally removes the old text role column (commented out - uncomment if desired)

Usage:
    # From python_backend directory:
    python -m src.database.migrations.fix_users_role_foreign_key
    
    # Or from project root:
    cd python_backend && python -m src.database.migrations.fix_users_role_foreign_key
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

# Role name mapping for migration (handles legacy and variations)
ROLE_MAPPING = {
    "admin": "admin",
    "office_manager": "office_manager",
    "office manager": "office_manager",
    "project_manager": "project_manager",
    "project manager": "project_manager",
    "manager": "project_manager",  # Legacy
    "client": "client",
    "crew": "crew",
    "subcontractor": "subcontractor",
    "contractor": "subcontractor",  # Legacy
    "member": "crew",  # Common alternative
}

async def run_migration(pool: asyncpg.Pool) -> bool:
    """
    Run migration to fix users.role_id foreign key.
    Returns True if migration was successful, False otherwise.
    """
    try:
        async with pool.acquire() as conn:
            # Start transaction
            async with conn.transaction():
                print("🚀 Starting users role foreign key migration...")
                
                # Step 1: Verify roles table exists
                roles_table_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT 1 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'roles'
                    )
                """)
                
                if not roles_table_exists:
                    print("❌ ERROR: roles table does not exist!")
                    print("   Please ensure the roles table is created first.")
                    return False
                
                print("✅ Roles table exists")
                
                # Step 1.5: Check roles table structure
                roles_columns = await conn.fetch("""
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_name = 'roles'
                    ORDER BY ordinal_position
                """)
                roles_table_structure = {col['column_name']: col['data_type'] for col in roles_columns}
                roles_has_company_id = 'company_id' in roles_table_structure
                roles_has_name = 'name' in roles_table_structure
                roles_has_role_name = 'role_name' in roles_table_structure
                
                print(f"📋 Roles table structure: {', '.join(roles_table_structure.keys())}")
                if roles_has_company_id:
                    print("ℹ️  Roles table has company_id column")
                else:
                    print("ℹ️  Roles table does NOT have company_id column (using simple structure)")
                
                # Determine the name column to use
                role_name_column = 'role_name' if roles_has_role_name else 'name'
                print(f"ℹ️  Using '{role_name_column}' column for role names")
                
                # Step 2: Check current state of users table
                role_column_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT 1 
                        FROM information_schema.columns 
                        WHERE table_name = 'users' 
                        AND column_name = 'role'
                    )
                """)
                
                role_id_column_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT 1 
                        FROM information_schema.columns 
                        WHERE table_name = 'users' 
                        AND column_name = 'role_id'
                    )
                """)
                
                if role_column_exists:
                    role_column_type = await conn.fetchval("""
                        SELECT data_type 
                        FROM information_schema.columns 
                        WHERE table_name = 'users' 
                        AND column_name = 'role'
                    """)
                    print(f"ℹ️  users.role column exists (type: {role_column_type})")
                else:
                    print("ℹ️  users.role column does not exist")
                
                if role_id_column_exists:
                    role_id_column_type = await conn.fetchval("""
                        SELECT data_type 
                        FROM information_schema.columns 
                        WHERE table_name = 'users' 
                        AND column_name = 'role_id'
                    """)
                    print(f"ℹ️  users.role_id column exists (type: {role_id_column_type})")
                else:
                    print("ℹ️  users.role_id column does not exist, will create it")
                
                # Step 3: Drop any existing foreign key constraints on role_id
                print("📋 Checking for existing foreign key constraints...")
                fk_constraints = await conn.fetch("""
                    SELECT tc.constraint_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu 
                        ON tc.constraint_name = kcu.constraint_name
                    WHERE tc.table_name = 'users' 
                    AND kcu.column_name = 'role_id'
                    AND tc.constraint_type = 'FOREIGN KEY'
                """)
                
                for constraint in fk_constraints:
                    constraint_name = constraint['constraint_name']
                    print(f"📋 Dropping existing foreign key constraint: {constraint_name}")
                    await conn.execute(f"""
                        ALTER TABLE users 
                        DROP CONSTRAINT IF EXISTS {constraint_name}
                    """)
                    print(f"✅ Dropped constraint: {constraint_name}")
                
                # Step 4: Ensure role_id column exists and is INTEGER
                if not role_id_column_exists:
                    print("📋 Creating users.role_id column...")
                    await conn.execute("""
                        ALTER TABLE users 
                        ADD COLUMN role_id INTEGER
                    """)
                    print("✅ Created users.role_id column")
                else:
                    # Check if it's the right type
                    if role_id_column_type.upper() not in ('INTEGER', 'INT', 'BIGINT', 'SMALLINT'):
                        print(f"📋 Converting users.role_id from {role_id_column_type} to INTEGER...")
                        # Create temporary column
                        await conn.execute("""
                            ALTER TABLE users 
                            ADD COLUMN role_id_new INTEGER
                        """)
                        # Copy valid integer values
                        await conn.execute("""
                            UPDATE users 
                            SET role_id_new = role_id::INTEGER 
                            WHERE role_id IS NOT NULL 
                            AND role_id::text ~ '^[0-9]+$'
                        """)
                        # Drop old column
                        await conn.execute("""
                            ALTER TABLE users 
                            DROP COLUMN role_id
                        """)
                        # Rename new column
                        await conn.execute("""
                            ALTER TABLE users 
                            RENAME COLUMN role_id_new TO role_id
                        """)
                        print("✅ Converted users.role_id to INTEGER")
                    else:
                        print("✅ users.role_id is already INTEGER type")
                
                # Step 5: Migrate text role values to role_id
                if role_column_exists and role_column_type.upper() not in ('INTEGER', 'INT', 'BIGINT', 'SMALLINT'):
                    print("📋 Migrating text role values to role_id...")
                    
                    # Get all users with text role values
                    # Check if users table has company_id column
                    users_has_company_id = await conn.fetchval("""
                        SELECT EXISTS (
                            SELECT 1 
                            FROM information_schema.columns 
                            WHERE table_name = 'users' 
                            AND column_name = 'company_id'
                        )
                    """)
                    
                    if users_has_company_id:
                        users_with_roles = await conn.fetch("""
                            SELECT id, role, company_id
                            FROM users 
                            WHERE role IS NOT NULL AND role != ''
                            AND (role_id IS NULL OR role_id NOT IN (SELECT id FROM roles))
                        """)
                    else:
                        users_with_roles = await conn.fetch("""
                            SELECT id, role, NULL as company_id
                            FROM users 
                            WHERE role IS NOT NULL AND role != ''
                            AND (role_id IS NULL OR role_id NOT IN (SELECT id FROM roles))
                        """)
                    
                    migrated_count = 0
                    skipped_count = 0
                    
                    for user in users_with_roles:
                        user_id = user['id']
                        role_text = user['role'].strip().lower()
                        company_id = user.get('company_id')
                        
                        # Map role text to standard role name
                        mapped_role = ROLE_MAPPING.get(role_text, role_text)
                        
                        # Try to find role by name
                        role_id = None
                        
                        # Build query based on available columns
                        if roles_has_company_id and company_id:
                            # Try company-specific first, then global
                            if role_name_column == 'role_name':
                                role_id = await conn.fetchval("""
                                    SELECT id FROM roles 
                                    WHERE (company_id = $1 OR company_id IS NULL)
                                    AND LOWER(role_name) = LOWER($2)
                                    ORDER BY CASE WHEN company_id = $1 THEN 0 ELSE 1 END
                                    LIMIT 1
                                """, company_id, mapped_role)
                            else:
                                role_id = await conn.fetchval("""
                                    SELECT id FROM roles 
                                    WHERE (company_id = $1 OR company_id IS NULL)
                                    AND LOWER(name) = LOWER($2)
                                    ORDER BY CASE WHEN company_id = $1 THEN 0 ELSE 1 END
                                    LIMIT 1
                                """, company_id, mapped_role)
                        
                        if not role_id:
                            # Try without company_id (simple lookup by name)
                            if role_name_column == 'role_name':
                                role_id = await conn.fetchval("""
                                    SELECT id FROM roles 
                                    WHERE LOWER(role_name) = LOWER($1)
                                    LIMIT 1
                                """, mapped_role)
                            else:
                                role_id = await conn.fetchval("""
                                    SELECT id FROM roles 
                                    WHERE LOWER(name) = LOWER($1)
                                    LIMIT 1
                                """, mapped_role)
                        
                        if role_id:
                            # Update user with role_id
                            await conn.execute("""
                                UPDATE users 
                                SET role_id = $1 
                                WHERE id = $2
                            """, role_id, user_id)
                            migrated_count += 1
                        else:
                            skipped_count += 1
                            print(f"  ⚠️  Could not find role '{mapped_role}' for user {user_id}, leaving role_id as NULL")
                    
                    print(f"✅ Migrated {migrated_count} users to role_id")
                    if skipped_count > 0:
                        print(f"⚠️  Skipped {skipped_count} users (role not found in roles table)")
                else:
                    # If role column is already integer or doesn't exist, check if role_id needs population
                    print("📋 Checking if role_id values need to be set...")
                    users_without_role_id = await conn.fetchval("""
                        SELECT COUNT(*) 
                        FROM users 
                        WHERE role_id IS NULL
                    """)
                    
                    if users_without_role_id > 0:
                        print(f"ℹ️  Found {users_without_role_id} users without role_id")
                        # If role column exists and is integer, copy it
                        if role_column_exists and role_column_type.upper() in ('INTEGER', 'INT', 'BIGINT', 'SMALLINT'):
                            print("📋 Copying integer role values to role_id...")
                            await conn.execute("""
                                UPDATE users 
                                SET role_id = role::INTEGER 
                                WHERE role_id IS NULL 
                                AND role IS NOT NULL
                                AND role::text ~ '^[0-9]+$'
                                AND role::INTEGER IN (SELECT id FROM roles)
                            """)
                            print("✅ Copied integer role values to role_id")
                
                # Step 6: Clean up any invalid role_id values
                print("📋 Cleaning up invalid role_id values...")
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
                
                # Step 7: Add foreign key constraint
                print("📋 Adding foreign key constraint from users.role_id to roles.id...")
                await conn.execute("""
                    ALTER TABLE users 
                    ADD CONSTRAINT users_role_id_fkey 
                    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
                """)
                print("✅ Added foreign key constraint")
                
                # Step 8: Create index for performance
                print("📋 Creating index on users.role_id...")
                await conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id)
                """)
                print("✅ Created index on role_id")
                
                # Step 9: Optional - Drop old text role column
                # UNCOMMENT THE FOLLOWING BLOCK IF YOU WANT TO REMOVE THE TEXT ROLE COLUMN
                # WARNING: This will permanently remove the text role column
                # Make sure all application code has been updated to use role_id first!
                #
                # if role_column_exists and role_column_type.upper() not in ('INTEGER', 'INT', 'BIGINT', 'SMALLINT'):
                #     print("📋 Dropping old text role column...")
                #     await conn.execute("""
                #         ALTER TABLE users 
                #         DROP COLUMN role
                #     """)
                #     print("✅ Dropped old text role column")
                
                # Step 10: Verify migration
                total_users = await conn.fetchval("SELECT COUNT(*) FROM users")
                users_with_role_id = await conn.fetchval("""
                    SELECT COUNT(*) FROM users WHERE role_id IS NOT NULL
                """)
                users_without_role_id = total_users - users_with_role_id
                
                print(f"\n📊 Migration Summary:")
                print(f"   - Total users: {total_users}")
                print(f"   - Users with role_id: {users_with_role_id}")
                print(f"   - Users without role_id: {users_without_role_id}")
                
                if users_without_role_id > 0:
                    print(f"⚠️  Warning: {users_without_role_id} users do not have a role_id assigned")
                    print("   These users may need manual role assignment")
                
                return True
                
    except Exception as e:
        print(f"❌ Migration error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def rollback_migration(pool: asyncpg.Pool) -> bool:
    """
    Rollback migration by removing foreign key constraint and role_id column.
    WARNING: This will remove the role_id field.
    """
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                print("🔄 Rolling back users role foreign key migration...")
                
                # Drop foreign key constraint
                await conn.execute("""
                    ALTER TABLE users 
                    DROP CONSTRAINT IF EXISTS users_role_id_fkey
                """)
                print("✅ Dropped foreign key constraint")
                
                # Drop index
                await conn.execute("DROP INDEX IF EXISTS idx_users_role_id")
                
                # Note: We don't drop the role_id column in rollback
                # as it might contain data that should be preserved
                print("ℹ️  role_id column preserved (not dropped)")
                
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
                print("Users.role_id now references roles.id via foreign key")
                print("\nNext steps:")
                print("1. Update application code to use role_id instead of text role")
                print("2. Test all user role operations")
                print("3. Once verified, uncomment the code in Step 9 to drop the old text role column")
            else:
                print("\n❌ Migration failed")
        finally:
            await pool.close()
    
    asyncio.run(main())

