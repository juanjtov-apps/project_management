"""
Comprehensive test for RBAC user POST (create) and PATCH (update) endpoints.
Tests endpoints, verifies database updates, and checks data integrity.
"""

import requests
import json
import sys
import os
import asyncpg
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

# Configuration
PYTHON_BACKEND_URL = "http://127.0.0.1:8000"
NODE_BACKEND_URL = "http://127.0.0.1:5000"
DATABASE_URL = os.getenv("DATABASE_URL")

# Test results tracking
test_results = {
    "passed": [],
    "failed": [],
    "warnings": []
}

def log_test(name: str, passed: bool, message: str = "", warning: bool = False):
    """Log test result"""
    if warning:
        test_results["warnings"].append(f"{name}: {message}")
        print(f"⚠️  {name}: {message}")
    elif passed:
        test_results["passed"].append(f"{name}: {message}")
        print(f"✅ {name}: {message}")
    else:
        test_results["failed"].append(f"{name}: {message}")
        print(f"❌ {name}: {message}")

def test_backend_health() -> bool:
    """Test if Python backend is running."""
    print("=" * 80)
    print("1. Testing Backend Health")
    print("=" * 80)
    try:
        response = requests.get(f"{PYTHON_BACKEND_URL}/health", timeout=5)
        if response.status_code == 200:
            log_test("Backend Health", True, "Python backend is running")
            return True
        else:
            log_test("Backend Health", False, f"Backend responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        log_test("Backend Health", False, "Backend is not running on port 8000")
        return False
    except Exception as e:
        log_test("Backend Health", False, f"Error: {e}")
        return False

async def verify_user_in_database(user_id: str, expected_data: Dict[str, Any]) -> bool:
    """Verify user exists in database with expected data."""
    try:
        if not DATABASE_URL:
            log_test("Database Verification", False, "DATABASE_URL not set")
            return False
        
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            # Query user with role information
            user_row = await conn.fetchrow("""
                SELECT u.id, u.first_name, u.last_name, u.email, u.role_id, 
                       u.company_id, u.is_active, u.created_at,
                       r.role_name, r.display_name as role_display_name
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.id = $1
            """, user_id)
            
            if not user_row:
                log_test("Database Verification", False, f"User {user_id} not found in database")
                return False
            
            user_data = dict(user_row)
            
            # Check each expected field
            checks = []
            if 'first_name' in expected_data:
                if user_data.get('first_name') != expected_data['first_name']:
                    checks.append(f"first_name mismatch: expected '{expected_data['first_name']}', got '{user_data.get('first_name')}'")
            
            if 'last_name' in expected_data:
                if user_data.get('last_name') != expected_data['last_name']:
                    checks.append(f"last_name mismatch: expected '{expected_data['last_name']}', got '{user_data.get('last_name')}'")
            
            if 'email' in expected_data:
                if user_data.get('email') != expected_data['email']:
                    checks.append(f"email mismatch: expected '{expected_data['email']}', got '{user_data.get('email')}'")
            
            if 'company_id' in expected_data:
                expected_company_id = str(expected_data['company_id'])
                actual_company_id = str(user_data.get('company_id')) if user_data.get('company_id') else None
                if actual_company_id != expected_company_id:
                    checks.append(f"company_id mismatch: expected '{expected_company_id}', got '{actual_company_id}'")
            
            if 'is_active' in expected_data:
                if user_data.get('is_active') != expected_data['is_active']:
                    checks.append(f"is_active mismatch: expected '{expected_data['is_active']}', got '{user_data.get('is_active')}'")
            
            if 'role_id' in expected_data:
                expected_role_id = int(expected_data['role_id']) if expected_data['role_id'] else None
                actual_role_id = user_data.get('role_id')
                if actual_role_id != expected_role_id:
                    checks.append(f"role_id mismatch: expected '{expected_role_id}', got '{actual_role_id}'")
            
            if checks:
                log_test("Database Verification", False, f"Data mismatches: {', '.join(checks)}")
                return False
            
            log_test("Database Verification", True, f"User {user_id} verified in database with correct data")
            return True
            
        finally:
            await conn.close()
    except Exception as e:
        log_test("Database Verification", False, f"Error verifying user in database: {e}")
        import traceback
        traceback.print_exc()
        return False

def authenticate(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticate and get session."""
    print("\n" + "=" * 80)
    print("2. Authenticating")
    print("=" * 80)
    try:
        response = requests.post(
            f"{PYTHON_BACKEND_URL}/api/auth/login",
            json={"email": email, "password": password},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            session_id = data.get('session_id')
            cookies = {'session_id': session_id} if session_id else {}
            
            # Also check for cookie in response
            if 'session_id' in response.cookies:
                cookies['session_id'] = response.cookies['session_id']
            
            log_test("Authentication", True, f"Logged in as {email}")
            return {
                "session_id": session_id,
                "cookies": cookies,
                "user": data.get('user', {})
            }
        else:
            log_test("Authentication", False, f"Login failed with status {response.status_code}: {response.text[:200]}")
            return None
    except Exception as e:
        log_test("Authentication", False, f"Login error: {e}")
        return None

async def get_roles(cookies: Dict[str, str]) -> list:
    """Get available roles."""
    try:
        response = requests.get(
            f"{PYTHON_BACKEND_URL}/api/rbac/roles",
            cookies=cookies,
            timeout=10
        )
        if response.status_code == 200:
            return response.json()
        return []
    except Exception as e:
        print(f"⚠️  Error getting roles: {e}")
        return []

async def get_companies(cookies: Dict[str, str]) -> list:
    """Get available companies."""
    try:
        response = requests.get(
            f"{PYTHON_BACKEND_URL}/api/rbac/companies",
            cookies=cookies,
            timeout=10
        )
        if response.status_code == 200:
            return response.json()
        return []
    except Exception as e:
        print(f"⚠️  Error getting companies: {e}")
        return []

async def test_create_user(cookies: Dict[str, str], roles: list, companies: list) -> Optional[Dict[str, Any]]:
    """Test POST /api/rbac/users endpoint."""
    print("\n" + "=" * 80)
    print("3. Testing POST /api/rbac/users (Create User)")
    print("=" * 80)
    
    # Find a valid role_id
    role_id = None
    if roles and len(roles) > 0:
        # Try to find 'crew' role first, then any role
        for role in roles:
            if role.get('role_name', '').lower() == 'crew' or role.get('name', '').lower() == 'crew':
                role_id = role.get('id')
                break
        if not role_id and roles:
            role_id = roles[0].get('id')
    
    # Find a valid company_id
    company_id = None
    if companies and len(companies) > 0:
        company_id = str(companies[0].get('id'))
    
    if not role_id:
        log_test("Create User - Setup", False, "No roles available")
        return None
    
    if not company_id:
        log_test("Create User - Setup", False, "No companies available")
        return None
    
    # Generate unique test user data
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    test_email = f"testuser_{timestamp}@test.com"
    
    user_data = {
        "first_name": "Test",
        "last_name": f"User{timestamp[-6:]}",
        "email": test_email,
        "password": "TestPassword123!",
        "role": "crew",  # Will be converted to role_id
        "company_id": company_id,
        "is_active": True
    }
    
    print(f"Creating user with data: {json.dumps(user_data, indent=2)}")
    
    try:
        # Test Python backend directly
        response = requests.post(
            f"{PYTHON_BACKEND_URL}/api/rbac/users",
            json=user_data,
            cookies=cookies,
            headers={"Content-Type": "application/json"},
            timeout=15
        )
        
        print(f"Response Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 201:
            created_user = response.json()
            user_id = created_user.get('id')
            
            log_test("Create User - API Response", True, f"User created with ID: {user_id}")
            print(f"Created user data: {json.dumps(created_user, indent=2)}")
            
            # Verify in database
            expected_db_data = {
                'first_name': user_data['first_name'],
                'last_name': user_data['last_name'],
                'email': user_data['email'],
                'company_id': company_id,
                'is_active': user_data['is_active'],
                'role_id': role_id
            }
            
            db_verified = await verify_user_in_database(user_id, expected_db_data)
            
            if db_verified:
                log_test("Create User - Database Verification", True, "User data verified in database")
                return created_user
            else:
                log_test("Create User - Database Verification", False, "User data not verified in database")
                return created_user  # Still return user for cleanup
        else:
            error_text = response.text[:500]
            log_test("Create User - API Response", False, f"Status {response.status_code}: {error_text}")
            try:
                error_json = response.json()
                print(f"Error details: {json.dumps(error_json, indent=2)}")
            except:
                pass
            return None
    except Exception as e:
        log_test("Create User - API Response", False, f"Exception: {e}")
        import traceback
        traceback.print_exc()
        return None

async def test_update_user(cookies: Dict[str, str], user_id: str, roles: list) -> bool:
    """Test PATCH /api/rbac/users/{user_id} endpoint."""
    print("\n" + "=" * 80)
    print("4. Testing PATCH /api/rbac/users/{user_id} (Update User)")
    print("=" * 80)
    
    # Find a different role for update
    update_role_id = None
    if roles and len(roles) > 1:
        # Try to find a different role than crew
        for role in roles:
            role_name = role.get('role_name', '').lower() or role.get('name', '').lower()
            if role_name != 'crew':
                update_role_id = role.get('id')
                break
        if not update_role_id:
            update_role_id = roles[1].get('id') if len(roles) > 1 else roles[0].get('id')
    elif roles:
        update_role_id = roles[0].get('id')
    
    update_data = {
        "first_name": "Updated",
        "last_name": "TestUser",
        "is_active": False
    }
    
    if update_role_id:
        update_data["role_id"] = update_role_id
    
    print(f"Updating user {user_id} with data: {json.dumps(update_data, indent=2)}")
    
    try:
        response = requests.patch(
            f"{PYTHON_BACKEND_URL}/api/rbac/users/{user_id}",
            json=update_data,
            cookies=cookies,
            headers={"Content-Type": "application/json"},
            timeout=15
        )
        
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 200:
            updated_user = response.json()
            log_test("Update User - API Response", True, f"User {user_id} updated successfully")
            print(f"Updated user data: {json.dumps(updated_user, indent=2)}")
            
            # Verify in database
            expected_db_data = {
                'first_name': update_data['first_name'],
                'last_name': update_data['last_name'],
                'is_active': update_data['is_active']
            }
            if update_role_id:
                expected_db_data['role_id'] = update_role_id
            
            db_verified = await verify_user_in_database(user_id, expected_db_data)
            
            if db_verified:
                log_test("Update User - Database Verification", True, "User data verified in database")
                return True
            else:
                log_test("Update User - Database Verification", False, "User data not verified in database")
                return False
        else:
            error_text = response.text[:500]
            log_test("Update User - API Response", False, f"Status {response.status_code}: {error_text}")
            try:
                error_json = response.json()
                print(f"Error details: {json.dumps(error_json, indent=2)}")
            except:
                pass
            return False
    except Exception as e:
        log_test("Update User - API Response", False, f"Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

async def cleanup_test_user(user_id: str, cookies: Dict[str, str]):
    """Delete test user."""
    print("\n" + "=" * 80)
    print("5. Cleaning Up Test User")
    print("=" * 80)
    try:
        response = requests.delete(
            f"{PYTHON_BACKEND_URL}/api/rbac/users/{user_id}",
            cookies=cookies,
            timeout=10
        )
        if response.status_code in [200, 204]:
            log_test("Cleanup", True, f"Test user {user_id} deleted")
        else:
            log_test("Cleanup", False, f"Failed to delete test user: {response.status_code}")
    except Exception as e:
        log_test("Cleanup", False, f"Error deleting test user: {e}")

async def main():
    """Run all tests."""
    print("=" * 80)
    print("RBAC User Create/Update Comprehensive Test Suite")
    print("=" * 80)
    print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Check backend health
    if not test_backend_health():
        print("\n❌ Backend is not running. Please start it first.")
        sys.exit(1)
    
    # Get credentials from command line or use defaults
    if len(sys.argv) >= 3:
        email = sys.argv[1]
        password = sys.argv[2]
    else:
        print("\n⚠️  No credentials provided. Using default test credentials.")
        print("Usage: python test_rbac_user_create_update.py <email> <password>")
        email = "daniel@tiento.com"  # Default test user
        password = "password123"  # Default password
    
    # Authenticate
    auth_result = authenticate(email, password)
    if not auth_result:
        print("\n❌ Authentication failed. Cannot proceed with tests.")
        sys.exit(1)
    
    cookies = auth_result['cookies']
    current_user = auth_result['user']
    
    print(f"\n✅ Authenticated as: {current_user.get('email', 'Unknown')}")
    print(f"   User ID: {current_user.get('id', 'Unknown')}")
    print(f"   Is Root Admin: {current_user.get('isRoot', False)}")
    
    # Get roles and companies
    roles = await get_roles(cookies)
    companies = await get_companies(cookies)
    
    print(f"\n📋 Available roles: {len(roles)}")
    print(f"📋 Available companies: {len(companies)}")
    
    if not roles:
        log_test("Setup", False, "No roles available - cannot create users")
        sys.exit(1)
    
    # If no companies but user has company_id, use that
    if not companies:
        user_company_id = current_user.get('companyId') or current_user.get('company_id')
        if user_company_id:
            print(f"⚠️  No companies returned, but user has company_id: {user_company_id}")
            # Create a mock company object for testing
            companies = [{"id": str(user_company_id)}]
            log_test("Setup", True, f"Using user's company_id: {user_company_id}")
        else:
            # Try to create a company if user is admin
            print("⚠️  No companies available. Attempting to create a test company...")
            try:
                company_data = {
                    "name": f"Test Company {datetime.now().strftime('%Y%m%d%H%M%S')}"
                }
                response = requests.post(
                    f"{PYTHON_BACKEND_URL}/api/rbac/companies",
                    json=company_data,
                    cookies=cookies,
                    timeout=10
                )
                if response.status_code == 201:
                    new_company = response.json()
                    companies = [new_company]
                    log_test("Setup - Create Company", True, f"Created test company: {new_company.get('id')}")
                else:
                    log_test("Setup", False, f"Cannot create company: {response.status_code} - {response.text[:200]}")
                    sys.exit(1)
            except Exception as e:
                log_test("Setup", False, f"Cannot create company: {e}")
                sys.exit(1)
    
    if not companies:
        log_test("Setup", False, "No companies available - cannot create users")
        sys.exit(1)
    
    # Test create user
    created_user = await test_create_user(cookies, roles, companies)
    
    if not created_user:
        print("\n❌ User creation failed. Cannot test update.")
        print_summary()
        sys.exit(1)
    
    user_id = created_user.get('id')
    
    # Test update user
    update_success = await test_update_user(cookies, user_id, roles)
    
    # Cleanup
    await cleanup_test_user(user_id, cookies)
    
    # Print summary
    print_summary()

def print_summary():
    """Print test summary."""
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"✅ Passed: {len(test_results['passed'])}")
    print(f"❌ Failed: {len(test_results['failed'])}")
    print(f"⚠️  Warnings: {len(test_results['warnings'])}")
    print()
    
    if test_results['passed']:
        print("PASSED TESTS:")
        for test in test_results['passed']:
            print(f"  ✅ {test}")
        print()
    
    if test_results['failed']:
        print("FAILED TESTS:")
        for test in test_results['failed']:
            print(f"  ❌ {test}")
        print()
    
    if test_results['warnings']:
        print("WARNINGS:")
        for test in test_results['warnings']:
            print(f"  ⚠️  {test}")
        print()
    
    if len(test_results['failed']) == 0:
        print("🎉 ALL TESTS PASSED!")
    else:
        print(f"⚠️  {len(test_results['failed'])} test(s) failed. Please review the errors above.")
    
    print("=" * 80)

if __name__ == "__main__":
    import asyncio
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)

