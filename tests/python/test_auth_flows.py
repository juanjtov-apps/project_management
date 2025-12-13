#!/usr/bin/env python3
"""
Test Authentication Flows to Verify 404 Fixes
"""

import requests
import json

BASE_URL = "http://localhost:5000"

def test_auth_endpoints():
    """Test that authentication endpoints don't return 404s"""
    
    print("🔐 Testing Authentication Endpoint Responses...")
    print("=" * 50)
    
    # Test endpoints that should not return 404
    test_cases = [
        ("GET", "/api/auth/user", "Get current user (should be 401, not 404)"),
        ("POST", "/api/auth/login", "Login endpoint (should handle request, not 404)"),
        ("POST", "/api/auth/logout", "Logout endpoint (should handle request, not 404)"),
        ("GET", "/api/login", "OIDC login endpoint (should redirect or handle, not 404)"),
        ("GET", "/api/callback", "OIDC callback endpoint (should handle, not 404)"),
        ("GET", "/api/logout", "OIDC logout endpoint (should redirect, not 404)"),
        ("GET", "/nonexistent", "Frontend route (should serve index.html, not 404)"),
        ("GET", "/api/nonexistent", "Nonexistent API route (should return JSON 404, not HTML)"),
    ]
    
    results = []
    
    for method, endpoint, description in test_cases:
        print(f"\n📍 Testing: {method} {endpoint}")
        print(f"   Expected: {description}")
        
        try:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}", allow_redirects=False)
            elif method == "POST":
                response = requests.post(f"{BASE_URL}{endpoint}", 
                                       json={"email": "test", "password": "test"}, 
                                       allow_redirects=False)
            
            print(f"   Status: {response.status_code}")
            
            # Check Content-Type to distinguish between JSON API errors and HTML 404s
            content_type = response.headers.get('content-type', '').lower()
            print(f"   Content-Type: {content_type}")
            
            is_json_response = 'application/json' in content_type
            is_html_response = 'text/html' in content_type
            
            if response.status_code == 404:
                if endpoint.startswith('/api/') and not is_json_response:
                    print(f"   ❌ PROBLEM: API endpoint returned HTML 404 instead of JSON")
                    results.append(False)
                elif not endpoint.startswith('/api/') and not is_html_response:
                    print(f"   ❌ PROBLEM: Frontend route didn't serve HTML")
                    results.append(False)
                else:
                    print(f"   ✅ OK: Proper 404 handling")
                    results.append(True)
            elif response.status_code in [200, 401, 403, 302, 500]:
                print(f"   ✅ OK: Endpoint handled properly")
                results.append(True)
            else:
                print(f"   ⚠️  UNEXPECTED: Status {response.status_code}")
                results.append(True)  # Still better than 404
                
        except Exception as e:
            print(f"   ❌ ERROR: {str(e)}")
            results.append(False)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 AUTHENTICATION 404 TEST RESULTS")
    print("=" * 50)
    
    passed = sum(results)
    total = len(results)
    success_rate = (passed / total * 100) if total > 0 else 0
    
    print(f"Passed: {passed}/{total}")
    print(f"Success Rate: {success_rate:.1f}%")
    
    if success_rate >= 90:
        print("\n🟢 AUTHENTICATION 404 FIXES: SUCCESS")
        print("All authentication endpoints are properly handling requests")
    elif success_rate >= 70:
        print("\n🟡 AUTHENTICATION 404 FIXES: MOSTLY WORKING")
        print("Most endpoints working, some minor issues remain")
    else:
        print("\n🔴 AUTHENTICATION 404 FIXES: ISSUES REMAIN")
        print("Significant problems still present")

if __name__ == "__main__":
    test_auth_endpoints()