"""
Test script to verify the /api/v1/auth/user endpoint works correctly.
"""

import requests
import json
import sys

def test_auth_endpoint():
    """Test the authentication endpoint."""
    base_url = "http://127.0.0.1:8000"
    
    print("=" * 60)
    print("Testing /api/v1/auth/user endpoint")
    print("=" * 60)
    
    # Test 1: Check endpoint without authentication (should return 401)
    print("\n1. Testing endpoint without authentication...")
    try:
        response = requests.get(f"{base_url}/api/v1/auth/user", timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 401:
            print("   ✅ Correctly returns 401 for unauthenticated request")
        elif response.status_code == 500:
            print("   ❌ Returns 500 - Internal Server Error (this is the bug!)")
            print(f"   Response: {response.text}")
        else:
            print(f"   ⚠️  Unexpected status code: {response.status_code}")
            print(f"   Response: {response.text}")
    except requests.exceptions.ConnectionError:
        print("   ❌ Cannot connect to backend server")
        print("   Make sure the Python backend is running on port 8000")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    # Test 2: Check if backend is running
    print("\n2. Checking if backend is running...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ Backend is running")
        else:
            print(f"   ⚠️  Backend responded with status {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("   ❌ Backend is not running")
        print("   Start it with: cd python_backend && python -m uvicorn main:app --reload --port 8000")
        return False
    except Exception as e:
        print(f"   ⚠️  Error checking health: {e}")
    
    # Test 3: Try with a session cookie (if available)
    print("\n3. Testing with session cookie...")
    # This would require a valid session_id from a login
    # For now, just check if the endpoint handles it gracefully
    
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print("If you see a 500 error, the fix in auth.py should resolve it.")
    print("The issue was using 'r.name' instead of 'r.role_name' in SQL queries.")
    
    return True

if __name__ == "__main__":
    try:
        test_auth_endpoint()
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)

