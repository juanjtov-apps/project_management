"""
Diagnostic test script for authentication issues.
Tests the /api/v1/auth/user endpoint and related database queries.
"""

import asyncio
import asyncpg
import sys
import traceback
from pathlib import Path

# Add python_backend directory to path
script_dir = Path(__file__).resolve().parent
python_backend_dir = script_dir / "python_backend"

if str(python_backend_dir) not in sys.path:
    sys.path.insert(0, str(python_backend_dir))

from src.database.connection import get_db_pool

async def check_roles_table_structure(pool):
    """Check the actual structure of the roles table."""
    print("=" * 60)
    print("1. Checking Roles Table Structure")
    print("=" * 60)
    
    try:
        async with pool.acquire() as conn:
            # Get column names
            columns = await conn.fetch("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'roles'
                ORDER BY ordinal_position
            """)
            
            if not columns:
                print("❌ Roles table does not exist!")
                return None
            
            print(f"✅ Roles table exists with {len(columns)} columns:")
            column_names = []
            for col in columns:
                print(f"   - {col['column_name']} ({col['data_type']})")
                column_names.append(col['column_name'])
            
            # Check which name column exists
            has_name = 'name' in column_names
            has_role_name = 'role_name' in column_names
            has_display_name = 'display_name' in column_names
            
            print(f"\n   Column check:")
            print(f"   - 'name': {has_name}")
            print(f"   - 'role_name': {has_role_name}")
            print(f"   - 'display_name': {has_display_name}")
            
            return {
                'has_name': has_name,
                'has_role_name': has_role_name,
                'has_display_name': has_display_name,
                'column_names': column_names
            }
            
    except Exception as e:
        print(f"❌ Error checking roles table: {e}")
        traceback.print_exc()
        return None

async def check_users_table_structure(pool):
    """Check the users table structure, especially role_id."""
    print("\n" + "=" * 60)
    print("2. Checking Users Table Structure")
    print("=" * 60)
    
    try:
        async with pool.acquire() as conn:
            # Check if role_id column exists
            role_id_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'role_id'
                )
            """)
            
            print(f"   role_id column exists: {role_id_exists}")
            
            # Get sample users with role_id
            users = await conn.fetch("""
                SELECT id, email, role_id, is_root, company_id
                FROM users
                LIMIT 5
            """)
            
            print(f"\n   Sample users:")
            for user in users:
                print(f"   - {user['email']}: role_id={user['role_id']}, is_root={user['is_root']}, company_id={user['company_id']}")
            
            # Check users without role_id
            users_without_role = await conn.fetchval("""
                SELECT COUNT(*) FROM users WHERE role_id IS NULL
            """)
            print(f"\n   Users without role_id: {users_without_role}")
            
            return role_id_exists
            
    except Exception as e:
        print(f"❌ Error checking users table: {e}")
        traceback.print_exc()
        return False

async def test_role_lookup_query(pool, roles_info):
    """Test the role lookup query used in get_session."""
    print("\n" + "=" * 60)
    print("3. Testing Role Lookup Query (as used in get_session)")
    print("=" * 60)
    
    try:
        async with pool.acquire() as conn:
            # Get a test user
            test_user = await conn.fetchrow("""
                SELECT id, email, role_id FROM users LIMIT 1
            """)
            
            if not test_user:
                print("❌ No users found in database")
                return False
            
            print(f"   Testing with user: {test_user['email']} (id={test_user['id']}, role_id={test_user['role_id']})")
            
            # Build query based on available columns
            if roles_info['has_name']:
                # Try the query as written in auth.py
                try:
                    user_row = await conn.fetchrow("""
                        SELECT u.*, r.name as role_name
                        FROM users u
                        LEFT JOIN roles r ON u.role_id = r.id
                        WHERE u.id = $1
                    """, test_user['id'])
                    
                    if user_row:
                        print(f"   ✅ Query with r.name succeeded")
                        print(f"   - role_name: {user_row.get('role_name')}")
                        return True
                    else:
                        print(f"   ⚠️  Query returned no rows")
                        return False
                except Exception as e:
                    print(f"   ❌ Query with r.name failed: {e}")
                    
                    # Try alternative with role_name
                    if roles_info['has_role_name']:
                        try:
                            user_row = await conn.fetchrow("""
                                SELECT u.*, r.role_name
                                FROM users u
                                LEFT JOIN roles r ON u.role_id = r.id
                                WHERE u.id = $1
                            """, test_user['id'])
                            
                            if user_row:
                                print(f"   ✅ Query with r.role_name succeeded")
                                print(f"   - role_name: {user_row.get('role_name')}")
                                return True
                        except Exception as e2:
                            print(f"   ❌ Query with r.role_name also failed: {e2}")
                    
                    return False
            else:
                print("   ⚠️  Roles table doesn't have 'name' column")
                return False
                
    except Exception as e:
        print(f"❌ Error testing role lookup: {e}")
        traceback.print_exc()
        return False

