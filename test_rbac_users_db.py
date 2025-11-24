"""
Test RBAC users by querying the database directly and testing the endpoint.
"""

import asyncio
import asyncpg
import sys
from pathlib import Path

# Add python_backend directory to path
script_dir = Path(__file__).resolve().parent
python_backend_dir = script_dir / "python_backend"

if str(python_backend_dir) not in sys.path:
    sys.path.insert(0, str(python_backend_dir))

from src.database.connection import get_db_pool

async def test_users_query():
    """Test the users query that RBAC uses."""
    print("=" * 60)
    print("Testing RBAC Users Database Query")
    print("=" * 60)
    
    pool = None
    try:
        pool = await get_db_pool()
        
        async with pool.acquire() as conn:
            # Test the exact query used in auth_repo.get_users()
            print("\n1. Testing get_users() query...")
            query = """
                SELECT u.id, u.first_name, u.last_name, u.email, u.role_id, 
                       u.company_id, u.is_active, u.is_root, u.created_at, 
                       c.name as company_name,
                       r.role_name, r.display_name as role_display_name
                FROM users u
                LEFT JOIN companies c ON u.company_id = c.id
                LEFT JOIN roles r ON u.role_id = r.id
                ORDER BY u.first_name, u.last_name
            """
            
            try:
                rows = await conn.fetch(query)
                print(f"   ✅ Query executed successfully")
                print(f"   - Number of users: {len(rows)}")
                
                if len(rows) > 0:
                    print(f"\n   Sample users:")
                    for i, row in enumerate(rows[:5]):
                        user_dict = dict(row)
                        print(f"   {i+1}. {user_dict.get('email', 'N/A')}")
                        print(f"      - ID: {user_dict.get('id', 'N/A')}")
                        print(f"      - Name: {user_dict.get('first_name', '')} {user_dict.get('last_name', '')}")
                        print(f"      - Role ID: {user_dict.get('role_id', 'N/A')}")
                        print(f"      - Role Name: {user_dict.get('role_name', 'N/A')}")
                        print(f"      - Company ID: {user_dict.get('company_id', 'N/A')}")
                        print(f"      - Is Active: {user_dict.get('is_active', 'N/A')}")
                else:
                    print("   ⚠️  No users found in database")
                    
            except Exception as e:
                print(f"   ❌ Query failed: {e}")
                import traceback
                traceback.print_exc()
                return False
            
            # Test roles table structure
            print("\n2. Checking roles table structure...")
            roles_columns = await conn.fetch("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'roles'
                ORDER BY ordinal_position
            """)
            
            if roles_columns:
                print(f"   ✅ Roles table exists with columns:")
                for col in roles_columns:
                    print(f"      - {col['column_name']} ({col['data_type']})")
                
                column_names = [col['column_name'] for col in roles_columns]
                if 'role_name' in column_names:
                    print("   ✅ 'role_name' column exists")
                else:
                    print("   ❌ 'role_name' column does NOT exist!")
                    return False
            else:
                print("   ❌ Roles table does not exist!")
                return False
            
            # Test users with role_id
            print("\n3. Checking users with role_id...")
            users_with_role = await conn.fetchval("""
                SELECT COUNT(*) FROM users WHERE role_id IS NOT NULL
            """)
            users_without_role = await conn.fetchval("""
                SELECT COUNT(*) FROM users WHERE role_id IS NULL
            """)
            total_users = await conn.fetchval("SELECT COUNT(*) FROM users")
            
            print(f"   - Total users: {total_users}")
            print(f"   - Users with role_id: {users_with_role}")
            print(f"   - Users without role_id: {users_without_role}")
            
            # Test role lookups
            print("\n4. Testing role lookups...")
            if users_with_role > 0:
                sample_user = await conn.fetchrow("""
                    SELECT u.id, u.email, u.role_id, r.role_name, r.display_name
                    FROM users u
                    LEFT JOIN roles r ON u.role_id = r.id
                    WHERE u.role_id IS NOT NULL
                    LIMIT 1
                """)
                
                if sample_user:
                    print(f"   ✅ Sample user with role:")
                    print(f"      - Email: {sample_user['email']}")
                    print(f"      - Role ID: {sample_user['role_id']}")
                    print(f"      - Role Name: {sample_user['role_name']}")
                    print(f"      - Display Name: {sample_user['display_name']}")
                else:
                    print("   ⚠️  No users with valid role_id found")
            
            # Test invalid role_ids
            print("\n5. Checking for invalid role_ids...")
            invalid_role_ids = await conn.fetchval("""
                SELECT COUNT(*) FROM users 
                WHERE role_id IS NOT NULL 
                AND role_id NOT IN (SELECT id FROM roles)
            """)
            
            if invalid_role_ids > 0:
                print(f"   ⚠️  Found {invalid_role_ids} users with invalid role_id values")
            else:
                print("   ✅ All role_id values are valid")
            
            print("\n" + "=" * 60)
            print("✅ Database query test completed")
            print("=" * 60)
            return True
            
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        if pool:
            await pool.close()

if __name__ == "__main__":
    asyncio.run(test_users_query())

