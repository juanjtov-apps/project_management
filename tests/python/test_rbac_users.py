"""
Comprehensive test for RBAC users endpoint.
Tests the endpoint, database queries, and response format.
"""

import requests
import json
import sys
import os
from typing import Optional, Dict, Any

BASE_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://127.0.0.1:5000"

def test_backend_health():
    """Test if backend is running."""
    print("=" * 60)
    print("1. Testing Backend Health")
    print("=" * 60)
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running")
            return True
        else:
            print(f"⚠️  Backend responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Backend is not running on port 8000")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_rbac_users_endpoint_no_auth():
    """Test RBAC users endpoint without authentication."""
    print("\n" + "=" * 60)
    print("2. Testing /api/v1/rbac/users (No Authentication)")
    print("=" * 60)
    try:
        response = requests.get(f"{BASE_URL}/api/v1/rbac/users", timeout=5)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 401:
            print("   ✅ Correctly returns 401 for unauthenticated request")
            return True
        elif response.status_code == 403:
            print("   ✅ Correctly returns 403 for unauthorized request")
            return True
        elif response.status_code == 500:
            print("   ❌ Returns 500 - Internal Server Error")
            print(f"   Response: {response.text[:500]}")
            try:
                error_detail = response.json()
                print(f"   Error detail: {json.dumps(error_detail, indent=2)}")
            except:
                pass
            return False
        else:
            print(f"   ⚠️  Unexpected status code: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_rbac_users_with_session(session_id: str, cookies: Dict[str, str]):
    """Test RBAC users endpoint with session."""
    print("\n" + "=" * 60)
    print("3. Testing /api/v1/rbac/users (With Session)")
    print("=" * 60)
    try:
        response = requests.get(
            f"{BASE_URL}/api/v1/rbac/users",
            cookies=cookies,
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Successfully retrieved user data")
            print(f"   - Number of users: {len(data) if isinstance(data, list) else 'N/A'}")
            
            if isinstance(data, list) and len(data) > 0:
                print(f"   - First user sample:")
                first_user = data[0]
                print(f"     * ID: {first_user.get('id', 'N/A')}")
                print(f"     * Email: {first_user.get('email', 'N/A')}")
                print(f"     * Name: {first_user.get('name', first_user.get('first_name', 'N/A'))}")
                print(f"     * Role: {first_user.get('role', 'N/A')}")
                print(f"     * Role Name: {first_user.get('role_name', 'N/A')}")
                print(f"     * Company ID: {first_user.get('companyId', first_user.get('company_id', 'N/A'))}")
                print(f"     * Is Active: {first_user.get('isActive', first_user.get('is_active', 'N/A'))}")
                return True
            elif isinstance(data, list) and len(data) == 0:
                print("   ⚠️  Endpoint returned empty list - no users found")
                return False
            else:
                print(f"   ⚠️  Unexpected response format: {type(data)}")
                print(f"   Response: {json.dumps(data, indent=2)[:500]}")
                return False
        elif response.status_code == 401:
            print("   ⚠️  Session expired or invalid")
            return False
        elif response.status_code == 403:
            print("   ⚠️  User doesn't have admin privileges")
            return False
        elif response.status_code == 500:
            print("   ❌ Returns 500 - Internal Server Error")
            print(f"   Response: {response.text[:500]}")
            try:
                error_detail = response.json()
                print(f"   Error detail: {json.dumps(error_detail, indent=2)}")
            except:
                pass
            return False
        else:
            print(f"   ⚠️  Unexpected status code: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_frontend_endpoint(session_id: str, cookies: Dict[str, str]):
    """Test the frontend proxy endpoint."""
    print("\n" + "=" * 60)
    print("4. Testing Frontend Proxy /api/rbac/users")
    print("=" * 60)
    try:
        response = requests.get(
            f"{FRONTEND_URL}/api/rbac/users",
            cookies=cookies,
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Frontend proxy working")
            print(f"   - Number of users: {len(data) if isinstance(data, list) else 'N/A'}")
            return True
        else:
            print(f"   ⚠️  Frontend proxy returned status {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def main():
    """Run all RBAC users tests."""
    print("=" * 60)
    print("RBAC Users Endpoint Test Suite")
    print("=" * 60)
    
    # Test 1: Backend health
    if not test_backend_health():
        print("\n❌ Backend is not running. Please start it first.")
        sys.exit(1)
    
    # Test 2: No auth
    test_rbac_users_endpoint_no_auth()
    
    # Test 3: With session (if credentials provided)
    if len(sys.argv) >= 3:
        email = sys.argv[1]
        password = sys.argv[2]
        
        print("\n" + "=" * 60)
        print("5. Logging in to get session")
        print("=" * 60)
        try:
            login_response = requests.post(
                f"{BASE_URL}/api/v1/auth/login",
                json={"email": email, "password": password},
                timeout=5
            )
            
            if login_response.status_code == 200:
                login_data = login_response.json()
                session_id = login_data.get('session_id')
                cookies = {'session_id': session_id} if session_id else {}
                print(f"   ✅ Login successful")
                print(f"   - Session ID: {session_id[:50] if session_id else 'N/A'}...")
                
                # Test RBAC users with session
                test_rbac_users_with_session(session_id, cookies)
                
                # Test frontend endpoint
                test_frontend_endpoint(session_id, cookies)
            else:
                print(f"   ❌ Login failed with status {login_response.status_code}")
                print(f"   Response: {login_response.text[:200]}")
        except Exception as e:
            print(f"   ❌ Login error: {e}")
    else:
        print("\n" + "=" * 60)
        print("Note: To test with authentication, provide email and password:")
        print("  python test_rbac_users.py <email> <password>")
        print("=" * 60)
    
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print("If you see 500 errors, check:")
    print("1. Database connection (DATABASE_URL environment variable)")
    print("2. Roles table structure (should have 'role_name' column)")
    print("3. Users table has 'role_id' column with valid foreign keys")
    print("4. Backend logs for detailed error messages")
    print("=" * 60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)

