#!/usr/bin/env python3
"""
Comprehensive API Test Battery for Proesphere Construction Management System

This script tests all major API endpoints to ensure the FastAPI backend 
is working correctly after migration from Node.js.

Usage: python test_api_endpoints.py
"""

import asyncio
import httpx
import json
import sys
from typing import Dict, List, Any

class APITester:
    def __init__(self, base_url: str = "http://127.0.0.1:8000"):
        self.base_url = base_url
        self.session_cookies = None
        self.passed_tests = 0
        self.failed_tests = 0
        
    async def test_endpoint(self, method: str, endpoint: str, expected_status: int = 200, 
                           data: Dict = None, description: str = "") -> Dict[str, Any]:
        """Test a single API endpoint"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                if method.upper() == "GET":
                    response = await client.get(url, cookies=self.session_cookies)
                elif method.upper() == "POST":
                    response = await client.post(url, json=data, cookies=self.session_cookies)
                elif method.upper() == "PATCH":
                    response = await client.patch(url, json=data, cookies=self.session_cookies)
                elif method.upper() == "DELETE":
                    response = await client.delete(url, cookies=self.session_cookies)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                status_ok = response.status_code == expected_status
                
                if status_ok:
                    self.passed_tests += 1
                    status_symbol = "✅"
                else:
                    self.failed_tests += 1
                    status_symbol = "❌"
                
                # Try to parse JSON response
                try:
                    response_data = response.json()
                    data_preview = str(response_data)[:100] + "..." if len(str(response_data)) > 100 else str(response_data)
                except:
                    data_preview = response.text[:100] + "..." if len(response.text) > 100 else response.text
                
                result = {
                    "endpoint": endpoint,
                    "method": method.upper(),
                    "status_code": response.status_code,
                    "expected": expected_status,
                    "passed": status_ok,
                    "response_preview": data_preview,
                    "description": description
                }
                
                print(f"{status_symbol} {method.upper()} {endpoint} → {response.status_code} | {description}")
                
                return result
                
        except Exception as e:
            self.failed_tests += 1
            print(f"❌ {method.upper()} {endpoint} → ERROR: {str(e)} | {description}")
            return {
                "endpoint": endpoint,
                "method": method.upper(),
                "status_code": "ERROR",
                "expected": expected_status,
                "passed": False,
                "response_preview": str(e),
                "description": description
            }

    async def authenticate(self):
        """Authenticate with test credentials"""
        print("🔐 Authenticating with test credentials...")
        
        login_data = {
            "email": "daniel@tiento.com",
            "password": "password123"
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(f"{self.base_url}/api/auth/login", json=login_data)
                
                if response.status_code == 200:
                    self.session_cookies = response.cookies
                    print("✅ Authentication successful")
                    return True
                else:
                    print(f"❌ Authentication failed: {response.status_code}")
                    print(f"Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            return False

    async def run_all_tests(self):
        """Run comprehensive API test battery"""
        print("🚀 Starting Proesphere API Test Battery")
        print("=" * 60)
        
        # Authenticate first
        if not await self.authenticate():
            print("❌ Cannot proceed without authentication")
            return False
        
        print("\n📊 Testing Core Dashboard Endpoints...")
        await self.test_endpoint("GET", "/api/auth/user", 200, description="Current user info")
        await self.test_endpoint("GET", "/api/dashboard/stats", 200, description="Dashboard statistics")
        await self.test_endpoint("GET", "/api/activities", 200, description="Recent activities")
        
        print("\n🏗️ Testing Project Management...")
        await self.test_endpoint("GET", "/api/projects", 200, description="List all projects")
        
        print("\n✅ Testing Task Management...")
        await self.test_endpoint("GET", "/api/tasks", 200, description="List all tasks")
        
        print("\n📸 Testing Photo Management...")
        await self.test_endpoint("GET", "/api/photos", 200, description="List all photos")
        
        print("\n📅 Testing Schedule Management...")
        await self.test_endpoint("GET", "/api/schedule", 200, description="Schedule changes")
        
        print("\n👥 Testing User Management...")
        await self.test_endpoint("GET", "/api/users", 200, description="List all users")
        await self.test_endpoint("GET", "/api/users/managers", 200, description="List managers")
        
        print("\n🔔 Testing Notifications...")
        await self.test_endpoint("GET", "/api/notifications", 200, description="User notifications")
        
        print("\n🛡️ Testing Permission System...")
        await self.test_endpoint("GET", "/api/companies", 403, description="Companies (platform admin only)")
        
        print("\n📋 Testing Subcontractor Management...")
        await self.test_endpoint("GET", "/api/subcontractor-assignments", 307, description="Subcontractor assignments redirect")
        
        # Summary
        total_tests = self.passed_tests + self.failed_tests
        success_rate = (self.passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print("\n" + "=" * 60)
        print("📈 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {self.passed_tests}")
        print(f"❌ Failed: {self.failed_tests}")
        print(f"📊 Success Rate: {success_rate:.1f}%")
        
        if self.failed_tests == 0:
            print("\n🎉 ALL TESTS PASSED! The FastAPI backend is working perfectly.")
            return True
        else:
            print(f"\n⚠️  {self.failed_tests} tests failed. Please check the endpoints above.")
            return False

async def main():
    """Main test runner"""
    print("Proesphere Construction Management System")
    print("FastAPI Backend Test Battery")
    print("=" * 60)
    
    tester = APITester()
    success = await tester.run_all_tests()
    
    if success:
        print("\n✅ Backend is ready for deployment!")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Please fix issues before deployment.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())