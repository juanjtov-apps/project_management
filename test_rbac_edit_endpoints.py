#!/usr/bin/env python3
"""
Comprehensive RBAC Edit Endpoints Test Battery
Tests all endpoints used by the edit buttons in the RBAC Admin interface
"""

import requests
import json
import sys
from datetime import datetime

# Base URL for the API
BASE_URL = "http://localhost:8000/api/rbac"

def test_endpoint(method, url, data=None, expected_status=200):
    """Test an endpoint and return results"""
    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=data, headers={'Content-Type': 'application/json'})
        elif method == "PATCH":
            response = requests.patch(url, json=data, headers={'Content-Type': 'application/json'})
        elif method == "DELETE":
            response = requests.delete(url)
        
        result = {
            'method': method,
            'url': url,
            'status': response.status_code,
            'success': response.status_code == expected_status,
            'data': response.text[:200] if response.text else None,
            'response_time': response.elapsed.total_seconds()
        }
        
        return result
    except Exception as e:
        return {
            'method': method,
            'url': url,
            'status': 'ERROR',
            'success': False,
            'data': str(e),
            'response_time': 0
        }

def run_test_battery():
    """Run comprehensive test battery for all RBAC edit endpoints"""
    
    print("=" * 60)
    print("RBAC EDIT ENDPOINTS TEST BATTERY")
    print("=" * 60)
    print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    tests = []
    
    # === USER ENDPOINTS ===
    print("🔍 Testing USER endpoints...")
    
    # Get users (to verify data exists)
    tests.append(test_endpoint("GET", f"{BASE_URL}/users"))
    
    # Update user (simulate edit button functionality)
    user_update_data = {
        "email": "updated.admin@towerflow.com",
        "first_name": "Updated",
        "last_name": "Admin",
        "company_id": "platform",
        "role_id": "1",
        "is_active": True
    }
    tests.append(test_endpoint("PATCH", f"{BASE_URL}/users/admin-001", user_update_data))
    
    # Create user (for completeness)
    user_create_data = {
        "email": "test.user@test.com",
        "first_name": "Test",
        "last_name": "User",
        "company_id": "comp-001",
        "role_id": "3",
        "password": "testpass123"
    }
    tests.append(test_endpoint("POST", f"{BASE_URL}/users", user_create_data))
    
    # === ROLE ENDPOINTS ===
    print("🔍 Testing ROLE endpoints...")
    
    # Get roles
    tests.append(test_endpoint("GET", f"{BASE_URL}/roles"))
    
    # Update role (simulate edit button functionality)
    role_update_data = {
        "name": "Updated Platform Admin",
        "description": "Updated description for platform admin role",
        "company_id": "platform",
        "is_template": True
    }
    tests.append(test_endpoint("PATCH", f"{BASE_URL}/roles/1", role_update_data))
    
    # Create role
    role_create_data = {
        "name": "Test Role",
        "description": "Test role for validation",
        "company_id": "comp-001",
        "permissions": ["1", "5", "10"],
        "is_template": False
    }
    tests.append(test_endpoint("POST", f"{BASE_URL}/roles", role_create_data))
    
    # === COMPANY ENDPOINTS ===
    print("🔍 Testing COMPANY endpoints...")
    
    # Get companies
    tests.append(test_endpoint("GET", f"{BASE_URL}/companies"))
    
    # Update company (simulate edit button functionality)
    company_update_data = {
        "name": "Updated ABC Construction",
        "type": "customer",
        "subscription_tier": "enterprise",
        "is_active": True
    }
    tests.append(test_endpoint("PATCH", f"{BASE_URL}/companies/comp-001", company_update_data))
    
    # Create company
    company_create_data = {
        "name": "Test Company Ltd",
        "type": "customer",
        "subscription_tier": "basic"
    }
    tests.append(test_endpoint("POST", f"{BASE_URL}/companies", company_create_data))
    
    # === PERMISSIONS ENDPOINTS ===
    print("🔍 Testing PERMISSIONS endpoints...")
    
    # Get permissions (read-only, but critical for edit forms)
    tests.append(test_endpoint("GET", f"{BASE_URL}/permissions"))
    
    # === ERROR HANDLING TESTS ===
    print("🔍 Testing ERROR HANDLING...")
    
    # Test invalid user ID
    tests.append(test_endpoint("PATCH", f"{BASE_URL}/users/nonexistent", {"email": "test@test.com"}, 404))
    
    # Test invalid role ID  
    tests.append(test_endpoint("PATCH", f"{BASE_URL}/roles/999", {"name": "Test"}, 404))
    
    # Test invalid company ID
    tests.append(test_endpoint("PATCH", f"{BASE_URL}/companies/nonexistent", {"name": "Test"}, 404))
    
    # === TEST RESULTS SUMMARY ===
    print("\n" + "=" * 60)
    print("TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = 0
    failed = 0
    total_time = 0
    
    for i, test in enumerate(tests, 1):
        status_icon = "✅" if test['success'] else "❌"
        print(f"{status_icon} Test {i:2d}: {test['method']} {test['url'].replace(BASE_URL, '')}")
        print(f"         Status: {test['status']}, Time: {test['response_time']:.3f}s")
        
        if test['success']:
            passed += 1
        else:
            failed += 1
            print(f"         Error: {test['data']}")
        
        total_time += test['response_time']
        print()
    
    # === DATABASE CONNECTIVITY TEST ===
    print("=" * 60)
    print("DATABASE CONNECTIVITY VERIFICATION")
    print("=" * 60)
    
    try:
        # Test if we can retrieve and count all data
        users_response = requests.get(f"{BASE_URL}/users")
        roles_response = requests.get(f"{BASE_URL}/roles")
        companies_response = requests.get(f"{BASE_URL}/companies")
        permissions_response = requests.get(f"{BASE_URL}/permissions")
        
        if all(r.status_code == 200 for r in [users_response, roles_response, companies_response, permissions_response]):
            users_count = len(users_response.json())
            roles_count = len(roles_response.json())
            companies_count = len(companies_response.json())
            permissions_count = len(permissions_response.json())
            
            print("✅ Database connectivity: HEALTHY")
            print(f"✅ Data integrity verified:")
            print(f"   - Users: {users_count}")
            print(f"   - Roles: {roles_count}")
            print(f"   - Companies: {companies_count}")
            print(f"   - Permissions: {permissions_count}")
        else:
            print("❌ Database connectivity: ISSUES DETECTED")
            
    except Exception as e:
        print(f"❌ Database connectivity: ERROR - {e}")
    
    print("\n" + "=" * 60)
    print("FINAL SUMMARY")
    print("=" * 60)
    print(f"✅ Tests Passed: {passed}")
    print(f"❌ Tests Failed: {failed}")
    print(f"📊 Success Rate: {(passed/(passed+failed)*100):.1f}%")
    print(f"⏱️  Total Time: {total_time:.3f}s")
    print(f"🔗 Edit Buttons: {'FUNCTIONAL' if failed == 0 else 'NEEDS ATTENTION'}")
    
    return failed == 0

if __name__ == "__main__":
    success = run_test_battery()
    sys.exit(0 if success else 1)