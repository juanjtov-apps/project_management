#!/usr/bin/env python3
"""
Test script for v1 API endpoints
Tests that all migrated endpoints are accessible at /api/v1/*
"""
import asyncio
import httpx
import sys

BASE_URL = "http://127.0.0.1:8000"

async def test_endpoint(method: str, endpoint: str, expected_status: int = 200, data: dict = None):
    """Test a single endpoint"""
    url = f"{BASE_URL}{endpoint}"
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            if method == "GET":
                response = await client.get(url)
            elif method == "POST":
                response = await client.post(url, json=data)
            elif method == "PATCH":
                response = await client.patch(url, json=data)
            elif method == "DELETE":
                response = await client.delete(url)
            else:
                return False, f"Unknown method: {method}"
            
            success = response.status_code == expected_status
            status_icon = "✅" if success else "❌"
            print(f"{status_icon} {method:6} {endpoint:40} → {response.status_code} (expected {expected_status})")
            return success, response.status_code
    except Exception as e:
        print(f"❌ {method:6} {endpoint:40} → ERROR: {e}")
        return False, str(e)

async def main():
    print("🧪 Testing v1 API Endpoints")
    print("=" * 70)
    
    tests = [
        # Health check
        ("GET", "/health", 200),
        
        # Auth endpoints (may return 401 if not authenticated, which is OK)
        ("GET", "/api/v1/auth/user", [200, 401]),
        ("POST", "/api/v1/auth/login", [200, 401], {"email": "test@test.com", "password": "test"}),
        
        # Projects
        ("GET", "/api/v1/projects", [200, 401]),
        
        # Tasks
        ("GET", "/api/v1/tasks", [200, 401]),
        
        # Photos
        ("GET", "/api/v1/photos", [200, 401]),
        
        # Logs
        ("GET", "/api/v1/logs", [200, 401]),
        
        # Companies
        ("GET", "/api/v1/companies", [200, 401]),
        
        # Users
        ("GET", "/api/v1/users", [200, 401]),
        
        # Dashboard
        ("GET", "/api/v1/dashboard/stats", [200, 401]),
        
        # Activities
        ("GET", "/api/v1/activities", [200, 401]),
        
        # Objects
        ("POST", "/api/v1/objects/upload", [200, 401], {}),
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        method = test[0]
        endpoint = test[1]
        expected = test[2] if isinstance(test[2], list) else [test[2]]
        data = test[3] if len(test) > 3 else None
        
        success, status = await test_endpoint(method, endpoint, expected[0], data)
        
        # Check if status matches any expected status
        if status in expected:
            passed += 1
        else:
            failed += 1
    
    print("\n" + "=" * 70)
    print(f"📊 Test Results: {passed} passed, {failed} failed")
    print("=" * 70)
    
    # Check if Python backend is running
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{BASE_URL}/health")
            if response.status_code == 200:
                print("✅ Python backend is running")
            else:
                print("⚠️  Python backend health check failed")
    except Exception as e:
        print(f"❌ Cannot connect to Python backend at {BASE_URL}")
        print(f"   Make sure the backend is running: cd python_backend && python3 main.py")
        return 1
    
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

