#!/usr/bin/env python3
"""
Production Endpoint Tester - Tests your deployed Proesphere app
Usage: python3 test_production_endpoints.py [deployment_url]
"""

import requests
import time
import json
import sys
import asyncio
import asyncpg
import os
from datetime import datetime

class ProductionTester:
    def __init__(self, deployment_url=None):
        self.deployment_url = deployment_url or "https://proesphere.replit.app"  # Default assumption
        self.results = {"passed": 0, "failed": 0, "tests": []}
        self.conn = None
        
    def log_result(self, test_name, passed, message="", response_time=None):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        time_info = f" ({response_time}ms)" if response_time else ""
        print(f"{status} {test_name}{time_info}")
        if message:
            print(f"    {message}")
            
        self.results["tests"].append({
            "test": test_name,
            "passed": passed,
            "message": message,
            "response_time": response_time,
            "timestamp": datetime.now().isoformat()
        })
        
        if passed:
            self.results["passed"] += 1
        else:
            self.results["failed"] += 1
    
    def test_endpoint(self, method, endpoint, data=None, expected_codes=[200], description=""):
        """Test production endpoint"""
        url = f"{self.deployment_url}{endpoint}"
        test_name = f"{method} {endpoint}"
        if description:
            test_name = f"{description}"
        
        try:
            start_time = time.time()
            
            if method.upper() == "GET":
                response = requests.get(url, timeout=30, allow_redirects=True)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, timeout=30)
            else:
                self.log_result(test_name, False, f"Unsupported method: {method}")
                return None
                
            response_time = round((time.time() - start_time) * 1000, 2)
            
            if response.status_code in expected_codes:
                message = f"Status: {response.status_code}"
                if response.status_code == 200:
                    try:
                        json_data = response.json()
                        if isinstance(json_data, list):
                            message += f", Items: {len(json_data)}"
                        elif isinstance(json_data, dict):
                            if 'id' in json_data:
                                message += f", ID: {json_data.get('id')}"
                            elif 'length' in str(json_data):
                                message += f", Data received"
                    except:
                        content_length = len(response.text)
                        if content_length > 0:
                            message += f", Content: {content_length} chars"
                        
                self.log_result(test_name, True, message, response_time)
                return response
            else:
                error_msg = f"Expected {expected_codes}, got {response.status_code}"
                try:
                    error_detail = response.text[:200]
                    if error_detail:
                        error_msg += f" - {error_detail}"
                except:
                    pass
                    
                self.log_result(test_name, False, error_msg, response_time)
                return None
                
        except requests.exceptions.Timeout:
            self.log_result(test_name, False, "Request timeout (30s)")
            return None
        except requests.exceptions.ConnectionError as e:
            self.log_result(test_name, False, f"Connection error: {str(e)[:100]}")
            return None
        except Exception as e:
            self.log_result(test_name, False, f"Error: {str(e)[:100]}")
            return None
    
    async def test_database_connectivity(self):
        """Test database connectivity and basic queries"""
        print("\n🗄️  TESTING DATABASE CONNECTIVITY")
        print("-" * 40)
        
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            self.log_result("Database Connection", False, "DATABASE_URL not found")
            return
            
        try:
            self.conn = await asyncpg.connect(database_url)
            self.log_result("Database Connection", True, "Connected successfully")
            
            # Test basic queries
            tables = ['projects', 'tasks', 'users', 'companies', 'roles']
            for table in tables:
                try:
                    count = await self.conn.fetchval(f"SELECT COUNT(*) FROM {table}")
                    self.log_result(f"Table {table}", True, f"{count} records")
                except Exception as e:
                    self.log_result(f"Table {table}", False, str(e)[:100])
            
            await self.conn.close()
            
        except Exception as e:
            self.log_result("Database Connection", False, str(e)[:100])
    
    def run_frontend_tests(self):
        """Test frontend accessibility"""
        print("🌐 TESTING FRONTEND PAGES")
        print("-" * 40)
        
        # Test main pages - allow redirects for authentication
        self.test_endpoint("GET", "/", expected_codes=[200, 301, 302], description="Landing Page")
        self.test_endpoint("GET", "/login", expected_codes=[200, 301, 302], description="Login Page") 
        self.test_endpoint("GET", "/dashboard", expected_codes=[200, 401, 302], description="Dashboard Page")
    
    def run_api_tests(self):
        """Test API endpoints"""
        print("\n🔌 TESTING API ENDPOINTS")
        print("-" * 40)
        
        # Core API endpoints
        self.test_endpoint("GET", "/api/projects", expected_codes=[200, 401], description="Projects API")
        self.test_endpoint("GET", "/api/tasks", expected_codes=[200, 401], description="Tasks API")
        self.test_endpoint("GET", "/api/users", expected_codes=[200, 401], description="Users API")
        
        # RBAC endpoints  
        print("\n🛡️  TESTING RBAC ENDPOINTS")
        print("-" * 40)
        self.test_endpoint("GET", "/api/rbac/companies", expected_codes=[200, 401], description="RBAC Companies")
        self.test_endpoint("GET", "/api/rbac/roles", expected_codes=[200, 401], description="RBAC Roles")
        self.test_endpoint("GET", "/api/rbac/permissions", expected_codes=[200, 401], description="RBAC Permissions")
        self.test_endpoint("GET", "/api/rbac/users", expected_codes=[200, 401], description="RBAC Users")
    
    def test_creation_endpoints(self):
        """Test creation capabilities (without authentication)"""
        print("\n📝 TESTING CREATION ENDPOINTS")
        print("-" * 40)
        
        # Test project creation (expect auth required)
        test_project = {
            "name": f"Production Test {int(time.time())}",
            "description": "Automated production test",
            "location": "Test Location", 
            "status": "active",
            "progress": 0
        }
        
        self.test_endpoint("POST", "/api/projects", 
                          data=test_project,
                          expected_codes=[200, 201, 401, 403], 
                          description="Create Project")
        
        # Test task creation (expect auth required)
        test_task = {
            "title": f"Test Task {int(time.time())}",
            "description": "Automated test task",
            "status": "pending",
            "priority": "medium",
            "category": "general"
        }
        
        self.test_endpoint("POST", "/api/tasks",
                          data=test_task,
                          expected_codes=[200, 201, 401, 403],
                          description="Create Task")
    
    def print_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "=" * 70)
        print("📊 PRODUCTION DEPLOYMENT TEST SUMMARY")
        print("=" * 70)
        
        total = self.results["passed"] + self.results["failed"]
        success_rate = (self.results["passed"] / total * 100) if total > 0 else 0
        
        print(f"Deployment URL: {self.deployment_url}")
        print(f"Test Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Total Tests: {total}")
        print(f"Passed: {self.results['passed']}")
        print(f"Failed: {self.results['failed']}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Categorize results
        critical_failures = []
        auth_expected = []
        
        for test in self.results["tests"]:
            if not test["passed"]:
                if "401" in test["message"] or "403" in test["message"]:
                    auth_expected.append(test["test"])
                else:
                    critical_failures.append(test["test"])
        
        if critical_failures:
            print(f"\n❌ CRITICAL FAILURES ({len(critical_failures)}):")
            for failure in critical_failures:
                print(f"   • {failure}")
        
        if auth_expected:
            print(f"\n🔒 AUTHENTICATION REQUIRED ({len(auth_expected)}):")
            for auth in auth_expected:
                print(f"   • {auth}")
        
        # Overall assessment
        print("\n" + "=" * 70)
        if len(critical_failures) == 0:
            print("✅ DEPLOYMENT READY!")
            print("All critical endpoints are accessible.")
            if auth_expected:
                print("Authentication-protected endpoints are working as expected.")
            print("🚀 Your Proesphere app is ready for production use!")
        else:
            print("❌ DEPLOYMENT ISSUES DETECTED")
            print(f"Found {len(critical_failures)} critical issues that need attention.")
            print("Please review and fix before going live.")
        
        # Save detailed results
        results_file = 'production_test_results.json'
        try:
            with open(results_file, 'w') as f:
                json.dump({
                    'deployment_url': self.deployment_url,
                    'test_summary': {
                        'total': total,
                        'passed': self.results['passed'],
                        'failed': self.results['failed'],
                        'success_rate': success_rate,
                        'critical_failures': len(critical_failures),
                        'auth_expected': len(auth_expected)
                    },
                    'test_results': self.results['tests'],
                    'timestamp': datetime.now().isoformat()
                }, f, indent=2)
            print(f"\nDetailed results saved to: {results_file}")
        except Exception as e:
            print(f"Could not save results: {e}")

async def main():
    """Main test runner"""
    deployment_url = None
    
    # Check command line arguments
    if len(sys.argv) > 1:
        deployment_url = sys.argv[1].rstrip('/')
    
    # Default to common Replit URL pattern if not provided
    if not deployment_url:
        print("No deployment URL provided. Using default pattern...")
        deployment_url = "https://proesphere.replit.app"
    
    # Ensure URL has protocol
    if not deployment_url.startswith(('http://', 'https://')):
        deployment_url = 'https://' + deployment_url
    
    print("🎯 PROESPHERE PRODUCTION DEPLOYMENT TESTER")
    print("=" * 70)
    print(f"Testing: {deployment_url}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tester = ProductionTester(deployment_url)
    
    # Run all test suites
    tester.run_frontend_tests()
    tester.run_api_tests()
    tester.test_creation_endpoints()
    await tester.test_database_connectivity()
    
    # Print comprehensive summary
    tester.print_summary()

if __name__ == "__main__":
    asyncio.run(main())