"""
Migration script to create roles table and migrate user roles.
This migration:
1. Creates the roles table with standard roles
2. Adds role_id column to users table
3. Migrates existing text roles to role_id foreign keys
4. Maintains backward compatibility with text role field

Usage:
    # From python_backend directory:
    python -m src.database.migrations.create_roles_table
    
    # Or from project root:
    cd python_backend && python -m src.database.migrations.create_roles_table
"""

import asyncpg
import sys
from pathlib import Path
from typing import Optional, Dict, Any

# Add python_backend directory to path for imports
script_dir = Path(__file__).resolve().parent
python_backend_dir = script_dir.parent.parent.parent

if str(python_backend_dir) not in sys.path:
    sys.path.insert(0, str(python_backend_dir))

from src.database.connection import get_db_pool

# Standard roles as per specification
STANDARD_ROLES = [
    {"name": "admin", "display_name": "Admin", "description": "Company administrator with full access"},
    {"name": "office_manager", "display_name": "Office Manager", "description": "Office manager with administrative access"},
    {"name": "project_manager", "display_name": "Project Manager", "description": "Project manager with project oversight"},
    {"name": "client", "display_name": "Client", "description": "Client with view-only access"},
    {"name": "crew", "display_name": "Crew", "description": "Crew member with task access"},
    {"name": "subcontractor", "display_name": "Subcontractor", "description": "Subcontractor with assigned project access"},
]

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
}

