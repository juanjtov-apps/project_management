"""
Migration script to drop the old text role column from users table.
ONLY run this after verifying that all application code uses role_id.

This migration:
1. Drops the users.role text column (if it exists and is not INTEGER)
2. Verifies that all users have role_id set

Usage:
    # From python_backend directory:
    python -m src.database.migrations.drop_text_role_column
    
    # Or from project root:
    cd python_backend && python -m src.database.migrations.drop_text_role_column
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
    Run migration to drop old text role column.
    Returns True if migration was successful, False otherwise.
    """
    try:
        async with pool.acquire() as conn:
            # Start transaction
            async with conn.transaction():
                print("🚀 Starting drop text role column migration...")
                
                # Step 1: Check if role column exists
                role_column_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT 1 
                        FROM information_schema.columns 
                        WHERE table_name = 'users' 
                        AND column_name = 'role'
                    )
                """)
                
                if not role_column_exists:
                    print("ℹ️  users.role column does not exist - nothing to drop")
                    return True
                
                # Step 2: Check column type
                role_column_type = await conn.fetchval("""
                    SELECT data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' 
                    AND column_name = 'role'
                """)
                
                print(f"ℹ️  users.role column exists (type: {role_column_type})")
                
                # Only drop if it's not INTEGER (if it's INTEGER, it might be the role_id column with wrong name)
                if role_column_type.upper() in ('INTEGER', 'INT', 'BIGINT', 'SMALLINT'):
                    print("⚠️  WARNING: users.role is INTEGER type!")
                    print("   This might be the role_id column with a different name.")
                    print("   Aborting to prevent data loss.")
                    return False
                
                # Step 3: Verify all users have role_id
                print("📋 Verifying all users have role_id...")
                total_users = await conn.fetchval("SELECT COUNT(*) FROM users")
                users_with_role_id = await conn.fetchval("""
                    SELECT COUNT(*) FROM users WHERE role_id IS NOT NULL
                """)
                users_without_role_id = total_users - users_with_role_id
                
                print(f"   Total users: {total_users}")
                print(f"   Users with role_id: {users_with_role_id}")
                print(f"   Users without role_id: {users_without_role_id}")
                
                if users_without_role_id > 0:
                    print(f"\n⚠️  WARNING: {users_without_role_id} users do not have role_id!")
                    print("   Please assign roles to these users before dropping the text role column.")
                    response = input("   Continue anyway? (yes/no): ")
                    if response.lower() != 'yes':
                        print("   Aborting migration")
                        return False
                
                # Step 4: Verify role_id values are valid
                print("\n📋 Verifying role_id values are valid...")
                invalid_count = await conn.fetchval("""
                    SELECT COUNT(*) 
                    FROM users 
                    WHERE role_id IS NOT NULL 
                    AND role_id NOT IN (SELECT id FROM roles)
                """)
                
                if invalid_count > 0:
                    print(f"⚠️  WARNING: {invalid_count} users have invalid role_id values!")
                    response = input("   Continue anyway? (yes/no): ")
                    if response.lower() != 'yes':
                        print("   Aborting migration")
                        return False
                else:
                    print("   ✅ All role_id values are valid")
                
                # Step 5: Drop the text role column
                print("\n📋 Dropping users.role text column...")
                await conn.execute("""
                    ALTER TABLE users 
                    DROP COLUMN role
                """)
                print("✅ Dropped users.role column")
                
                # Step 6: Verify column is dropped
                role_column_still_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT 1 
                        FROM information_schema.columns 
                        WHERE table_name = 'users' 
                        AND column_name = 'role'
                    )
                """)
                
                if role_column_still_exists:
                    print("❌ ERROR: Column still exists after drop operation")
                    return False
                else:
                    print("✅ Verified: users.role column has been removed")
                
                print(f"\n📊 Migration Summary:")
                print(f"   - Dropped users.role text column")
                print(f"   - All users now use role_id foreign key")
                
                return True
                
    except Exception as e:
        print(f"❌ Migration error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    import asyncio
    
    async def main():
        pool = await get_db_pool()
        try:
            print("⚠️  WARNING: This will permanently remove the users.role text column!")
            print("   Make sure:")
            print("   1. All application code uses role_id")
            print("   2. All users have valid role_id values")
            print("   3. You have a database backup")
            print()
            response = input("Continue? (yes/no): ")
            if response.lower() != 'yes':
                print("Aborted")
                return
            
            success = await run_migration(pool)
            if success:
                print("\n✅ Migration completed successfully!")
                print("The users.role text column has been removed.")
            else:
                print("\n❌ Migration failed")
        finally:
            await pool.close()
    
    asyncio.run(main())

