"""
Test script to verify role migration and role_id usage.
Run this after the migration to ensure everything works correctly.
"""

import asyncio
import asyncpg
import sys
from pathlib import Path

# Add python_backend directory to path
script_dir = Path(__file__).resolve().parent
python_backend_dir = script_dir

if str(python_backend_dir) not in sys.path:
    sys.path.insert(0, str(python_backend_dir))

from src.database.connection import get_db_pool

async def test_role_migration(pool):
    """Test that role migration worked correctly."""
    try:
        async with pool.acquire() as conn:
            print("🧪 Testing Role Migration\n")
            
            # Check roles table structure first
            roles_columns = await conn.fetch("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'roles'
                ORDER BY ordinal_position
            """)
            roles_column_names = [col['column_name'] for col in roles_columns]
            roles_has_name = 'name' in roles_column_names
            roles_has_role_name = 'role_name' in roles_column_names
            
            # Determine which column to use
            role_name_column = 'role_name' if roles_has_role_name else 'name'
            print(f"ℹ️  Roles table columns: {', '.join(roles_column_names)}")
            print(f"ℹ️  Using '{role_name_column}' for role names\n")
            
            # Test 1: Verify roles table exists and has data
            print("Test 1: Verify roles table")
            role_count = await conn.fetchval("SELECT COUNT(*) FROM roles")
            print(f"   ✅ Roles table has {role_count} roles")
            
            # Build query based on available columns
            if roles_has_name and roles_has_role_name:
                roles_query = "SELECT id, name, role_name FROM roles LIMIT 10"
            elif roles_has_role_name:
                roles_query = "SELECT id, role_name FROM roles LIMIT 10"
            else:
                roles_query = "SELECT id, name FROM roles LIMIT 10"
            
            roles = await conn.fetch(roles_query)
            print(f"   Sample roles:")
            for role in roles:
                role_name = role.get('name') or role.get('role_name', 'N/A')
                print(f"      - ID: {role['id']}, Name: {role_name}")
            
            # Test 2: Verify users.role_id column exists
            print("\nTest 2: Verify users.role_id column")
            role_id_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'role_id'
                )
            """)
            if role_id_exists:
                print("   ✅ users.role_id column exists")
            else:
                print("   ❌ users.role_id column does NOT exist")
                return False
            
            # Test 3: Verify foreign key constraint
            print("\nTest 3: Verify foreign key constraint")
            fk_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu 
                        ON tc.constraint_name = kcu.constraint_name
                    WHERE tc.table_name = 'users' 
                    AND kcu.column_name = 'role_id'
                    AND tc.constraint_type = 'FOREIGN KEY'
                )
            """)
            if fk_exists:
                print("   ✅ Foreign key constraint exists")
            else:
                print("   ❌ Foreign key constraint does NOT exist")
                return False
            
            # Test 4: Check users with role_id
            print("\nTest 4: Check user role assignments")
            total_users = await conn.fetchval("SELECT COUNT(*) FROM users")
            users_with_role_id = await conn.fetchval("""
                SELECT COUNT(*) FROM users WHERE role_id IS NOT NULL
            """)
            users_without_role_id = total_users - users_with_role_id
            
            print(f"   Total users: {total_users}")
            print(f"   Users with role_id: {users_with_role_id}")
            print(f"   Users without role_id: {users_without_role_id}")
            
            if users_without_role_id > 0:
                print(f"   ⚠️  Warning: {users_without_role_id} users don't have role_id")
            
            # Test 5: Verify role_id values are valid
            print("\nTest 5: Verify role_id values are valid")
            invalid_role_ids = await conn.fetchval("""
                SELECT COUNT(*) FROM users 
                WHERE role_id IS NOT NULL 
                AND role_id NOT IN (SELECT id FROM roles)
            """)
            
            if invalid_role_ids == 0:
                print("   ✅ All role_id values are valid")
            else:
                print(f"   ❌ {invalid_role_ids} users have invalid role_id values")
                return False
            
            # Test 6: Test role lookup queries
            print("\nTest 6: Test role lookup queries")
            # Build query based on available columns
            if roles_has_name and roles_has_role_name:
                test_users_query = """
                    SELECT u.id, u.email, u.role_id,
                           COALESCE(r.name, r.role_name) as role_name
                    FROM users u
                    LEFT JOIN roles r ON u.role_id = r.id
                    WHERE u.role_id IS NOT NULL
                    LIMIT 5
                """
            elif roles_has_role_name:
                test_users_query = """
                    SELECT u.id, u.email, u.role_id,
                           r.role_name as role_name
                    FROM users u
                    LEFT JOIN roles r ON u.role_id = r.id
                    WHERE u.role_id IS NOT NULL
                    LIMIT 5
                """
            else:
                test_users_query = """
                    SELECT u.id, u.email, u.role_id,
                           r.name as role_name
                    FROM users u
                    LEFT JOIN roles r ON u.role_id = r.id
                    WHERE u.role_id IS NOT NULL
                    LIMIT 5
                """
            
            test_users = await conn.fetch(test_users_query)
            
            print(f"   Sample users with roles:")
            for user in test_users:
                print(f"      - {user['email']}: role_id={user['role_id']}, role_name={user['role_name']}")
            
            # Test 7: Test role assignment (lookup by name)
            print("\nTest 7: Test role name to ID lookup")
            test_roles = ['admin', 'crew', 'project_manager', 'client']
            for role_name in test_roles:
                # Build query based on available columns
                if roles_has_name and roles_has_role_name:
                    lookup_query = """
                        SELECT id FROM roles 
                        WHERE LOWER(name) = LOWER($1) OR LOWER(role_name) = LOWER($1)
                        LIMIT 1
                    """
                elif roles_has_role_name:
                    lookup_query = """
                        SELECT id FROM roles 
                        WHERE LOWER(role_name) = LOWER($1)
                        LIMIT 1
                    """
                else:
                    lookup_query = """
                        SELECT id FROM roles 
                        WHERE LOWER(name) = LOWER($1)
                        LIMIT 1
                    """
                
                role_id = await conn.fetchval(lookup_query, role_name)
                if role_id:
                    print(f"   ✅ Role '{role_name}' found: ID = {role_id}")
                else:
                    print(f"   ⚠️  Role '{role_name}' not found")
            
            print("\n✅ All tests passed!")
            return True
            
    except Exception as e:
        print(f"\n❌ Test error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_role_operations(pool):
    """Test role-related operations."""
    try:
        async with pool.acquire() as conn:
            print("\n🧪 Testing Role Operations\n")
            
            # Check roles table structure first
            roles_columns = await conn.fetch("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'roles'
                ORDER BY ordinal_position
            """)
            roles_column_names = [col['column_name'] for col in roles_columns]
            roles_has_role_name = 'role_name' in roles_column_names
            roles_has_name = 'name' in roles_column_names
            roles_has_display_name = 'display_name' in roles_column_names
            
            # Test 1: Create a test role (if it doesn't exist)
            print("Test 1: Create test role")
            
            # Build insert query based on available columns
            if roles_has_role_name and roles_has_display_name:
                # Simple roles table structure
                test_role_id = await conn.fetchval("""
                    INSERT INTO roles (role_name, display_name)
                    VALUES ('test_role', 'Test Role')
                    ON CONFLICT (role_name) DO NOTHING
                    RETURNING id
                """)
                
                if not test_role_id:
                    test_role_id = await conn.fetchval("""
                        SELECT id FROM roles WHERE role_name = 'test_role'
                    """)
            elif roles_has_name:
                # Complex roles table structure
                test_role_id = await conn.fetchval("""
                    INSERT INTO roles (name, description)
                    VALUES ('test_role', 'Test Role')
                    ON CONFLICT DO NOTHING
                    RETURNING id
                """)
                
                if not test_role_id:
                    test_role_id = await conn.fetchval("""
                        SELECT id FROM roles WHERE name = 'test_role'
                    """)
            else:
                print("   ⚠️  Cannot determine roles table structure")
                test_role_id = None
            
            if test_role_id:
                print(f"   ✅ Test role exists with ID: {test_role_id}")
            else:
                print(f"   ⚠️  Could not create or find test role")
            
            # Test 2: Assign role to a user (if users exist)
            print("\nTest 2: Test role assignment")
            test_user = await conn.fetchrow("""
                SELECT id, email, role_id FROM users LIMIT 1
            """)
            
            if test_user:
                old_role_id = test_user['role_id']
                await conn.execute("""
                    UPDATE users SET role_id = $1 WHERE id = $2
                """, test_role_id, test_user['id'])
                
                # Verify update
                updated_user = await conn.fetchrow("""
                    SELECT role_id FROM users WHERE id = $1
                """, test_user['id'])
                
                if updated_user['role_id'] == test_role_id:
                    print(f"   ✅ Successfully assigned role to user {test_user['email']}")
                else:
                    print(f"   ❌ Failed to assign role")
                
                # Restore original role
                await conn.execute("""
                    UPDATE users SET role_id = $1 WHERE id = $2
                """, old_role_id, test_user['id'])
                print(f"   ✅ Restored original role")
            else:
                print("   ⚠️  No users found to test with")
            
            # Test 3: Test role filtering
            print("\nTest 3: Test role filtering")
            # Build query based on available columns
            if roles_has_name and roles_has_role_name:
                admin_query = """
                    SELECT id FROM roles 
                    WHERE LOWER(role_name) = 'admin' OR LOWER(name) = 'admin'
                    LIMIT 1
                """
            elif roles_has_role_name:
                admin_query = """
                    SELECT id FROM roles 
                    WHERE LOWER(role_name) = 'admin'
                    LIMIT 1
                """
            else:
                admin_query = """
                    SELECT id FROM roles 
                    WHERE LOWER(name) = 'admin'
                    LIMIT 1
                """
            
            admin_role_id = await conn.fetchval(admin_query)
            
            if admin_role_id:
                admin_users = await conn.fetchval("""
                    SELECT COUNT(*) FROM users WHERE role_id = $1
                """, admin_role_id)
                print(f"   ✅ Found {admin_users} users with admin role (ID: {admin_role_id})")
            else:
                print("   ⚠️  Admin role not found")
            
            print("\n✅ Role operations test completed!")
            return True
            
    except Exception as e:
        print(f"\n❌ Test error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    async def main():
        print("=" * 60)
        print("Role Migration Test Suite")
        print("=" * 60)
        
        pool = None
        try:
            # Create a single pool for all tests
            pool = await get_db_pool()
            
            success1 = await test_role_migration(pool)
            success2 = await test_role_operations(pool)
            
            if success1 and success2:
                print("\n" + "=" * 60)
                print("✅ All tests passed! Migration is working correctly.")
                print("=" * 60)
            else:
                print("\n" + "=" * 60)
                print("❌ Some tests failed. Please review the output above.")
                print("=" * 60)
                sys.exit(1)
        except Exception as e:
            print(f"\n❌ Fatal error: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)
        finally:
            # Close the pool at the end
            if pool:
                await pool.close()
    
    asyncio.run(main())