async def run_migration(pool: asyncpg.Pool) -> bool:
    """
    Run migration to create roles table and migrate user roles.
    Returns True if migration was successful, False otherwise.
    """
    try:
        async with pool.acquire() as conn:
            # Start transaction
            async with conn.transaction():
                print("🚀 Starting roles table migration...")
                
                # Step 1: Check if roles table exists
                table_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT 1 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'roles'
                    )
                """)
                
                if not table_exists:
                    print("📋 Creating roles table...")
                    # Create roles table
                    # Note: company_id is varchar in the actual schema, not integer
                    await conn.execute("""
                        CREATE TABLE roles (
                            id SERIAL PRIMARY KEY,
                            company_id VARCHAR REFERENCES companies(id) ON DELETE CASCADE,
                            name VARCHAR(255) NOT NULL,
                            display_name VARCHAR(255) NOT NULL,
                            description TEXT,
                            is_active BOOLEAN DEFAULT TRUE,
                            created_at TIMESTAMP DEFAULT NOW(),
                            updated_at TIMESTAMP DEFAULT NOW(),
                            UNIQUE(company_id, name)
                        );
                        
                        CREATE INDEX IF NOT EXISTS idx_roles_company_id ON roles(company_id);
                        CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
                        CREATE INDEX IF NOT EXISTS idx_roles_active ON roles(is_active);
                    """)
                    print("✅ Created roles table")
                else:
                    print("ℹ️  Roles table already exists")
                
                # Step 2: Get or create a default company for roles
                # First, try to get the first company, or create a default one
                default_company_id = await conn.fetchval("""
                    SELECT id FROM companies ORDER BY created_at LIMIT 1
                """)
                
                if not default_company_id:
                    # Create a default company if none exists
                    print("📋 Creating default company for roles...")
                    default_company_id = await conn.fetchval("""
                        INSERT INTO companies (name, industry, is_active)
                        VALUES ('Default Company', 'construction', TRUE)
                        RETURNING id
                    """)
                    print(f"✅ Created default company with id: {default_company_id}")
                
                # Step 3: Insert standard roles for each company
                companies = await conn.fetch("SELECT id FROM companies")
                roles_created = 0
                
                for company in companies:
                    company_id = company['id']
                    print(f"📋 Creating roles for company {company_id}...")
                    
                    for role_data in STANDARD_ROLES:
                        # Check if role already exists
                        existing = await conn.fetchval("""
                            SELECT id FROM roles 
                            WHERE company_id = $1 AND name = $2
                        """, company_id, role_data["name"])
                        
                        if not existing:
                            await conn.execute("""
                                INSERT INTO roles (company_id, name, display_name, description, is_active)
                                VALUES ($1, $2, $3, $4, TRUE)
                            """, company_id, role_data["name"], role_data["display_name"], role_data["description"])
                            roles_created += 1
                            print(f"  ✅ Created role: {role_data['display_name']}")
                
                print(f"✅ Created {roles_created} roles across {len(companies)} companies")
                
                # Step 4: Add role_id column to users table if it doesn't exist
                column_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT 1 
                        FROM information_schema.columns 
                        WHERE table_name = 'users' 
                        AND column_name = 'role_id'
                    )
                """)
                
                if not column_exists:
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
                else:
                    print("ℹ️  role_id column already exists")
                
                # Step 5: Migrate existing role data
                print("📋 Migrating existing user roles to role_id...")
                
                # Get all users with roles
                users_with_roles = await conn.fetch("""
                    SELECT id, role, company_id 
                    FROM users 
                    WHERE role IS NOT NULL AND role != ''
                """)
                
                migrated_count = 0
                skipped_count = 0
                
                for user in users_with_roles:
                    user_id = user['id']
                    role_text = user['role'].strip().lower()
                    company_id = user['company_id']
                    
                    # Map role text to standard role name
                    mapped_role = ROLE_MAPPING.get(role_text, role_text)
                    
                    # Find the role_id for this role in the user's company
                    # If company_id is null, use the default company
                    target_company_id = company_id or default_company_id
                    
                    role_id = await conn.fetchval("""
                        SELECT id FROM roles 
                        WHERE company_id = $1 AND name = $2 AND is_active = TRUE
                        LIMIT 1
                    """, target_company_id, mapped_role)
                    
                    if role_id:
                        # Update user with role_id
                        await conn.execute("""
                            UPDATE users 
                            SET role_id = $1 
                            WHERE id = $2
                        """, role_id, user_id)
                        migrated_count += 1
                    else:
                        # If role doesn't exist, create it or use a default
                        print(f"  ⚠️  Role '{mapped_role}' not found for company {target_company_id}, creating...")
                        
                        # Create the role if it doesn't exist
                        new_role_id = await conn.fetchval("""
                            INSERT INTO roles (company_id, name, display_name, description, is_active)
                            VALUES ($1, $2, $3, $4, TRUE)
                            ON CONFLICT (company_id, name) DO UPDATE SET is_active = TRUE
                            RETURNING id
                        """, target_company_id, mapped_role, mapped_role.replace('_', ' ').title(), 
                             f"Role: {mapped_role}")
                        
                        if new_role_id:
                            await conn.execute("""
                                UPDATE users 
                                SET role_id = $1 
                                WHERE id = $2
                            """, new_role_id, user_id)
                            migrated_count += 1
                        else:
                            skipped_count += 1
                            print(f"  ⚠️  Could not create role for user {user_id}")
                
                print(f"✅ Migrated {migrated_count} users to role_id")
                if skipped_count > 0:
                    print(f"⚠️  Skipped {skipped_count} users (could not map role)")
                
                # Step 6: Verify migration
                users_with_role_id = await conn.fetchval("""
                    SELECT COUNT(*) FROM users WHERE role_id IS NOT NULL
                """)
                
                total_users = await conn.fetchval("""
                    SELECT COUNT(*) FROM users WHERE role IS NOT NULL AND role != ''
                """)
                
                print(f"\n📊 Migration Summary:")
                print(f"   - Total users with roles: {total_users}")
                print(f"   - Users migrated to role_id: {users_with_role_id}")
                print(f"   - Roles created: {roles_created}")
                
                if users_with_role_id == total_users:
                    print("✅ All users successfully migrated!")
                else:
                    print(f"⚠️  {total_users - users_with_role_id} users still need migration")
                
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
                await conn.execute("DROP INDEX IF EXISTS idx_roles_company_id")
                await conn.execute("DROP INDEX IF EXISTS idx_roles_name")
                await conn.execute("DROP INDEX IF EXISTS idx_roles_active")
                
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
                print("Next steps:")
                print("1. Update backend code to use role_id instead of role text")
                print("2. Test RBAC admin module")
                print("3. Verify all user role assignments")
            else:
                print("\n❌ Migration failed")
        finally:
            await pool.close()
    
    asyncio.run(main())

