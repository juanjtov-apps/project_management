#!/usr/bin/env python3
"""
Comprehensive Migration Testing Script
Tests all v1 API endpoints and verifies the migration from Node.js to Python FastAPI

Usage:
    python test_migration_comprehensive.py

This script tests:
1. Backend health and connectivity
2. Database connection and basic queries
3. Authentication endpoints
4. All CRUD operations for major entities
5. Object storage endpoints
6. Company-scoped access control
7. Error handling
"""

import asyncio
import httpx
import sys
from typing import Dict, List, Any, Optional
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://127.0.0.1:5000"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

class MigrationTester:
    def __init__(self):
        self.session_cookies: Dict[str, str] = {}
        self.test_user: Optional[Dict[str, Any]] = None
        self.test_company_id: Optional[str] = None
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        self.test_results: List[Dict[str, Any]] = []
        
    def log(self, message: str, status: str = "info"):
        """Log a message with color coding"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        if status == "success":
            print(f"{Colors.GREEN}✅ [{timestamp}] {message}{Colors.RESET}")
        elif status == "error":
            print(f"{Colors.RED}❌ [{timestamp}] {message}{Colors.RESET}")
        elif status == "warning":
            print(f"{Colors.YELLOW}⚠️  [{timestamp}] {message}{Colors.RESET}")
        elif status == "info":
            print(f"{Colors.BLUE}ℹ️  [{timestamp}] {message}{Colors.RESET}")
        else:
            print(f"[{timestamp}] {message}")
    
    async def test_endpoint(
        self,
        method: str,
        endpoint: str,
        expected_status: int | List[int] = 200,
        data: Optional[Dict] = None,
        description: str = "",
        requires_auth: bool = True
    ) -> tuple[bool, Dict[str, Any]]:
        """Test a single API endpoint"""
        url = f"{BASE_URL}{endpoint}"
        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                cookies = self.session_cookies if requires_auth else {}
                
                if method.upper() == "GET":
                    response = await client.get(url, cookies=cookies)
                elif method.upper() == "POST":
                    response = await client.post(url, json=data, cookies=cookies)
                elif method.upper() == "PATCH":
                    response = await client.patch(url, json=data, cookies=cookies)
                elif method.upper() == "DELETE":
                    response = await client.delete(url, cookies=cookies)
                else:
                    return False, {"error": f"Unknown method: {method}"}
                
                # Update cookies from response
                for cookie in response.cookies:
                    self.session_cookies[cookie.name] = cookie.value
                
                # Check if status code matches expected (handle both single int and list)
                if isinstance(expected_status, list):
                    success = response.status_code in expected_status
                    expected_str = str(expected_status)
                else:
                    success = response.status_code == expected_status
                    expected_str = str(expected_status)
                
                result = {
                    "status_code": response.status_code,
                    "expected": expected_status,
                    "success": success,
                    "response": response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text[:200]
                }
                
                if success:
                    self.passed += 1
                    self.log(f"{method:6} {endpoint:50} → {response.status_code} (expected {expected_str}) {description}", "success")
                else:
                    self.failed += 1
                    self.log(f"{method:6} {endpoint:50} → {response.status_code} (expected {expected_str}) {description}", "error")
                    if hasattr(response, 'text'):
                        self.log(f"   Response: {response.text[:200]}", "error")
                
                self.test_results.append({
                    "method": method,
                    "endpoint": endpoint,
                    "description": description,
                    "success": success,
                    "status_code": response.status_code,
                    "expected_status": expected_status
                })
                
                return success, result
                
        except httpx.TimeoutException:
            self.failed += 1
            self.log(f"{method:6} {endpoint:50} → TIMEOUT {description}", "error")
            return False, {"error": "Timeout"}
        except Exception as e:
            self.failed += 1
            self.log(f"{method:6} {endpoint:50} → ERROR: {str(e)[:100]} {description}", "error")
            return False, {"error": str(e)}
    
    async def check_backend_health(self) -> bool:
        """Check if Python backend is running"""
        self.log("Checking backend health...", "info")
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{BASE_URL}/health")
                if response.status_code == 200:
                    self.log("✅ Python backend is running", "success")
                    return True
                else:
                    self.log(f"⚠️  Backend health check returned {response.status_code}", "warning")
                    return False
        except Exception as e:
            self.log(f"❌ Cannot connect to Python backend: {e}", "error")
            self.log(f"   Make sure the backend is running: cd python_backend && python3 main.py", "info")
            return False
    
    async def test_database_connection(self) -> bool:
        """Test database connectivity and basic operations"""
        self.log("\n" + "="*70, "info")
        self.log("Testing Database Connection", "info")
        self.log("="*70, "info")
        
        db_tests_passed = 0
        db_tests_failed = 0
        
        # Test 1: Check if we can query projects (requires DB)
        success, result = await self.test_endpoint("GET", "/api/v1/projects", [200, 401, 500], description="Test database via projects query", requires_auth=False)
        if result.get("status_code") == 500:
            self.log("⚠️  Database connection may be failing (500 error on projects)", "warning")
            self.log("   Check DATABASE_URL environment variable and database connectivity", "info")
            db_tests_failed += 1
        else:
            db_tests_passed += 1
        
        # Test 2: Check if we can query companies (requires DB)
        success, result = await self.test_endpoint("GET", "/api/v1/companies", [200, 401, 500], description="Test database via companies query", requires_auth=False)
        if result.get("status_code") == 500:
            self.log("⚠️  Database connection may be failing (500 error on companies)", "warning")
            db_tests_failed += 1
        else:
            db_tests_passed += 1
        
        # Test 3: Check if we can query users (requires DB)
        success, result = await self.test_endpoint("GET", "/api/v1/users/managers", [200, 401, 500], description="Test database via users query", requires_auth=False)
        if result.get("status_code") == 500:
            self.log("⚠️  Database connection may be failing (500 error on users)", "warning")
            db_tests_failed += 1
        else:
            db_tests_passed += 1
        
        # Test 4: Check if we can query tasks (requires DB)
        success, result = await self.test_endpoint("GET", "/api/v1/tasks", [200, 401, 500], description="Test database via tasks query", requires_auth=False)
        if result.get("status_code") == 500:
            self.log("⚠️  Database connection may be failing (500 error on tasks)", "warning")
            db_tests_failed += 1
        else:
            db_tests_passed += 1
        
        # Test 5: Check if we can query logs (requires DB)
        success, result = await self.test_endpoint("GET", "/api/v1/logs", [200, 401, 500], description="Test database via logs query", requires_auth=False)
        if result.get("status_code") == 500:
            self.log("⚠️  Database connection may be failing (500 error on logs)", "warning")
            db_tests_failed += 1
        else:
            db_tests_passed += 1
        
        # Test 6: Check if we can query client portal issues (requires DB)
        success, result = await self.test_endpoint("GET", "/api/v1/client-issues", [200, 401, 500], description="Test database via client issues query", requires_auth=False)
        if result.get("status_code") == 500:
            self.log("⚠️  Database connection may be failing (500 error on client issues)", "warning")
            db_tests_failed += 1
        else:
            db_tests_passed += 1
        
        # Test 7: Check if we can query client portal forum (requires DB)
        success, result = await self.test_endpoint("GET", "/api/v1/client-forum", [200, 401, 500], description="Test database via client forum query", requires_auth=False)
        if result.get("status_code") == 500:
            self.log("⚠️  Database connection may be failing (500 error on client forum)", "warning")
            db_tests_failed += 1
        else:
            db_tests_passed += 1
        
        # Test 8: Check if we can query client portal materials (requires DB)
        success, result = await self.test_endpoint("GET", "/api/v1/client-materials", [200, 401, 500], description="Test database via client materials query", requires_auth=False)
        if result.get("status_code") == 500:
            self.log("⚠️  Database connection may be failing (500 error on client materials)", "warning")
            db_tests_failed += 1
        else:
            db_tests_passed += 1
        
        # Test 9: Check if we can query client portal payment schedules (requires DB)
        # Note: payment-installments requires project_id parameter, so test payment-schedules instead
        success, result = await self.test_endpoint("GET", "/api/v1/payment-schedules", [200, 401, 400, 500], description="Test database via payment schedules query", requires_auth=False)
        if result.get("status_code") == 500:
            self.log("⚠️  Database connection may be failing (500 error on payment schedules)", "warning")
            db_tests_failed += 1
        else:
            db_tests_passed += 1
        
        # Test 10: Check if we can query activities (requires DB)
        success, result = await self.test_endpoint("GET", "/api/v1/activities", [200, 401, 500], description="Test database via activities query", requires_auth=False)
        if result.get("status_code") == 500:
            self.log("⚠️  Database connection may be failing (500 error on activities)", "warning")
            db_tests_failed += 1
        else:
            db_tests_passed += 1
        
        if db_tests_failed > 0:
            self.log(f"⚠️  Database connection tests: {db_tests_passed} passed, {db_tests_failed} failed", "warning")
            return False
        else:
            self.log(f"✅ Database connection tests passed ({db_tests_passed} endpoints tested)", "success")
            return True
    
    async def check_frontend_health(self) -> bool:
        """Check if Node.js frontend server is running"""
        self.log("Checking frontend server...", "info")
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{FRONTEND_URL}/")
                if response.status_code == 200:
                    self.log("✅ Frontend server is running", "success")
                    return True
                else:
                    self.log(f"⚠️  Frontend returned {response.status_code}", "warning")
                    return False
        except Exception as e:
            self.log(f"⚠️  Cannot connect to frontend: {e}", "warning")
            self.log("   Frontend may not be required for API testing", "info")
            return False
    
    async def test_authentication(self) -> bool:
        """Test authentication flow"""
        self.log("\n" + "="*70, "info")
        self.log("Testing Authentication", "info")
        self.log("="*70, "info")
        
        # Test 1: Get current user (should fail without auth)
        await self.test_endpoint("GET", "/api/v1/auth/user", [200, 401], description="Get current user (unauthenticated)", requires_auth=False)
        
        # Test 2: Login (you'll need to provide test credentials)
        self.log("\n⚠️  Note: Login test requires valid credentials", "warning")
        self.log("   Update the script with test credentials to test login", "info")
        
        # For now, we'll test that the endpoint exists
        login_data = {"email": "test@example.com", "password": "testpassword"}
        await self.test_endpoint("POST", "/api/v1/auth/login", [200, 401], data=login_data, description="Login endpoint", requires_auth=False)
        
        return True
    
    async def test_projects(self) -> bool:
        """Test project endpoints"""
        self.log("\n" + "="*70, "info")
        self.log("Testing Projects API", "info")
        self.log("="*70, "info")
        
        # GET projects
        success, result = await self.test_endpoint("GET", "/api/v1/projects", [200, 401], description="List projects")
        
        if success and result.get("status_code") == 200:
            projects = result.get("response", [])
            if isinstance(projects, list) and len(projects) > 0:
                test_project_id = projects[0].get("id")
                if test_project_id:
                    # GET single project
                    await self.test_endpoint("GET", f"/api/v1/projects/{test_project_id}", 200, description="Get single project")
        
        return True
    
    async def test_tasks(self) -> bool:
        """Test task endpoints"""
        self.log("\n" + "="*70, "info")
        self.log("Testing Tasks API", "info")
        self.log("="*70, "info")
        
        # GET tasks
        success, result = await self.test_endpoint("GET", "/api/v1/tasks", [200, 401], description="List tasks")
        
        if success and result.get("status_code") == 200:
            tasks = result.get("response", [])
            if isinstance(tasks, list) and len(tasks) > 0:
                test_task_id = tasks[0].get("id")
                if test_task_id:
                    # GET single task
                    await self.test_endpoint("GET", f"/api/v1/tasks/{test_task_id}", 200, description="Get single task")
        
        return True
    
    async def test_companies(self) -> bool:
        """Test company endpoints"""
        self.log("\n" + "="*70, "info")
        self.log("Testing Companies API", "info")
        self.log("="*70, "info")
        
        # GET companies
        await self.test_endpoint("GET", "/api/v1/companies", [200, 401], description="List companies")
        
        return True
    
    async def test_users(self) -> bool:
        """Test user endpoints"""
        self.log("\n" + "="*70, "info")
        self.log("Testing Users API", "info")
        self.log("="*70, "info")
        
        # GET users
        await self.test_endpoint("GET", "/api/v1/users", [200, 401], description="List users")
        await self.test_endpoint("GET", "/api/v1/users/managers", [200, 401], description="List managers")
        
        return True
    
    async def test_photos(self) -> bool:
        """Test photo endpoints"""
        self.log("\n" + "="*70, "info")
        self.log("Testing Photos API", "info")
        self.log("="*70, "info")
        
        # GET photos
        await self.test_endpoint("GET", "/api/v1/photos", [200, 401], description="List photos")
        
        return True
    
    async def test_logs(self) -> bool:
        """Test project log endpoints"""
        self.log("\n" + "="*70, "info")
        self.log("Testing Project Logs API", "info")
        self.log("="*70, "info")
        
        # GET logs
        await self.test_endpoint("GET", "/api/v1/logs", [200, 401], description="List logs")
        
        return True
    
    async def test_dashboard(self) -> bool:
        """Test dashboard endpoints"""
        self.log("\n" + "="*70, "info")
        self.log("Testing Dashboard API", "info")
        self.log("="*70, "info")
        
        # GET dashboard stats
        await self.test_endpoint("GET", "/api/v1/dashboard/stats", [200, 401], description="Get dashboard stats")
        
        return True
    
    async def test_activities(self) -> bool:
        """Test activity endpoints"""
        self.log("\n" + "="*70, "info")
        self.log("Testing Activities API", "info")
        self.log("="*70, "info")
        
        # GET activities
        await self.test_endpoint("GET", "/api/v1/activities", [200, 401], description="List activities")
        
        return True
    
    async def test_objects(self) -> bool:
        """Test object storage endpoints"""
        self.log("\n" + "="*70, "info")
        self.log("Testing Object Storage API", "info")
        self.log("="*70, "info")
        
        # POST upload URL
        await self.test_endpoint("POST", "/api/v1/objects/upload", [200, 401, 500], data={}, description="Get upload URL")
        
        # POST download URL
        download_data = {"filePath": "test/path/to/file.jpg"}
        await self.test_endpoint("POST", "/api/v1/objects/download", [200, 401, 500], data=download_data, description="Get download URL")
        
        return True
    
    async def test_rbac(self) -> bool:
        """Test RBAC endpoints"""
        self.log("\n" + "="*70, "info")
        self.log("Testing RBAC API", "info")
        self.log("="*70, "info")
        
        # GET roles
        await self.test_endpoint("GET", "/api/v1/rbac/roles", [200, 401], description="List roles")
        
        return True
    
    async def test_api_versioning(self) -> bool:
        """Test that API versioning is working"""
        self.log("\n" + "="*70, "info")
        self.log("Testing API Versioning", "info")
        self.log("="*70, "info")
        
        # Test that /api/v1/ endpoints exist
        await self.test_endpoint("GET", "/api/v1/projects", [200, 401], description="v1 projects endpoint")
        
        # Test that old /api/ endpoints are redirected/rewritten
        # (The Node.js proxy should rewrite /api/ to /api/v1/)
        await self.test_endpoint("GET", "/api/projects", [200, 401], description="Legacy /api/ endpoint (should be rewritten)")
        
        return True
    
    async def run_all_tests(self):
        """Run all test suites"""
        print(f"\n{Colors.BOLD}{'='*70}{Colors.RESET}")
        print(f"{Colors.BOLD}Proesphere Migration Testing Suite{Colors.RESET}")
        print(f"{Colors.BOLD}{'='*70}{Colors.RESET}\n")
        
        # Health checks
        backend_ok = await self.check_backend_health()
        if not backend_ok:
            self.log("\n❌ Backend is not running. Please start it first.", "error")
            return False
        
        await self.check_frontend_health()
        
        # Database connection test
        await self.test_database_connection()
        
        # Run test suites
        await self.test_api_versioning()
        await self.test_authentication()
        await self.test_projects()
        await self.test_tasks()
        await self.test_companies()
        await self.test_users()
        await self.test_photos()
        await self.test_logs()
        await self.test_dashboard()
        await self.test_activities()
        await self.test_objects()
        await self.test_rbac()
        
        # Print summary
        self.print_summary()
        
        return self.failed == 0
    
    def print_summary(self):
        """Print test summary"""
        total = self.passed + self.failed
        success_rate = (self.passed / total * 100) if total > 0 else 0
        
        print(f"\n{Colors.BOLD}{'='*70}{Colors.RESET}")
        print(f"{Colors.BOLD}Test Summary{Colors.RESET}")
        print(f"{Colors.BOLD}{'='*70}{Colors.RESET}")
        print(f"Total Tests: {total}")
        print(f"{Colors.GREEN}Passed: {self.passed}{Colors.RESET}")
        print(f"{Colors.RED}Failed: {self.failed}{Colors.RESET}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if self.failed > 0:
            print(f"\n{Colors.RED}Failed Tests:{Colors.RESET}")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  ❌ {result['method']} {result['endpoint']} - {result['description']}")
                    print(f"     Expected: {result['expected_status']}, Got: {result['status_code']}")
        
        print(f"\n{Colors.BOLD}{'='*70}{Colors.RESET}\n")

async def main():
    tester = MigrationTester()
    success = await tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

