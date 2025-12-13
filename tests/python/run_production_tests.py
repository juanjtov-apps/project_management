#!/usr/bin/env python3
"""
Quick Production Test Runner
Tests your deployed Proesphere app to verify all functionality works in production.
"""

import requests
import time
import json
from datetime import datetime

def test_deployment(deployment_url):
    """Test deployment endpoints"""
    print(f"🚀 Testing deployment: {deployment_url}")
    print("=" * 60)
    
    results = {"passed": 0, "failed": 0, "tests": []}
    
    def test_endpoint(method, endpoint, data=None, expected_codes=[200], description=""):
        """Test a single endpoint"""
        url = f"{deployment_url}{endpoint}"
        test_name = f"{method} {endpoint}"
        if description:
            test_name += f" ({description})"
        
        try:
            start_time = time.time()
            
            if method.upper() == "GET":
                response = requests.get(url, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, timeout=30)
            else:
                print(f"❌ {test_name} - Unsupported method")
                results["failed"] += 1
                return None
                
            response_time = round((time.time() - start_time) * 1000, 2)
            
            if response.status_code in expected_codes:
                message = f"Status: {response.status_code}, Time: {response_time}ms"
                print(f"✅ {test_name} - {message}")
                results["passed"] += 1
                results["tests"].append({"test": test_name, "status": "PASS", "time": response_time})
                return response
            else:
                error_msg = f"Expected {expected_codes}, got {response.status_code}"
                print(f"❌ {test_name} - {error_msg}")
                results["failed"] += 1
                results["tests"].append({"test": test_name, "status": "FAIL", "error": error_msg})
                return None
                
        except requests.exceptions.Timeout:
            print(f"❌ {test_name} - Timeout (30s)")
            results["failed"] += 1
            results["tests"].append({"test": test_name, "status": "FAIL", "error": "Timeout"})
            return None
        except requests.exceptions.ConnectionError:
            print(f"❌ {test_name} - Connection error")
            results["failed"] += 1
            results["tests"].append({"test": test_name, "status": "FAIL", "error": "Connection error"})
            return None
        except Exception as e:
            print(f"❌ {test_name} - Error: {str(e)}")
            results["failed"] += 1
            results["tests"].append({"test": test_name, "status": "FAIL", "error": str(e)})
            return None
    
    # Test frontend pages
    print("\n🌐 FRONTEND TESTS")
    print("-" * 30)
    test_endpoint("GET", "/", description="Landing page")
    test_endpoint("GET", "/login", description="Login page")
    test_endpoint("GET", "/dashboard", description="Dashboard")
    
    # Test API endpoints  
    print("\n🔌 API TESTS")
    print("-" * 30)
    test_endpoint("GET", "/api/projects", description="Projects API")
    test_endpoint("GET", "/api/tasks", description="Tasks API")
    test_endpoint("GET", "/api/users", description="Users API")
    
    # Test RBAC endpoints
    print("\n🛡️  RBAC TESTS")
    print("-" * 30)
    test_endpoint("GET", "/api/rbac/companies", description="RBAC Companies")
    test_endpoint("GET", "/api/rbac/roles", description="RBAC Roles")
    test_endpoint("GET", "/api/rbac/permissions", description="RBAC Permissions")
    test_endpoint("GET", "/api/rbac/users", description="RBAC Users")
    
    # Test creation (if endpoints allow)
    print("\n📝 CREATE TESTS")
    print("-" * 30)
    
    test_project = {
        "name": f"Production Test {int(time.time())}",
        "description": "Automated production test",
        "location": "Test Location",
        "status": "active",
        "progress": 0
    }
    
    project_response = test_endpoint("POST", "/api/projects", 
                                   data=test_project, 
                                   expected_codes=[200, 201], 
                                   description="Create project")
    
    if project_response:
        try:
            project_data = project_response.json()
            project_id = project_data.get('id')
            
            test_task = {
                "title": f"Production Test Task {int(time.time())}",
                "description": "Automated test task",
                "projectId": project_id,
                "status": "pending",
                "priority": "medium",
                "category": "general"
            }
            
            test_endpoint("POST", "/api/tasks", 
                         data=test_task, 
                         expected_codes=[200, 201], 
                         description="Create task")
                         
        except Exception as e:
            print(f"    Could not parse project response: {e}")
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 PRODUCTION TEST SUMMARY")
    print("=" * 60)
    
    total = results["passed"] + results["failed"]
    success_rate = (results["passed"] / total * 100) if total > 0 else 0
    
    print(f"Total Tests: {total}")
    print(f"Passed: {results['passed']}")
    print(f"Failed: {results['failed']}")
    print(f"Success Rate: {success_rate:.1f}%")
    
    if results["failed"] == 0:
        print("\n✅ ALL TESTS PASSED - DEPLOYMENT IS READY!")
        print("🚀 Your app is working correctly in production!")
    else:
        print(f"\n❌ {results['failed']} TESTS FAILED")
        print("⚠️  Review issues before proceeding with deployment")
    
    # Save results
    with open('production_test_results.json', 'w') as f:
        json.dump({
            'deployment_url': deployment_url,
            'test_summary': {
                'total': total,
                'passed': results['passed'],
                'failed': results['failed'],
                'success_rate': success_rate
            },
            'test_results': results['tests'],
            'timestamp': datetime.now().isoformat()
        }, f, indent=2)
    
    print(f"\nDetailed results saved to: production_test_results.json")
    return results["failed"] == 0

def main():
    """Main function"""
    print("🎯 PROESPHERE PRODUCTION DEPLOYMENT TESTER")
    print("=" * 60)
    
    # Try to auto-detect deployment URL from environment or ask user
    deployment_url = None
    
    # Check common environment variables
    import os
    possible_vars = ['REPLIT_URL', 'DEPLOYMENT_URL', 'APP_URL']
    for var in possible_vars:
        if var in os.environ:
            deployment_url = os.environ[var].rstrip('/')
            print(f"Found deployment URL from {var}: {deployment_url}")
            break
    
    if not deployment_url:
        print("No deployment URL found in environment variables.")
        print("Please enter your deployment URL:")
        print("Examples:")
        print("  - https://your-app-name.your-username.replit.app")
        print("  - https://custom-domain.com")
        print()
        deployment_url = input("Deployment URL: ").strip().rstrip('/')
        
        if not deployment_url:
            print("❌ Deployment URL is required")
            return
    
    # Validate URL format
    if not deployment_url.startswith(('http://', 'https://')):
        deployment_url = 'https://' + deployment_url
    
    print(f"\nTesting deployment at: {deployment_url}")
    print(f"Test started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    success = test_deployment(deployment_url)
    
    if success:
        print("\n🎉 DEPLOYMENT VERIFICATION COMPLETE!")
        print("Your Proesphere app is ready for production use.")
    else:
        print("\n⚠️  DEPLOYMENT ISSUES DETECTED")
        print("Please review the failed tests and address issues before go-live.")

if __name__ == "__main__":
    main()