async def test_sessions_table(pool):
    """Check sessions table structure and data."""
    print("\n" + "=" * 60)
    print("4. Checking Sessions Table")
    print("=" * 60)
    
    try:
        async with pool.acquire() as conn:
            # Check if sessions table exists
            table_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'sessions'
                )
            """)
            
            if not table_exists:
                print("❌ Sessions table does not exist!")
                return False
            
            print("✅ Sessions table exists")
            
            # Get column names
            columns = await conn.fetch("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'sessions'
                ORDER BY ordinal_position
            """)
            
            print("   Columns:")
            for col in columns:
                print(f"   - {col['column_name']} ({col['data_type']})")
            
            # Count sessions
            session_count = await conn.fetchval("SELECT COUNT(*) FROM sessions")
            print(f"\n   Total sessions: {session_count}")
            
            # Get sample session
            if session_count > 0:
                sample_session = await conn.fetchrow("""
                    SELECT sid, sess, expire FROM sessions LIMIT 1
                """)
                if sample_session:
                    print(f"\n   Sample session:")
                    print(f"   - sid: {sample_session['sid'][:50]}...")
                    print(f"   - expire: {sample_session['expire']}")
                    sess_data = sample_session['sess']
                    if isinstance(sess_data, str):
                        print(f"   - sess type: string (length: {len(sess_data)})")
                    else:
                        print(f"   - sess type: {type(sess_data)}")
            
            return True
            
    except Exception as e:
        print(f"❌ Error checking sessions table: {e}")
        traceback.print_exc()
        return False

async def test_get_session_logic(pool, roles_info):
    """Test the get_session function logic manually."""
    print("\n" + "=" * 60)
    print("5. Testing get_session Logic")
    print("=" * 60)
    
    try:
        async with pool.acquire() as conn:
            # Get a session from database
            session_row = await conn.fetchrow("""
                SELECT sid, sess, expire FROM sessions
                WHERE expire > NOW()
                LIMIT 1
            """)
            
            if not session_row:
                print("⚠️  No active sessions found")
                return False
            
            print(f"   Found session: {session_row['sid'][:50]}...")
            
            # Parse session data
            data = session_row['sess']
            if isinstance(data, str):
                import json
                try:
                    data = json.loads(data)
                except json.JSONDecodeError as e:
                    print(f"   ❌ Failed to parse session JSON: {e}")
                    return False
            
            if not isinstance(data, dict):
                print(f"   ❌ Session data is not a dict: {type(data)}")
                return False
            
            print(f"   ✅ Session data parsed successfully")
            print(f"   - Keys: {list(data.keys())}")
            
            # Get user_id
            user_id = data.get("userId") or data.get("id")
            if not user_id:
                print(f"   ❌ No userId or id found in session data")
                return False
            
            print(f"   - user_id: {user_id}")
            
            # Now test the user lookup query
            if roles_info['has_name']:
                query = """
                    SELECT u.*, r.name as role_name
                    FROM users u
                    LEFT JOIN roles r ON u.role_id = r.id
                    WHERE u.id = $1
                """
            elif roles_info['has_role_name']:
                query = """
                    SELECT u.*, r.role_name
                    FROM users u
                    LEFT JOIN roles r ON u.role_id = r.id
                    WHERE u.id = $1
                """
            else:
                query = """
                    SELECT u.*
                    FROM users u
                    WHERE u.id = $1
                """
            
            try:
                user_row = await conn.fetchrow(query, user_id)
                if user_row:
                    print(f"   ✅ User lookup succeeded")
                    user_dict = dict(user_row)
                    print(f"   - email: {user_dict.get('email')}")
                    print(f"   - role_id: {user_dict.get('role_id')}")
                    print(f"   - role_name: {user_dict.get('role_name')}")
                    return True
                else:
                    print(f"   ❌ User not found with id: {user_id}")
                    return False
            except Exception as e:
                print(f"   ❌ User lookup query failed: {e}")
                traceback.print_exc()
                return False
                
    except Exception as e:
        print(f"❌ Error testing get_session logic: {e}")
        traceback.print_exc()
        return False

async def main():
    print("=" * 60)
    print("Authentication Diagnostic Test")
    print("=" * 60)
    
    pool = None
    try:
        pool = await get_db_pool()
        
        # Run all diagnostic tests
        roles_info = await check_roles_table_structure(pool)
        if not roles_info:
            print("\n❌ Cannot continue without roles table structure info")
            return
        
        users_ok = await check_users_table_structure(pool)
        if not users_ok:
            print("\n⚠️  Users table structure issues detected")
        
        sessions_ok = await test_sessions_table(pool)
        if not sessions_ok:
            print("\n⚠️  Sessions table issues detected")
        
        role_lookup_ok = await test_role_lookup_query(pool, roles_info)
        if not role_lookup_ok:
            print("\n❌ Role lookup query is failing - this is likely the issue!")
        
        get_session_ok = await test_get_session_logic(pool, roles_info)
        if not get_session_ok:
            print("\n❌ get_session logic is failing!")
        
        print("\n" + "=" * 60)
        if role_lookup_ok and get_session_ok:
            print("✅ All diagnostic tests passed")
        else:
            print("❌ Some diagnostic tests failed - see details above")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        traceback.print_exc()
    finally:
        if pool:
            await pool.close()

if __name__ == "__main__":
    asyncio.run(main())

