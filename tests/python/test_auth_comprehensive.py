"""
Comprehensive test for authentication endpoints.
Tests login, session management, and user retrieval.
"""

import requests
import json
import sys
from typing import Optional, Dict, Any

BASE_URL = "http://127.0.0.1:8000"

def test_health_check() -> bool:
    """Test if backend is running."""
    print("=" * 60)
    print("1. Health Check")
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
        print("❌ Backend is not running")
        print("   Start it with: cd python_backend && python -m uvicorn main:app --reload --port 8000")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_auth_user_endpoint_no_auth() -> bool:
    """Test /api/v1/auth/user without authentication."""
    print("\n" + "=" * 60)
    print("2. Test /api/v1/auth/user (No Authentication)")
    print("=" * 60)
    try:
        response = requests.get(f"{BASE_URL}/api/v1/auth/user", timeout=5)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 401:
            print("   ✅ Correctly returns 401 for unauthenticated request")
            return True
        elif response.status_code == 500:
            print("   ❌ Returns 500 - Internal Server Error")
            print(f"   Response: {response.text[:200]}")
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

def test_login(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Test login endpoint."""
    print("\n" + "=" * 60)
    print("3. Test Login")
    print("=" * 60)
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/auth/login",
            json={"email": email, "password": password},
            timeout=5
        )
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("   ✅ Login successful")
            print(f"   - User: {data.get('user', {}).get('email', 'N/A')}")
            print(f"   - Session ID: {data.get('session_id', 'N/A')[:50]}...")
            
            # Check for session cookie
            cookies = response.cookies
            if 'session_id' in cookies:
                print(f"   ✅ Session cookie set: {cookies['session_id'][:50]}...")
            else:
                print("   ⚠️  No session cookie found")
            
            return data
        elif response.status_code == 401:
            print("   ⚠️  Login failed - Invalid credentials")
            return None
        elif response.status_code == 500:
            print("   ❌ Login failed - Internal Server Error")
            print(f"   Response: {response.text[:200]}")
            try:
                error_detail = response.json()
                print(f"   Error detail: {json.dumps(error_detail, indent=2)}")
            except:
                pass
            return None
        else:
            print(f"   ⚠️  Unexpected status code: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return None
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return None

def test_auth_user_endpoint_with_session(session_id: str, cookies: Dict[str, str]) -> bool:
    """Test /api/v1/auth/user with session."""
    print("\n" + "=" * 60)
    print("4. Test /api/v1/auth/user (With Session)")
    print("=" * 60)
    try:
        # Try with cookie
        response = requests.get(
            f"{BASE_URL}/api/v1/auth/user",
            cookies=cookies,
            timeout=5
        )
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("   ✅ Successfully retrieved user data")
            print(f"   - Email: {data.get('email', 'N/A')}")
            print(f"   - Role: {data.get('role', 'N/A')}")
            print(f"   - Role Name: {data.get('role_name', 'N/A')}")
            print(f"   - Permissions: {list(data.get('permissions', {}).keys())[:5]}...")
            return True
        elif response.status_code == 401:
            print("   ⚠️  Session expired or invalid")
            return False
        elif response.status_code == 500:
            print("   ❌ Returns 500 - Internal Server Error")
            print(f"   Response: {response.text[:200]}")
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

def main():
    """Run all authentication tests."""
    print("=" * 60)
    print("Comprehensive Authentication Test Suite")
    print("=" * 60)
    
    # Test 1: Health check
    if not test_health_check():
        print("\n❌ Backend is not running. Please start it first.")
        sys.exit(1)
    
    # Test 2: Auth endpoint without auth
    test_auth_user_endpoint_no_auth()
    
    # Test 3: Login (if credentials provided)
    if len(sys.argv) >= 3:
        email = sys.argv[1]
        password = sys.argv[2]
        login_result = test_login(email, password)
        
        if login_result:
            # Extract session info
            session_id = login_result.get('session_id')
            cookies = {'session_id': session_id} if session_id else {}
            
            # Test 4: Auth endpoint with session
            test_auth_user_endpoint_with_session(session_id, cookies)
    else:
        print("\n" + "=" * 60)
        print("Note: To test login, provide email and password:")
        print("  python test_auth_comprehensive.py <email> <password>")
        print("=" * 60)
    
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print("If you see 500 errors, check:")
    print("1. Database connection (DATABASE_URL environment variable)")
    print("2. Roles table structure (should have 'role_name' column)")
    print("3. Users table has 'role_id' column")
    print("4. Backend logs for detailed error messages")
    print("=" * 60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)

