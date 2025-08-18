#!/usr/bin/env python3
"""
Production Deployment Test Suite
Tests deployed app endpoints and database functionality in production environment.
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

# Get production deployment URL
DEPLOYMENT_URL = input("Enter your deployment URL (e.g., https://your-app.replit.app): ").strip()
if not DEPLOYMENT_URL:
    print("❌ Deployment URL is required")
    sys.exit(1)

# Remove trailing slash
DEPLOYMENT_URL = DEPLOYMENT_URL.rstrip('/')

# Database connection for production verification
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("❌ DATABASE_URL environment variable is required")
    sys.exit(1)

class ProductionTester:
    def __init__(self):
        self.conn = None
        self.test_results = []
        self.passed = 0
        self.failed = 0
        self.deployment_url = DEPLOYMENT_URL
        
    async def connect_db(self):
        """Connect to production database"""
        try:
            self.conn = await asyncpg.connect(DATABASE_URL)
            self.log_test("Production Database Connection", True)
        except Exception as e:
            self.log_test("Production Database Connection", False, str(e))
            
    async def disconnect_db(self):
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
    
    def test_endpoint(self, method: str, endpoint: str, data: Dict = None, expected_codes: List[int] = [200], description: str = ""):
        """Test production endpoint"""
        url = f"{self.deployment_url}{endpoint}"
        test_name = f"{method} {endpoint}"
        if description:
            test_name += f" ({description})"
            
        try:
            start_time = time.time()
            
            if method.upper() == "GET":
                response = requests.get(url, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, timeout=30)
            elif method.upper() == "PATCH":
                response = requests.patch(url, json=data, timeout=30)
            elif method.upper() == "DELETE":
                response = requests.delete(url, timeout=30)
            else:
                self.log_test(test_name, False, f"Unsupported method: {method}")
                return None
                
            response_time = round((time.time() - start_time) * 1000, 2)
            
            if response.status_code in expected_codes:
                message = f"Status: {response.status_code}, Time: {response_time}ms"
                if response.status_code == 200:
                    try:
                        json_data = response.json()
                        if isinstance(json_data, list):
                            message += f", Items: {len(json_data)}"
                        elif isinstance(json_data, dict) and 'id' in json_data:
                            message += f", ID: {json_data.get('id', 'N/A')}"
                    except:
                        message += f", Content-Length: {len(response.text)}"
                        
                self.log_test(test_name, True, message)
                return response
            else:
                error_msg = f"Expected {expected_codes}, got {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f", Response: {error_detail}"
                except:
                    error_msg += f", Text: {response.text[:200]}"
                    
                self.log_test(test_name, False, error_msg)
                return None
                
        except requests.exceptions.Timeout:
            self.log_test(test_name, False, "Request timeout (30s)")
            return None
        except requests.exceptions.ConnectionError:
            self.log_test(test_name, False, "Connection error - deployment may be down")
            return None
        except Exception as e:
            self.log_test(test_name, False, f"Error: {str(e)}")
            return None
    
    async def test_database_tables(self):
        """Test production database table integrity"""
        if not self.conn:
            self.log_test("Database Tables Test", False, "No database connection")
            return
            
        tables_to_check = [
            'projects', 'tasks', 'users', 'companies', 'roles', 
            'permissions', 'role_permissions', 'company_users', 'project_logs', 'photos'
        ]
        
        for table in tables_to_check:
            try:
                result = await self.conn.fetchval(f"SELECT COUNT(*) FROM {table}")
                self.log_test(f"Table {table}", True, f"Records: {result}")
            except Exception as e:
                self.log_test(f"Table {table}", False, str(e))
    
    async def test_data_integrity(self):
        """Test data relationships and integrity"""
        if not self.conn:
            return
            
        try:
            # Test user-company relationships
            user_company_count = await self.conn.fetchval("""
                SELECT COUNT(*) FROM company_users cu 
                JOIN users u ON cu.user_id = u.id 
                JOIN companies c ON cu.company_id = c.id
            """)
            self.log_test("User-Company Relationships", True, f"Valid relationships: {user_company_count}")
            
            # Test project-task relationships
            project_task_count = await self.conn.fetchval("""
                SELECT COUNT(*) FROM tasks t 
                JOIN projects p ON t.project_id = p.id
            """)
            self.log_test("Project-Task Relationships", True, f"Tasks with projects: {project_task_count}")
            
            # Test RBAC data integrity
            rbac_count = await self.conn.fetchval("""
                SELECT COUNT(*) FROM role_permissions rp 
                JOIN roles r ON rp.role_id = r.id 
                JOIN permissions p ON rp.permission_id = p.id
            """)
            self.log_test("RBAC Data Integrity", True, f"Role-permission mappings: {rbac_count}")
            
        except Exception as e:
            self.log_test("Data Integrity Check", False, str(e))
    
    def run_frontend_tests(self):
        """Test frontend endpoints"""
        print("\n🌐 TESTING FRONTEND ENDPOINTS")
        print("=" * 50)
        
        # Test main pages
        self.test_endpoint("GET", "/", description="Landing page")
        self.test_endpoint("GET", "/login", description="Login page")
        self.test_endpoint("GET", "/dashboard", description="Dashboard page")
        
    def run_api_tests(self):
        """Test API endpoints"""
        print("\n🔌 TESTING API ENDPOINTS")
        print("=" * 50)
        
        # Test core API endpoints
        self.test_endpoint("GET", "/api/projects", description="Get all projects")
        self.test_endpoint("GET", "/api/tasks", description="Get all tasks")
        self.test_endpoint("GET", "/api/users", description="Get all users")
        
        # Test RBAC endpoints
        self.test_endpoint("GET", "/api/rbac/companies", description="Get companies")
        self.test_endpoint("GET", "/api/rbac/roles", description="Get roles")
        self.test_endpoint("GET", "/api/rbac/permissions", description="Get permissions")
        self.test_endpoint("GET", "/api/rbac/users", description="Get RBAC users")
        
        # Test creation endpoints
        test_project = {
            "name": f"Production Test Project {int(time.time())}",
            "description": "Automated production test",
            "location": "Test Location",
            "status": "active",
            "progress": 0
        }
        
        project_response = self.test_endpoint("POST", "/api/projects", 
                                           data=test_project, 
                                           expected_codes=[200, 201], 
                                           description="Create test project")
        
        if project_response:
            try:
                project_data = project_response.json()
                project_id = project_data.get('id')
                
                # Test task creation with project
                test_task = {
                    "title": f"Production Test Task {int(time.time())}",
                    "description": "Automated production test task",
                    "projectId": project_id,
                    "status": "pending",
                    "priority": "medium",
                    "category": "general"
                }
                
                self.test_endpoint("POST", "/api/tasks", 
                                 data=test_task, 
                                 expected_codes=[200, 201], 
                                 description="Create test task")
                                 
            except Exception as e:
                print(f"    Could not parse project response: {e}")
    
    async def run_database_tests(self):
        """Test database connectivity and data"""
        print("\n🗄️  TESTING DATABASE")
        print("=" * 50)
        
        await self.connect_db()
        if self.conn:
            await self.test_database_tables()
            await self.test_data_integrity()
            await self.disconnect_db()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("🎯 PRODUCTION DEPLOYMENT TEST SUMMARY")
        print("=" * 60)
        
        total_tests = self.passed + self.failed
        success_rate = (self.passed / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if self.failed == 0:
            print("\n✅ ALL TESTS PASSED - DEPLOYMENT IS READY!")
        else:
            print(f"\n❌ {self.failed} TESTS FAILED - REVIEW ISSUES BEFORE DEPLOYMENT")
            
        print(f"\nTested Deployment: {self.deployment_url}")
        print(f"Test Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Save detailed results
        with open('production_test_results.json', 'w') as f:
            json.dump({
                'deployment_url': self.deployment_url,
                'test_summary': {
                    'total': total_tests,
                    'passed': self.passed,
                    'failed': self.failed,
                    'success_rate': success_rate
                },
                'test_results': self.test_results,
                'timestamp': datetime.now().isoformat()
            }, f, indent=2)
            
        print(f"\nDetailed results saved to: production_test_results.json")

async def main():
    """Run all production tests"""
    tester = ProductionTester()
    
    print("🚀 STARTING PRODUCTION DEPLOYMENT TESTS")
    print(f"Testing deployment: {DEPLOYMENT_URL}")
    print("=" * 60)
    
    # Run all test suites
    tester.run_frontend_tests()
    tester.run_api_tests()
    await tester.run_database_tests()
    
    # Print final summary
    tester.print_summary()

if __name__ == "__main__":
    asyncio.run(main())