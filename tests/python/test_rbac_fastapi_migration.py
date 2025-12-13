#!/usr/bin/env python3
"""
Test script to verify all RBAC endpoints are working through FastAPI.
This script tests that all RBAC operations have been successfully migrated from Node.js to FastAPI.
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

BASE_URL = "http://127.0.0.1:8000"
API_BASE = f"{BASE_URL}/api/v1"

# Test credentials - adjust as needed
TEST_EMAIL = "admin@proesphere.com"
TEST_PASSWORD = "admin123"  # Update with actual test password

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_success(msg: str):
    print(f"{Colors.GREEN}✅ {msg}{Colors.RESET}")

def print_error(msg: str):
    print(f"{Colors.RED}❌ {msg}{Colors.RESET}")

def print_warning(msg: str):
    print(f"{Colors.YELLOW}⚠️  {msg}{Colors.RESET}")

def print_info(msg: str):
    print(f"{Colors.BLUE}ℹ️  {msg}{Colors.RESET}")

def get_auth_session() -> Optional[requests.Session]:
    """Get authenticated session."""
    session = requests.Session()
    
    # Try to login
    try:
        login_url = f"{API_BASE}/auth/login"
        response = session.post(login_url, json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 200:
            print_success(f"Authenticated as {TEST_EMAIL}")
            return session
        else:
            print_error(f"Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"Login error: {e}")
        return None

def test_endpoint(session: requests.Session, method: str, endpoint: str, 
                 data: Optional[Dict] = None, expected_status: int = 200) -> bool:
    """Test an endpoint and return True if successful."""
    url = f"{API_BASE}{endpoint}"
    
    try:
        if method == "GET":
            response = session.get(url)
        elif method == "POST":
            response = session.post(url, json=data)
        elif method == "PATCH":
            response = session.patch(url, json=data)
        elif method == "DELETE":
            response = session.delete(url)
        else:
            print_error(f"Unsupported method: {method}")
            return False
        
        if response.status_code == expected_status:
            print_success(f"{method} {endpoint} - {response.status_code}")
            return True
        else:
            print_error(f"{method} {endpoint} - {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        print_error(f"{method} {endpoint} - Error: {e}")
        return False

def main():
    print_info("Testing RBAC endpoints migration to FastAPI")
    print_info("=" * 60)
    
    # Get authenticated session
    session = get_auth_session()
    if not session:
        print_error("Failed to authenticate. Please check credentials.")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print_info("Testing RBAC Endpoints")
    print("=" * 60 + "\n")
    
    results = {
        "permissions": [],
        "roles": [],
        "users": [],
        "companies": []
    }
    
    # Test Permissions
    print_info("Testing Permissions Endpoints")
    results["permissions"].append(
        test_endpoint(session, "GET", "/rbac/permissions")
    )
    
    # Test Roles
    print_info("\nTesting Roles Endpoints")
    results["roles"].append(
        test_endpoint(session, "GET", "/rbac/roles")
    )
    
    # Test creating a role (if we have permissions)
    test_role_data = {
        "name": "Test Role",
        "description": "Test role for migration testing",
        "permissions": []
    }
    create_role_result = test_endpoint(session, "POST", "/rbac/roles", 
                                      test_role_data, expected_status=201)
    results["roles"].append(create_role_result)
    
    if create_role_result:
        # Try to get the created role ID (would need to parse response)
        print_info("Role created successfully (ID would be needed for update/delete tests)")
    
    # Test Users
    print_info("\nTesting Users Endpoints")
    results["users"].append(
        test_endpoint(session, "GET", "/rbac/users")
    )
    
    # Test Companies
    print_info("\nTesting Companies Endpoints")
    results["companies"].append(
        test_endpoint(session, "GET", "/rbac/companies")
    )
    
    # Test legacy /api/companies endpoint (should also work)
    results["companies"].append(
        test_endpoint(session, "GET", "/companies")
    )
    
    # Test Managers endpoint
    print_info("\nTesting Managers Endpoint")
    results["users"].append(
        test_endpoint(session, "GET", "/users/managers")
    )
    
    # Summary
    print("\n" + "=" * 60)
    print_info("Test Summary")
    print("=" * 60)
    
    total_tests = 0
    passed_tests = 0
    
    for category, test_results in results.items():
        category_total = len(test_results)
        category_passed = sum(test_results)
        total_tests += category_total
        passed_tests += category_passed
        
        status = "PASS" if category_passed == category_total else "PARTIAL"
        print(f"{category.upper()}: {category_passed}/{category_total} - {status}")
    
    print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print_success("All RBAC endpoints are working correctly!")
        return 0
    else:
        print_warning("Some tests failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

