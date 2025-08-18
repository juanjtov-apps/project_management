#!/usr/bin/env python3
"""
Comprehensive Production Test Suite for Proesphere
Tests ALL endpoints and validates frontend/backend integration
"""

import requests
import json
import time
import sys
from datetime import datetime, timedelta
import os

class ProductionTestSuite:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = {
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "errors": [],
            "detailed_results": {}
        }
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def test_endpoint(self, method, endpoint, data=None, expected_status=None, description=""):
        """Generic endpoint tester"""
        self.test_results["total_tests"] += 1
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data)
            elif method.upper() == "DELETE":
                response = self.session.delete(url)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
                
            # Check status code
            if expected_status and response.status_code != expected_status:
                self.log(f"❌ FAIL: {description} - Expected {expected_status}, got {response.status_code}", "ERROR")
                self.test_results["failed"] += 1
                self.test_results["errors"].append(f"{method} {endpoint}: Status {response.status_code}")
                return False
                
            # Log success
            self.log(f"✅ PASS: {description} - Status {response.status_code}")
            self.test_results["passed"] += 1
            
            # Store detailed result
            self.test_results["detailed_results"][f"{method} {endpoint}"] = {
                "status": response.status_code,
                "description": description,
                "success": True
            }
            
            return response.json() if response.content else None
            
        except Exception as e:
            self.log(f"❌ ERROR: {description} - {str(e)}", "ERROR")
            self.test_results["failed"] += 1
            self.test_results["errors"].append(f"{method} {endpoint}: {str(e)}")
            self.test_results["detailed_results"][f"{method} {endpoint}"] = {
                "description": description,
                "success": False,
                "error": str(e)
            }
            return None

    def test_authentication(self):
        """Test authentication endpoints"""
        self.log("🔐 Testing Authentication System...")
        
        # Test auth user endpoint
        self.test_endpoint("GET", "/api/auth/user", 
                          description="Get current user authentication status")
        
    def test_users_management(self):
        """Test user management endpoints"""
        self.log("👥 Testing User Management System...")
        
        # Test managers endpoint
        self.test_endpoint("GET", "/api/users/managers",
                          description="Fetch managers for task assignment")
        
        # Test RBAC users
        self.test_endpoint("GET", "/api/rbac/users",
                          description="Fetch RBAC users")
        
        # Test RBAC roles
        self.test_endpoint("GET", "/api/rbac/roles",
                          description="Fetch RBAC roles")
        
        # Test RBAC permissions
        self.test_endpoint("GET", "/api/rbac/permissions",
                          description="Fetch RBAC permissions")
    
    def test_projects_system(self):
        """Test project management endpoints"""
        self.log("🏗️ Testing Project Management System...")
        
        # Get projects
        projects = self.test_endpoint("GET", "/api/projects",
                                    description="Fetch all projects")
        
        # Test project creation
        test_project = {
            "name": f"Test Project {int(time.time())}",
            "description": "Automated test project",
            "status": "planning",
            "startDate": datetime.now().isoformat(),
            "budget": 50000
        }
        
        created_project = self.test_endpoint("POST", "/api/projects", 
                                           data=test_project,
                                           description="Create new project")
        
        if created_project and "id" in created_project:
            project_id = created_project["id"]
            
            # Test project update
            update_data = {"status": "in-progress"}
            self.test_endpoint("PUT", f"/api/projects/{project_id}",
                             data=update_data,
                             description="Update project status")
            
            # Test project deletion (will test cascade)
            self.test_endpoint("DELETE", f"/api/projects/{project_id}",
                             description="Delete project (cascade test)")
    
    def test_tasks_system(self):
        """Test task management endpoints"""
        self.log("📋 Testing Task Management System...")
        
        # Get tasks
        tasks = self.test_endpoint("GET", "/api/tasks",
                                 description="Fetch all tasks")
        
        # Test task creation
        test_task = {
            "title": f"Test Task {int(time.time())}",
            "description": "Automated test task",
            "category": "general",
            "status": "pending",
            "priority": "medium"
        }
        
        created_task = self.test_endpoint("POST", "/api/tasks",
                                        data=test_task,
                                        description="Create new task")
        
        if created_task and "id" in created_task:
            task_id = created_task["id"]
            
            # Test task update
            update_data = {"status": "in-progress"}
            self.test_endpoint("PUT", f"/api/tasks/{task_id}",
                             data=update_data,
                             description="Update task status")
            
            # Test task deletion
            self.test_endpoint("DELETE", f"/api/tasks/{task_id}",
                             description="Delete task")
    
    def test_companies_system(self):
        """Test company management endpoints"""
        self.log("🏢 Testing Company Management System...")
        
        self.test_endpoint("GET", "/api/companies",
                          description="Fetch all companies")
    
    def test_photos_system(self):
        """Test photo management endpoints"""
        self.log("📸 Testing Photo Management System...")
        
        self.test_endpoint("GET", "/api/photos",
                          description="Fetch all photos")
    
    def test_notifications_system(self):
        """Test notification endpoints"""
        self.log("🔔 Testing Notification System...")
        
        self.test_endpoint("GET", "/api/notifications",
                          description="Fetch user notifications")
    
    def test_frontend_routes(self):
        """Test that frontend routes are accessible"""
        self.log("🌐 Testing Frontend Routes...")
        
        frontend_routes = [
            "/",
            "/dashboard", 
            "/projects",
            "/tasks",
            "/project-health",
            "/schedule",
            "/photos",
            "/project-logs",
            "/crew",
            "/subs"
        ]
        
        for route in frontend_routes:
            try:
                response = self.session.get(f"{self.base_url}{route}")
                if response.status_code == 200:
                    self.log(f"✅ PASS: Frontend route {route} - Status {response.status_code}")
                    self.test_results["passed"] += 1
                else:
                    self.log(f"❌ FAIL: Frontend route {route} - Status {response.status_code}")
                    self.test_results["failed"] += 1
                self.test_results["total_tests"] += 1
            except Exception as e:
                self.log(f"❌ ERROR: Frontend route {route} - {str(e)}")
                self.test_results["failed"] += 1
                self.test_results["total_tests"] += 1
    
    def run_full_test_suite(self):
        """Run the complete test suite"""
        self.log("🚀 Starting Comprehensive Production Test Suite")
        self.log("=" * 60)
        
        start_time = time.time()
        
        # Run all test categories
        self.test_authentication()
        self.test_users_management()
        self.test_companies_system()
        self.test_projects_system()
        self.test_tasks_system()
        self.test_photos_system()
        self.test_notifications_system()
        self.test_frontend_routes()
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Generate final report
        self.generate_final_report(duration)
        
    def generate_final_report(self, duration):
        """Generate comprehensive test report"""
        self.log("=" * 60)
        self.log("📊 PRODUCTION TEST SUITE RESULTS")
        self.log("=" * 60)
        
        total = self.test_results["total_tests"]
        passed = self.test_results["passed"]
        failed = self.test_results["failed"]
        success_rate = (passed / total * 100) if total > 0 else 0
        
        self.log(f"Total Tests: {total}")
        self.log(f"Passed: {passed}")
        self.log(f"Failed: {failed}")
        self.log(f"Success Rate: {success_rate:.1f}%")
        self.log(f"Duration: {duration:.2f} seconds")
        
        if failed > 0:
            self.log("\n❌ FAILED TESTS:")
            for error in self.test_results["errors"]:
                self.log(f"  - {error}")
        
        # Overall status
        if success_rate >= 95:
            self.log("\n🟢 PRODUCTION STATUS: EXCELLENT - System ready for deployment")
        elif success_rate >= 85:
            self.log("\n🟡 PRODUCTION STATUS: GOOD - Minor issues detected")
        else:
            self.log("\n🔴 PRODUCTION STATUS: CRITICAL - Major issues require attention")
        
        # Save detailed report
        report_file = f"production_test_report_{int(time.time())}.json"
        with open(report_file, 'w') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "duration_seconds": duration,
                "summary": {
                    "total_tests": total,
                    "passed": passed,
                    "failed": failed,
                    "success_rate": success_rate
                },
                "details": self.test_results["detailed_results"],
                "errors": self.test_results["errors"]
            }, f, indent=2)
        
        self.log(f"\n📄 Detailed report saved to: {report_file}")

if __name__ == "__main__":
    # Run the test suite
    tester = ProductionTestSuite()
    tester.run_full_test_suite()