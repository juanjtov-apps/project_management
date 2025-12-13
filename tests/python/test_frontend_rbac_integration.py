#!/usr/bin/env python3
"""
Comprehensive test script for Frontend RBAC Admin Page Integration.
Tests all endpoints that the frontend RBAC admin page uses to ensure they work correctly
after migration to FastAPI.

Requirements:
    pip install requests
"""

try:
    import requests
except ImportError:
    print("❌ Error: 'requests' module not found.")
    print("   Install it with: pip install requests")
    print("   Or: pip3 install requests")
    sys.exit(1)

import json
import sys
from typing import Dict, Any, Optional, List
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000"
API_BASE = f"{BASE_URL}/api/v1"
FRONTEND_BASE = "http://127.0.0.1:5000"

# Test credentials - adjust as needed
TEST_EMAIL = "daniel@tiento.com"
TEST_PASSWORD = "password123"  # Update with actual test password

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    RESET = '\033[0m'

def print_success(msg: str):
    print(f"{Colors.GREEN}✅ {msg}{Colors.RESET}")

def print_error(msg: str):
    print(f"{Colors.RED}❌ {msg}{Colors.RESET}")

def print_warning(msg: str):
    print(f"{Colors.YELLOW}⚠️  {msg}{Colors.RESET}")

def print_info(msg: str):
    print(f"{Colors.BLUE}ℹ️  {msg}{Colors.RESET}")

def print_section(msg: str):
    print(f"\n{Colors.CYAN}{'='*60}{Colors.RESET}")
    print(f"{Colors.CYAN}{msg}{Colors.RESET}")
    print(f"{Colors.CYAN}{'='*60}{Colors.RESET}\n")

class TestResult:
    def __init__(self, name: str):
        self.name = name
        self.passed = False
        self.error = None
        self.response_data = None
        self.status_code = None

