"""
Test the actual HTTP endpoint for user update
"""
import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://127.0.0.1:5000"  # Node.js proxy
# BASE_URL = "http://127.0.0.1:8000"  # Direct Python backend

def test_user_update_endpoint():
    """Test the PUT /api/v1/company-admin/users/{user_id}/role endpoint"""
    print("=" * 60)
    print("Testing User Update Endpoint")
    print("=" * 60)
    
    # First, we need to login to get a session
    print("\n1. Logging in...")
    login_response = requests.post(
        f"{BASE_URL}/api/v1/auth/login",
        json={
            "email": "daniel@tiento.com",  # Use a test admin user
            "password": "password"  # Adjust as needed
        },
        headers={"Content-Type": "application/json"}
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(f"   Response: {login_response.text}")
        return
    
    session_cookie = login_response.cookies.get('session')
    if not session_cookie:
        print("❌ No session cookie received")
        return
    
    print(f"✅ Logged in, session: {session_cookie[:20]}...")
    
    # Get current user to verify session
    print("\n2. Verifying session...")
    user_response = requests.get(
        f"{BASE_URL}/api/v1/auth/user",
        cookies={"session": session_cookie}
    )
    
    if user_response.status_code != 200:
        print(f"❌ Session verification failed: {user_response.status_code}")
        print(f"   Response: {user_response.text}")
        return
    
    current_user = user_response.json()
    print(f"✅ Session valid, user: {current_user.get('email')}")
    
    # Get a test user to update (not the current user)
    print("\n3. Getting test user to update...")
    users_response = requests.get(
        f"{BASE_URL}/api/v1/rbac/users",
        cookies={"session": session_cookie}
    )
    
    if users_response.status_code != 200:
        print(f"❌ Failed to get users: {users_response.status_code}")
        print(f"   Response: {users_response.text}")
        return
    
    users = users_response.json()
    if not users or len(users) == 0:
        print("❌ No users found")
        return
    
    # Find a user that's not root admin
    test_user = None
    for user in users:
        if not user.get('is_root') and user.get('id') != current_user.get('id'):
            test_user = user
            break
    
    if not test_user:
        print("❌ No suitable test user found")
        return
    
    print(f"✅ Test user: {test_user.get('email')} (ID: {test_user.get('id')})")
    print(f"   Current role: {test_user.get('role')} (role_id: {test_user.get('role_id')})")
    
    # Get available roles
    print("\n4. Getting available roles...")
    roles_response = requests.get(
        f"{BASE_URL}/api/v1/rbac/roles",
        cookies={"session": session_cookie}
    )
    
    if roles_response.status_code != 200:
        print(f"❌ Failed to get roles: {roles_response.status_code}")
        print(f"   Response: {roles_response.text}")
        return
    
    roles = roles_response.json()
    if not roles or len(roles) == 0:
        print("❌ No roles found")
        return
    
    # Find a different role to assign
    current_role_id = test_user.get('role_id')
    target_role = None
    for role in roles:
        if str(role.get('id')) != str(current_role_id):
            target_role = role
            break
    
    if not target_role:
        print("❌ No alternative role found")
        return
    
    # Get role name from role object
    role_name = target_role.get('roleName') or target_role.get('role_name') or target_role.get('name')
    print(f"✅ Target role: {role_name} (ID: {target_role.get('id')})")
    
    # Update the user
    print(f"\n5. Updating user role to '{role_name}'...")
    update_response = requests.put(
        f"{BASE_URL}/api/v1/company-admin/users/{test_user.get('id')}/role",
        json={
            "user_id": test_user.get('id'),
            "role": role_name
        },
        cookies={"session": session_cookie},
        headers={"Content-Type": "application/json"}
    )
    
    print(f"   Status: {update_response.status_code}")
    
    if update_response.status_code == 200:
        updated_user = update_response.json()
        print(f"✅ Update successful!")
        print(f"   Updated user: {updated_user.get('email')}")
        print(f"   New role: {updated_user.get('role')}")
    else:
        print(f"❌ Update failed!")
        print(f"   Response: {update_response.text}")
        try:
            error_detail = update_response.json()
            print(f"   Error detail: {json.dumps(error_detail, indent=2)}")
        except:
            pass
    
    print("\n" + "=" * 60)
    print("Test completed!")
    print("=" * 60)

if __name__ == "__main__":
    test_user_update_endpoint()

