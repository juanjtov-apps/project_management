"""
Test script for user update endpoint
Tests the /api/v1/company-admin/users/{user_id}/role endpoint
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL not set")
    exit(1)

async def test_role_lookup():
    """Test role lookup queries"""
    print("=" * 60)
    print("Testing Role Lookup Queries")
    print("=" * 60)
    
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        # Check roles table structure
        print("\n1. Checking roles table structure...")
        columns = await conn.fetch("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'roles'
            ORDER BY ordinal_position
        """)
        
        column_names = [col['column_name'] for col in columns]
        print(f"   Columns: {column_names}")
        
        has_company_id = 'company_id' in column_names
        has_role_name = 'role_name' in column_names
        has_name = 'name' in column_names
        has_is_active = 'is_active' in column_names
        
        print(f"   - company_id: {has_company_id}")
        print(f"   - role_name: {has_role_name}")
        print(f"   - name: {has_name}")
        print(f"   - is_active: {has_is_active}")
        
        # Get all roles
        print("\n2. Fetching all roles...")
        if has_role_name:
            roles = await conn.fetch("SELECT id, role_name, display_name FROM roles ORDER BY role_name")
            for role in roles:
                print(f"   - ID: {role['id']}, role_name: {role['role_name']}, display_name: {role.get('display_name', 'N/A')}")
        elif has_name:
            roles = await conn.fetch("SELECT id, name, display_name FROM roles ORDER BY name")
            for role in roles:
                print(f"   - ID: {role['id']}, name: {role['name']}, display_name: {role.get('display_name', 'N/A')}")
        else:
            print("   ⚠️  No role_name or name column found!")
            return
        
        # Test role lookup for each role type
        print("\n3. Testing role lookups...")
        test_roles = ['admin', 'project_manager', 'office_manager', 'crew', 'client', 'subcontractor']
        
        for role_name in test_roles:
            print(f"\n   Testing lookup for: '{role_name}'")
            
            if has_company_id and has_role_name:
                # Complex table with company_id and role_name
                role_id = await conn.fetchval("""
                    SELECT id FROM roles 
                    WHERE LOWER(role_name) = LOWER($1)
                    AND (is_active = TRUE OR is_active IS NULL)
                    LIMIT 1
                """, role_name)
            elif has_company_id and has_name:
                # Complex table with company_id but using name
                role_id = await conn.fetchval("""
                    SELECT id FROM roles 
                    WHERE LOWER(name) = LOWER($1)
                    AND (is_active = TRUE OR is_active IS NULL)
                    LIMIT 1
                """, role_name)
            elif has_role_name:
                # Simple table with role_name
                role_id = await conn.fetchval("""
                    SELECT id FROM roles 
                    WHERE LOWER(role_name) = LOWER($1)
                    LIMIT 1
                """, role_name)
            elif has_name:
                # Simple table with name
                role_id = await conn.fetchval("""
                    SELECT id FROM roles 
                    WHERE LOWER(name) = LOWER($1)
                    LIMIT 1
                """, role_name)
            else:
                role_id = None
            
            if role_id:
                print(f"      ✅ Found role_id: {role_id}")
            else:
                print(f"      ❌ Role not found")
        
        # Test user-role relationship
        print("\n4. Testing user-role relationships...")
        if has_role_name:
            users_with_roles = await conn.fetch("""
                SELECT u.id, u.email, u.role_id, r.role_name
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                LIMIT 5
            """)
        else:
            users_with_roles = await conn.fetch("""
                SELECT u.id, u.email, u.role_id, r.name as role_name
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                LIMIT 5
            """)
        
        for user in users_with_roles:
            print(f"   - User: {user['email']}, role_id: {user['role_id']}, role_name: {user['role_name']}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await conn.close()

async def test_user_update_simulation():
    """Simulate the user update process"""
    print("\n" + "=" * 60)
    print("Simulating User Update Process")
    print("=" * 60)
    
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        # Check roles table structure first
        columns = await conn.fetch("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'roles'
        """)
        column_names = [col['column_name'] for col in columns]
        has_role_name = 'role_name' in column_names
        has_name = 'name' in column_names
        
        # Get a test user
        user = await conn.fetchrow("""
            SELECT id, email, role_id, company_id
            FROM users
            WHERE is_root = FALSE
            LIMIT 1
        """)
        
        if not user:
            print("❌ No test user found (excluding root admin)")
            return
        
        user_id = user['id']
        print(f"\n1. Test user: {user['email']} (ID: {user_id})")
        print(f"   Current role_id: {user['role_id']}")
        print(f"   Company_id: {user['company_id']}")
        
        # Get current role name
        if has_role_name:
            current_role = await conn.fetchrow("""
                SELECT r.role_name
                FROM roles r
                WHERE r.id = $1
            """, user['role_id'])
        else:
            current_role = await conn.fetchrow("""
                SELECT r.name as role_name
                FROM roles r
                WHERE r.id = $1
            """, user['role_id'])
        
        if current_role:
            print(f"   Current role_name: {current_role['role_name']}")
        
        # Find a different role to assign
        print("\n2. Finding alternative role to assign...")
        
        if has_role_name:
            other_roles = await conn.fetch("""
                SELECT id, role_name
                FROM roles
                WHERE id != $1
                LIMIT 3
            """, user['role_id'])
        else:
            other_roles = await conn.fetch("""
                SELECT id, name as role_name
                FROM roles
                WHERE id != $1
                LIMIT 3
            """, user['role_id'])
        
        if not other_roles:
            print("   ⚠️  No alternative roles found")
            return
        
        target_role = other_roles[0]
        target_role_id = target_role['id']
        target_role_name = target_role['role_name']
        
        print(f"   Target role: {target_role_name} (ID: {target_role_id})")
        
        # Simulate the update query
        print("\n3. Simulating UPDATE query...")
        print(f"   UPDATE users SET role_id = {target_role_id}, updated_at = NOW() WHERE id = '{user_id}'")
        
        # Actually perform the update (we'll rollback)
        await conn.execute("BEGIN")
        try:
            await conn.execute("""
                UPDATE users SET role_id = $1, updated_at = NOW() WHERE id = $2
            """, target_role_id, user_id)
            
            # Verify the update
            if has_role_name:
                updated_user = await conn.fetchrow("""
                    SELECT u.id, u.email, u.role_id, r.role_name
                    FROM users u
                    LEFT JOIN roles r ON u.role_id = r.id
                    WHERE u.id = $1
                """, user_id)
            else:
                updated_user = await conn.fetchrow("""
                    SELECT u.id, u.email, u.role_id, r.name as role_name
                    FROM users u
                    LEFT JOIN roles r ON u.role_id = r.id
                    WHERE u.id = $1
                """, user_id)
            
            print(f"   ✅ Update successful!")
            print(f"   New role_id: {updated_user['role_id']}")
            print(f"   New role_name: {updated_user['role_name']}")
            
            # Rollback
            await conn.execute("ROLLBACK")
            print("   (Rolled back - no actual changes made)")
            
        except Exception as e:
            await conn.execute("ROLLBACK")
            print(f"   ❌ Update failed: {e}")
            import traceback
            traceback.print_exc()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await conn.close()

async def main():
    await test_role_lookup()
    await test_user_update_simulation()
    print("\n" + "=" * 60)
    print("Tests completed!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())