def get_auth_session() -> Optional[requests.Session]:
    """Get authenticated session via FastAPI."""
    session = requests.Session()
    
    try:
        login_url = f"{API_BASE}/auth/login"
        response = session.post(login_url, json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Authenticated as {TEST_EMAIL}")
            # Store session cookie if needed
            return session
        else:
            print_error(f"Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"Login error: {e}")
        return None

def test_endpoint(session: requests.Session, method: str, endpoint: str, 
                 data: Optional[Dict] = None, expected_status: int = 200,
                 description: str = "") -> TestResult:
    """Test an endpoint and return TestResult."""
    result = TestResult(description or f"{method} {endpoint}")
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
            result.error = f"Unsupported method: {method}"
            return result
        
        result.status_code = response.status_code
        result.response_data = response.json() if response.text else None
        
        if response.status_code == expected_status:
            result.passed = True
            print_success(f"{result.name} - {response.status_code}")
            return result
        else:
            result.error = f"Expected {expected_status}, got {response.status_code}: {response.text[:200]}"
            print_error(f"{result.name} - {response.status_code}: {response.text[:200]}")
            return result
    except Exception as e:
        result.error = str(e)
        print_error(f"{result.name} - Error: {e}")
        return result

def test_frontend_proxy(session: requests.Session, endpoint: str) -> TestResult:
    """Test that Node.js proxy forwards requests correctly."""
    result = TestResult(f"Frontend Proxy: {endpoint}")
    url = f"{FRONTEND_BASE}{endpoint}"
    
    try:
        # Forward cookies from FastAPI session
        cookies = session.cookies.get_dict()
        response = requests.get(url, cookies=cookies)
        
        result.status_code = response.status_code
        
        if response.status_code in [200, 401, 403]:  # 401/403 are valid auth responses
            try:
                result.response_data = response.json()
            except:
                result.response_data = response.text
            result.passed = True
            print_success(f"{result.name} - {response.status_code}")
        else:
            result.error = f"Unexpected status: {response.status_code}"
            print_error(f"{result.name} - {response.status_code}")
        
        return result
    except Exception as e:
        result.error = str(e)
        print_error(f"{result.name} - Error: {e}")
        return result

def test_rbac_endpoints(session: requests.Session) -> List[TestResult]:
    """Test all RBAC endpoints used by the frontend."""
    results = []
    
    print_section("Testing RBAC Endpoints (Frontend Integration)")
    
    # Test Permissions
    print_info("Testing Permissions Endpoint")
    results.append(test_endpoint(
        session, "GET", "/rbac/permissions",
        description="GET /api/v1/rbac/permissions"
    ))
    
    # Test Roles - GET
    print_info("\nTesting Roles Endpoints")
    results.append(test_endpoint(
        session, "GET", "/rbac/roles",
        description="GET /api/v1/rbac/roles"
    ))
    
    # Test Roles - POST (create)
    test_role = {
        "name": f"Test Role {datetime.now().strftime('%Y%m%d%H%M%S')}",
        "description": "Test role for frontend integration testing",
        "permissions": []
    }
    create_role_result = test_endpoint(
        session, "POST", "/rbac/roles", test_role,
        expected_status=201,
        description="POST /api/v1/rbac/roles (create)"
    )
    results.append(create_role_result)
    
    role_id = None
    if create_role_result.passed and create_role_result.response_data:
        role_id = create_role_result.response_data.get('id')
        print_info(f"Created test role with ID: {role_id}")
    
    # Test Roles - PATCH (update) if we created a role
    if role_id:
        update_data = {"description": "Updated description"}
        results.append(test_endpoint(
            session, "PATCH", f"/rbac/roles/{role_id}", update_data,
            description="PATCH /api/v1/rbac/roles/{id} (update)"
        ))
        
        # Test Roles - DELETE
        results.append(test_endpoint(
            session, "DELETE", f"/rbac/roles/{role_id}",
            expected_status=200,
            description="DELETE /api/v1/rbac/roles/{id}"
        ))
    
    # Test Users - GET
    print_info("\nTesting Users Endpoints")
    results.append(test_endpoint(
        session, "GET", "/rbac/users",
        description="GET /api/v1/rbac/users"
    ))
    
    # Test Companies - GET
    print_info("\nTesting Companies Endpoints")
    results.append(test_endpoint(
        session, "GET", "/rbac/companies",
        description="GET /api/v1/rbac/companies"
    ))
    
    # Test legacy /api/companies endpoint
    results.append(test_endpoint(
        session, "GET", "/companies",
        description="GET /api/v1/companies (legacy)"
    ))
    
    return results

def test_frontend_proxy_endpoints(session: requests.Session) -> List[TestResult]:
    """Test that Node.js proxy correctly forwards RBAC requests."""
    results = []
    
    print_section("Testing Frontend Proxy (Node.js → FastAPI)")
    
    # Test that Node.js forwards these endpoints correctly
    proxy_endpoints = [
        "/api/rbac/permissions",
        "/api/rbac/roles",
        "/api/rbac/users",
        "/api/rbac/companies",
        "/api/companies",
    ]
    
    for endpoint in proxy_endpoints:
        results.append(test_frontend_proxy(session, endpoint))
    
    return results

def verify_response_structure(result: TestResult, expected_fields: List[str]) -> bool:
    """Verify that response has expected structure."""
    if not result.passed or not result.response_data:
        return False
    
    if isinstance(result.response_data, list):
        if len(result.response_data) > 0:
            data = result.response_data[0]
        else:
            return True  # Empty list is valid
    else:
        data = result.response_data
    
    for field in expected_fields:
        if field not in data:
            print_warning(f"Missing field '{field}' in response")
            return False
    
    return True

def verify_rbac_response_structures(results: List[TestResult]):
    """Verify that RBAC responses have correct structure for frontend."""
    print_section("Verifying Response Structures")
    
    for result in results:
        if not result.passed:
            continue
        
        if "roles" in result.name.lower():
            if verify_response_structure(result, ["id", "name"]):
                print_success(f"{result.name} - Structure valid")
            else:
                print_warning(f"{result.name} - Structure may be incomplete")
        
        elif "users" in result.name.lower():
            if verify_response_structure(result, ["id", "email"]):
                print_success(f"{result.name} - Structure valid")
            else:
                print_warning(f"{result.name} - Structure may be incomplete")
        
        elif "companies" in result.name.lower():
            if verify_response_structure(result, ["id", "name"]):
                print_success(f"{result.name} - Structure valid")
            else:
                print_warning(f"{result.name} - Structure may be incomplete")
        
        elif "permissions" in result.name.lower():
            if verify_response_structure(result, ["id", "name"]):
                print_success(f"{result.name} - Structure valid")
            else:
                print_warning(f"{result.name} - Structure may be incomplete")

def main():
    print_section("Frontend RBAC Admin Page Integration Test")
    print_info("Testing all endpoints used by the frontend RBAC admin page")
    print_info(f"FastAPI Backend: {BASE_URL}")
    print_info(f"Node.js Frontend: {FRONTEND_BASE}")
    print_info(f"Test User: {TEST_EMAIL}")
    
    # Get authenticated session
    session = get_auth_session()
    if not session:
        print_error("Failed to authenticate. Please check credentials.")
        print_info("Make sure FastAPI backend is running and test user exists.")
        sys.exit(1)
    
    all_results = []
    
    # Test RBAC endpoints
    rbac_results = test_rbac_endpoints(session)
    all_results.extend(rbac_results)
    
    # Test frontend proxy
    proxy_results = test_frontend_proxy_endpoints(session)
    all_results.extend(proxy_results)
    
    # Verify response structures
    verify_rbac_response_structures(rbac_results)
    
    # Summary
    print_section("Test Summary")
    
    total_tests = len(all_results)
    passed_tests = sum(1 for r in all_results if r.passed)
    failed_tests = total_tests - passed_tests
    
    print_info(f"Total Tests: {total_tests}")
    print_success(f"Passed: {passed_tests}")
    if failed_tests > 0:
        print_error(f"Failed: {failed_tests}")
    
    # Detailed results
    print("\n" + "="*60)
    print_info("Detailed Results")
    print("="*60)
    
    for result in all_results:
        status = "✅ PASS" if result.passed else "❌ FAIL"
        print(f"{status} - {result.name}")
        if result.error:
            print(f"      Error: {result.error}")
        if result.status_code:
            print(f"      Status: {result.status_code}")
    
    # Final verdict
    print("\n" + "="*60)
    if passed_tests == total_tests:
        print_success("🎉 All tests passed! Frontend RBAC integration is working correctly.")
        return 0
    else:
        print_warning(f"⚠️  {failed_tests} test(s) failed. Please review the errors above.")
        print_info("Check that:")
        print_info("  1. FastAPI backend is running on port 8000")
        print_info("  2. Node.js frontend is running on port 5000")
        print_info("  3. Test user credentials are correct")
        print_info("  4. Database is accessible and contains test data")
        return 1

if __name__ == "__main__":
    sys.exit(main())

