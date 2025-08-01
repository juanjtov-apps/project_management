#!/usr/bin/env python3
"""
Manual Endpoint Testing Script
Test all the key endpoints that were mentioned in the user requirements.
"""

import requests
import json
import time

def test_endpoint(method, url, data=None, description=""):
    """Test a single endpoint"""
    try:
        if method.upper() == "GET":
            response = requests.get(url, timeout=10)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, timeout=10)
        elif method.upper() == "PATCH":
            response = requests.patch(url, json=data, timeout=10)
        elif method.upper() == "DELETE":
            response = requests.delete(url, timeout=10)
        
        status_icon = "✅" if response.status_code < 400 else "❌"
        print(f"{status_icon} {method} {url} - {response.status_code} - {description}")
        
        if response.status_code >= 400:
            try:
                error_data = response.json()
                print(f"    Error: {error_data.get('message', 'Unknown error')}")
            except:
                print(f"    Error: {response.text[:100]}")
        
        return response.status_code < 400
        
    except Exception as e:
        print(f"❌ {method} {url} - Connection Error - {description}")
        print(f"    Error: {str(e)}")
        return False

def main():
    """Test all major endpoints"""
    print("🧪 Testing All Major API Endpoints")
    print("=" * 60)
    
    base_url = "http://localhost:8000"
    express_url = "http://localhost:5000"
    
    # Test if servers are running
    print("\n📡 Server Connectivity Tests")
    test_endpoint("GET", f"{express_url}", description="Express frontend server")
    test_endpoint("GET", f"{base_url}/docs", description="FastAPI documentation")
    
    # Test main application endpoints
    print("\n🏗️ Core Application Endpoints")
    endpoints = [
        ("GET", "/api/projects", None, "List projects"),
        ("GET", "/api/tasks", None, "List tasks"),
        ("GET", "/api/users", None, "List users"),
        ("GET", "/api/logs", None, "List project logs"),
        ("GET", "/api/photos", None, "List photos"),
        ("GET", "/api/notifications", None, "List notifications"),
        ("GET", "/api/schedule-changes", None, "List schedule changes"),
        ("GET", "/api/dashboard/stats", None, "Dashboard statistics"),
    ]
    
    for method, endpoint, data, description in endpoints:
        test_endpoint(method, f"{base_url}{endpoint}", data, description)
    
    # Test RBAC endpoints
    print("\n🔐 RBAC System Endpoints")
    rbac_endpoints = [
        ("GET", "/rbac/companies", None, "List companies"),
        ("GET", "/rbac/role-templates", None, "List role templates"),
        ("GET", "/rbac/permissions", None, "List permissions"),
    ]
    
    for method, endpoint, data, description in rbac_endpoints:
        test_endpoint(method, f"{base_url}{endpoint}", data, description)
    
    # Test Express proxy endpoints
    print("\n🔀 Express Proxy Endpoints")
    proxy_endpoints = [
        ("GET", "/api/projects", None, "Projects via Express proxy"),
        ("GET", "/api/tasks", None, "Tasks via Express proxy"),
        ("GET", "/api/auth/user", None, "Current user via Express"),
    ]
    
    for method, endpoint, data, description in proxy_endpoints:
        test_endpoint(method, f"{express_url}{endpoint}", data, description)
    
    # Test creating data
    print("\n📝 Data Creation Tests")
    
    # Test project creation
    project_data = {
        "name": "Test Project",
        "description": "Test project description",
        "location": "Test Location",
        "status": "active",
        "progress": 0
    }
    test_endpoint("POST", f"{base_url}/api/projects", project_data, "Create project")
    
    # Test task creation
    task_data = {
        "title": "Test Task",
        "description": "Test task description",
        "category": "project",
        "status": "pending",
        "priority": "medium"
    }
    test_endpoint("POST", f"{base_url}/api/tasks", task_data, "Create task")
    
    print("\n🎯 Test Summary")
    print("Check the results above to see which endpoints are working.")
    print("Expected: Some endpoints may return 401 (auth required) or 404 (no data)")
    print("Unexpected: Connection refused or 500 errors indicate server issues")

if __name__ == "__main__":
    main()