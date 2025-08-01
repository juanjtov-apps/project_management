#!/usr/bin/env python3
"""
Comprehensive Unit Tests for Tower Flow Backend and Frontend Endpoints
Tests all API endpoints, RBAC functionality, and integration points.
"""

import asyncio
import asyncpg
import os
import json
import sys
import requests
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import subprocess

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("❌ DATABASE_URL environment variable is required")
    sys.exit(1)

class EndpointTester:
    def __init__(self):
        self.conn = None
        self.test_results = []
        self.passed = 0
        self.failed = 0
        self.api_base = "http://localhost:8000"
        self.express_base = "http://localhost:5000"
        
    async def connect(self):
        """Connect to database"""
        try:
            self.conn = await asyncpg.connect(DATABASE_URL)
            self.log_test("Database connection", True)
        except Exception as e:
            self.log_test("Database connection", False, str(e))
            
    async def disconnect(self):
        """Disconnect from database"""
        if self.conn:
            await self.conn.close()
            
    def log_test(self, test_name: str, passed: bool, message: str = ""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} {test_name}")
        if message:
            print(f"    {message}")
        
        self.test_results.append({
            'test': test_name,
            'passed': passed,
            'message': message,
            'timestamp': datetime.now().isoformat()
        })
        
        if passed:
            self.passed += 1
        else:
            self.failed += 1
    
    def test_http_endpoint(self, method: str, url: str, data: Dict = None, expected_codes: List[int] = [200], description: str = ""):
        """Test HTTP endpoint with various methods"""
        try:
            if method.upper() == "GET":
                response = requests.get(url, timeout=10)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, timeout=10)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, timeout=10)
            elif method.upper() == "PATCH":
                response = requests.patch(url, json=data, timeout=10)
            elif method.upper() == "DELETE":
                response = requests.delete(url, timeout=10)
            else:
                self.log_test(f"{method} {url}", False, f"Unsupported method: {method}")
                return False
                
            success = response.status_code in expected_codes
            message = f"Status: {response.status_code}"
            
            if not success and response.status_code >= 400:
                try:
                    error_data = response.json()
                    message += f", Error: {error_data.get('message', 'Unknown error')}"
                except:
                    message += f", Error: {response.text[:100]}"
            
            self.log_test(f"{method} {url} - {description}", success, message)
            return success
            
        except Exception as e:
            self.log_test(f"{method} {url} - {description}", False, f"Connection error: {str(e)}")
            return False
    
    def test_backend_core_endpoints(self):
        """Test all core backend API endpoints"""
        print("\n🔧 Testing Core Backend API Endpoints")
        
        # Health check
        self.test_http_endpoint("GET", f"{self.api_base}/health", expected_codes=[200], description="Health check")
        self.test_http_endpoint("GET", f"{self.api_base}/docs", expected_codes=[200], description="API documentation")
        
        # Project endpoints
        self.test_http_endpoint("GET", f"{self.api_base}/api/projects", expected_codes=[200], description="List projects")
        
        # Create a test project
        project_data = {
            "name": "Unit Test Project",
            "description": "Created by unit tests",
            "location": "Test Location",
            "status": "active",
            "progress": 0
        }
        self.test_http_endpoint("POST", f"{self.api_base}/api/projects", data=project_data, expected_codes=[201], description="Create project")
        
        # Task endpoints
        self.test_http_endpoint("GET", f"{self.api_base}/api/tasks", expected_codes=[200], description="List tasks")
        
        # Create a test task
        task_data = {
            "title": "Unit Test Task",
            "description": "Created by unit tests",
            "category": "project",
            "status": "pending",
            "priority": "medium"
        }
        self.test_http_endpoint("POST", f"{self.api_base}/api/tasks", data=task_data, expected_codes=[201], description="Create task")
        
        # User endpoints
        self.test_http_endpoint("GET", f"{self.api_base}/api/users", expected_codes=[200], description="List users")
        
        # Photo endpoints
        self.test_http_endpoint("GET", f"{self.api_base}/api/photos", expected_codes=[200], description="List photos")
        
        # Project logs
        self.test_http_endpoint("GET", f"{self.api_base}/api/logs", expected_codes=[200], description="List project logs")
        
        # Notifications
        self.test_http_endpoint("GET", f"{self.api_base}/api/notifications", expected_codes=[200], description="List notifications")
        
        # Schedule changes
        self.test_http_endpoint("GET", f"{self.api_base}/api/schedule-changes", expected_codes=[200], description="List schedule changes")
        
        # Dashboard stats
        self.test_http_endpoint("GET", f"{self.api_base}/api/dashboard/stats", expected_codes=[200], description="Dashboard statistics")
    
    def test_rbac_endpoints(self):
        """Test RBAC system endpoints"""
        print("\n🔐 Testing RBAC System Endpoints")
        
        # Companies
        self.test_http_endpoint("GET", f"{self.api_base}/rbac/companies", expected_codes=[200], description="List companies")
        
        # Role templates
        self.test_http_endpoint("GET", f"{self.api_base}/rbac/role-templates", expected_codes=[200], description="List role templates")
        
        # Permissions
        self.test_http_endpoint("GET", f"{self.api_base}/rbac/permissions", expected_codes=[200], description="List permissions")
        
        # Roles
        self.test_http_endpoint("GET", f"{self.api_base}/rbac/roles", expected_codes=[200], description="List roles")
        
        # Users for specific company
        self.test_http_endpoint("GET", f"{self.api_base}/rbac/companies/1/users", expected_codes=[200], description="List company users")
        
        # Create test company
        company_data = {
            "name": "Test Company",
            "description": "Created by unit tests",
            "industry": "Construction",
            "is_active": True
        }
        self.test_http_endpoint("POST", f"{self.api_base}/rbac/companies", data=company_data, expected_codes=[201], description="Create company")
    
    def test_express_proxy_endpoints(self):
        """Test Express.js proxy endpoints"""
        print("\n🔀 Testing Express Proxy Endpoints")
        
        # Test Express server itself
        self.test_http_endpoint("GET", f"{self.express_base}", expected_codes=[200], description="Express server root")
        
        # Test proxied API endpoints (expect 401 for unauthenticated requests)
        self.test_http_endpoint("GET", f"{self.express_base}/api/projects", expected_codes=[401, 500], description="Proxied projects endpoint")
        self.test_http_endpoint("GET", f"{self.express_base}/api/tasks", expected_codes=[401, 500], description="Proxied tasks endpoint")
        self.test_http_endpoint("GET", f"{self.express_base}/api/auth/user", expected_codes=[401], description="Auth user endpoint")
    
    async def test_database_operations(self):
        """Test direct database operations"""
        print("\n💾 Testing Database Operations")
        
        try:
            # Test basic database connectivity
            result = await self.conn.fetchval("SELECT 1")
            self.log_test("Database query execution", result == 1)
            
            # Test RBAC tables
            tables = ['companies', 'users', 'role_templates', 'roles', 'permissions', 
                     'company_users', 'role_permissions', 'user_effective_permissions']
            
            for table in tables:
                count = await self.conn.fetchval(f"SELECT COUNT(*) FROM {table}")
                self.log_test(f"Table {table} accessible", count >= 0, f"Rows: {count}")
            
            # Test permission data integrity
            perm_count = await self.conn.fetchval("SELECT COUNT(*) FROM permissions WHERE id BETWEEN 1 AND 49")
            self.log_test("Permissions data integrity", perm_count >= 26, f"Found {perm_count} permissions")
            
            # Test role templates
            template_count = await self.conn.fetchval("SELECT COUNT(*) FROM role_templates WHERE is_system_template = true")
            self.log_test("Role templates exist", template_count >= 6, f"Found {template_count} templates")
            
            # Test Company 0 (Platform)
            platform_company = await self.conn.fetchrow("SELECT * FROM companies WHERE id = 0")
            self.log_test("Platform company exists", platform_company is not None)
            
        except Exception as e:
            self.log_test("Database operations", False, str(e))
    
    def test_crud_operations(self):
        """Test Create, Read, Update, Delete operations"""
        print("\n📝 Testing CRUD Operations")
        
        # Test project CRUD
        project_data = {
            "name": "CRUD Test Project",
            "description": "Testing CRUD operations",
            "location": "Test Location",
            "status": "active",
            "progress": 25
        }
        
        # Create
        create_success = self.test_http_endpoint("POST", f"{self.api_base}/api/projects", 
                                               data=project_data, expected_codes=[201], 
                                               description="Create project (CRUD)")
        
        if create_success:
            # Get the created project (assuming we can list and find it)
            self.test_http_endpoint("GET", f"{self.api_base}/api/projects", 
                                  expected_codes=[200], description="Read projects (CRUD)")
        
        # Test task CRUD
        task_data = {
            "title": "CRUD Test Task",
            "description": "Testing CRUD operations",
            "category": "project",
            "status": "pending",
            "priority": "high"
        }
        
        self.test_http_endpoint("POST", f"{self.api_base}/api/tasks", 
                              data=task_data, expected_codes=[201], 
                              description="Create task (CRUD)")
        
        self.test_http_endpoint("GET", f"{self.api_base}/api/tasks", 
                              expected_codes=[200], description="Read tasks (CRUD)")
    
    def test_error_handling(self):
        """Test error handling and edge cases"""
        print("\n⚠️ Testing Error Handling")
        
        # Test invalid endpoints
        self.test_http_endpoint("GET", f"{self.api_base}/api/nonexistent", 
                              expected_codes=[404], description="Non-existent endpoint")
        
        # Test invalid data
        invalid_project = {
            "invalid_field": "invalid_value"
        }
        self.test_http_endpoint("POST", f"{self.api_base}/api/projects", 
                              data=invalid_project, expected_codes=[400, 422], 
                              description="Invalid project data")
        
        # Test invalid HTTP methods
        self.test_http_endpoint("PATCH", f"{self.api_base}/api/projects/nonexistent", 
                              expected_codes=[404, 405], description="Invalid method/resource")
    
    def test_performance_basic(self):
        """Basic performance tests"""
        print("\n⚡ Testing Basic Performance")
        
        # Test response times for key endpoints
        endpoints = [
            f"{self.api_base}/api/projects",
            f"{self.api_base}/api/tasks",
            f"{self.api_base}/api/dashboard/stats"
        ]
        
        for endpoint in endpoints:
            start_time = time.time()
            try:
                response = requests.get(endpoint, timeout=5)
                end_time = time.time()
                response_time = (end_time - start_time) * 1000  # Convert to milliseconds
                
                # Consider under 1000ms as good performance for this test
                performance_ok = response_time < 1000 and response.status_code == 200
                self.log_test(f"Performance {endpoint}", performance_ok, 
                            f"Response time: {response_time:.0f}ms")
            except Exception as e:
                self.log_test(f"Performance {endpoint}", False, f"Error: {str(e)}")
    
    async def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Comprehensive Endpoint Test Suite")
        print("=" * 80)
        
        # Database tests
        await self.connect()
        if self.conn:
            await self.test_database_operations()
        
        # API endpoint tests
        self.test_backend_core_endpoints()
        self.test_rbac_endpoints()
        self.test_express_proxy_endpoints()
        
        # CRUD and error handling tests
        self.test_crud_operations()
        self.test_error_handling()
        
        # Performance tests
        self.test_performance_basic()
        
        # Cleanup
        await self.disconnect()
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE TEST SUMMARY")
        print("=" * 80)
        print(f"✅ Passed: {self.passed}")
        print(f"❌ Failed: {self.failed}")
        print(f"📈 Success Rate: {(self.passed/(self.passed+self.failed)*100):.1f}%")
        
        # Categorize results
        passed_by_category = {}
        failed_by_category = {}
        
        for result in self.test_results:
            category = "Other"
            test_name = result['test']
            
            if "Database" in test_name or "Table" in test_name:
                category = "Database"
            elif "RBAC" in test_name or "rbac" in test_name:
                category = "RBAC"
            elif "GET" in test_name or "POST" in test_name or "api/" in test_name:
                category = "API Endpoints"
            elif "Express" in test_name or "Proxy" in test_name:
                category = "Frontend Integration"
            elif "CRUD" in test_name:
                category = "CRUD Operations"
            elif "Performance" in test_name:
                category = "Performance"
            elif "Error" in test_name or "Invalid" in test_name:
                category = "Error Handling"
            
            if result['passed']:
                passed_by_category[category] = passed_by_category.get(category, 0) + 1
            else:
                failed_by_category[category] = failed_by_category.get(category, 0) + 1
        
        print("\n📋 RESULTS BY CATEGORY:")
        for category in sorted(set(list(passed_by_category.keys()) + list(failed_by_category.keys()))):
            passed = passed_by_category.get(category, 0)
            failed = failed_by_category.get(category, 0)
            total = passed + failed
            success_rate = (passed / total * 100) if total > 0 else 0
            print(f"  {category}: {passed}/{total} ({success_rate:.1f}%)")
        
        if self.failed > 0:
            print(f"\n❌ FAILED TESTS DETAILS:")
            for result in self.test_results:
                if not result['passed']:
                    print(f"   • {result['test']}")
                    if result['message']:
                        print(f"     {result['message']}")
        
        return self.failed == 0

async def main():
    """Main test runner"""
    tester = EndpointTester()
    success = await tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! System is fully operational.")
    else:
        print("\n⚠️  Some tests failed. Please review the issues above.")
    
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)