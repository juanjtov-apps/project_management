"""
Test script for Node.js backend RBAC user endpoints.
Tests POST and PATCH at /api/v1/rbac/users
"""

import requests
import json
import sys
from datetime import datetime

NODE_BACKEND_URL = "http://127.0.0.1:5000"

def test_create_user(session_cookies):
    """Test POST /api/v1/rbac/users"""
    print("\n" + "=" * 80)
    print("Testing POST /api/v1/rbac/users")
    print("=" * 80)
    
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    user_data = {
        "first_name": "Test",
        "last_name": f"User{timestamp[-6:]}",
        "email": f"testuser_{timestamp}@test.com",
        "password": "TestPassword123!",
        "role": "crew",  # Using role string, not role_id
        "company_id": "61",  # Use a valid company_id
        "is_active": True
    }
    
    print(f"Creating user with data: {json.dumps(user_data, indent=2)}")
    
    try:
        response = requests.post(
            f"{NODE_BACKEND_URL}/api/v1/rbac/users",
            json=user_data,
            cookies=session_cookies,
            headers={"Content-Type": "application/json"},
            timeout=15
        )
        
        print(f"Response Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        if response.status_code == 201:
            created_user = response.json()
            print(f"✅ User created successfully!")
            print(f"User ID: {created_user.get('id')}")
            return created_user
        else:
            print(f"❌ Failed to create user: {response.status_code}")
            try:
                error = response.json()
                print(f"Error: {json.dumps(error, indent=2)}")
            except:
                pass
            return None
    except Exception as e:
        print(f"❌ Exception: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_update_user(session_cookies, user_id):
    """Test PATCH /api/v1/rbac/users/{id}"""
    print("\n" + "=" * 80)
    print(f"Testing PATCH /api/v1/rbac/users/{user_id}")
    print("=" * 80)
    
    update_data = {
        "first_name": "Updated",
        "last_name": "TestUser",
        "is_active": False
    }
    
    print(f"Updating user with data: {json.dumps(update_data, indent=2)}")
    
    try:
        response = requests.patch(
            f"{NODE_BACKEND_URL}/api/v1/rbac/users/{user_id}",
            json=update_data,
            cookies=session_cookies,
            headers={"Content-Type": "application/json"},
            timeout=15
        )
        
        print(f"Response Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        if response.status_code == 200:
            updated_user = response.json()
            print(f"✅ User updated successfully!")
            print(f"Updated user: {json.dumps(updated_user, indent=2, default=str)}")
            return True
        else:
            print(f"❌ Failed to update user: {response.status_code}")
            try:
                error = response.json()
                print(f"Error: {json.dumps(error, indent=2)}")
            except:
                pass
            return False
    except Exception as e:
        print(f"❌ Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def authenticate(email, password):
    """Authenticate and get session cookies"""
    print("=" * 80)
    print("Authenticating")
    print("=" * 80)
    
    try:
        # Use Node.js backend login endpoint (not Python)
        response = requests.post(
            f"{NODE_BACKEND_URL}/api/auth/login",
            json={"email": email, "password": password},
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Authentication successful")
            # Get cookies from response - Node.js uses express-session
            cookies = dict(response.cookies)
            print(f"Cookies received: {list(cookies.keys())}")
            return cookies
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            print(f"Response: {response.text[:200]}")
            return None
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    print("=" * 80)
    print("Node.js Backend RBAC User Endpoints Test")
    print("=" * 80)
    
    if len(sys.argv) >= 3:
        email = sys.argv[1]
        password = sys.argv[2]
    else:
        email = "daniel@tiento.com"
        password = "password123"
        print(f"Using default credentials: {email}")
    
    # Authenticate
    cookies = authenticate(email, password)
    if not cookies:
        print("\n❌ Cannot proceed without authentication")
        sys.exit(1)
    
    print(f"\nSession cookies: {list(cookies.keys())}")
    
    # Test create user
    created_user = test_create_user(cookies)
    
    if not created_user:
        print("\n❌ User creation failed. Cannot test update.")
        sys.exit(1)
    
    user_id = created_user.get('id')
    
    # Test update user
    update_success = test_update_user(cookies, user_id)
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    if created_user and update_success:
        print("✅ ALL TESTS PASSED!")
        print(f"   - User created: {user_id}")
        print(f"   - User updated: {user_id}")
    else:
        print("❌ SOME TESTS FAILED")
        if not created_user:
            print("   - User creation failed")
        if not update_success:
            print("   - User update failed")
    print("=" * 80)

if __name__ == "__main__":
    main()

