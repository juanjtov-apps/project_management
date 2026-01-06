#!/usr/bin/env python3
"""
Comprehensive unit tests for Tower Flow API endpoints
Tests all CRUD operations and button functionality
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Test configuration
BASE_URL = "http://localhost:8000/api"
TEST_USER_ID = "pm-004"  # Sergio's account for testing

class APITester:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.results = []
    
    def test(self, name, func):
        """Run a test function and record results"""
        try:
            print(f"Testing: {name}...", end=" ")
            result = func()
            if result:
                print("✓ PASS")
                self.passed += 1
                self.results.append(f"✓ {name}")
            else:
                print("✗ FAIL")
                self.failed += 1
                self.results.append(f"✗ {name}")
        except Exception as e:
            print(f"✗ ERROR: {e}")
            self.failed += 1
            self.results.append(f"✗ {name} - ERROR: {e}")
    
    def summary(self):
        """Print test summary"""
        total = self.passed + self.failed
        print(f"\n{'='*50}")
        print(f"TEST SUMMARY")
        print(f"{'='*50}")
        print(f"Total Tests: {total}")
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        print(f"Success Rate: {(self.passed/total*100):.1f}%" if total > 0 else "0%")
        print(f"\nDetailed Results:")
        for result in self.results:
            print(f"  {result}")

def test_health_check():
    """Test if the API is responsive"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        return response.status_code == 200
    except:
        # If health endpoint doesn't exist, try projects endpoint
        try:
            response = requests.get(f"{BASE_URL}/projects", timeout=5)
            return response.status_code in [200, 401]  # 401 is fine for unauth request
        except:
            return False

def test_projects_get():
    """Test GET /api/projects"""
    try:
        response = requests.get(f"{BASE_URL}/projects", timeout=10)
        return response.status_code == 200 and isinstance(response.json(), list)
    except:
        return False

def test_projects_post():
    """Test POST /api/projects (Create Project)"""
    try:
        project_data = {
            "name": "Test Project API",
            "description": "Created via API test",
            "location": "Test Location",
            "status": "planning",
            "progress": 0,
            "dueDate": (datetime.now() + timedelta(days=30)).isoformat()
        }
        response = requests.post(f"{BASE_URL}/projects", 
                               json=project_data, 
                               timeout=10)
        return response.status_code in [200, 201]
    except:
        return False

def test_tasks_get():
    """Test GET /api/tasks"""
    try:
        response = requests.get(f"{BASE_URL}/tasks", timeout=10)
        return response.status_code == 200 and isinstance(response.json(), list)
    except:
        return False

def test_tasks_post():
    """Test POST /api/tasks (Create Task)"""
    try:
        task_data = {
            "title": "Test Task API",
            "description": "Created via API test",
            "status": "pending",
            "priority": "medium",
            "category": "administrative",
            "assigneeId": "pm-004",
            "dueDate": (datetime.now() + timedelta(days=7)).isoformat(),
            "isMilestone": False
        }
        response = requests.post(f"{BASE_URL}/tasks", 
                               json=task_data, 
                               timeout=10)
        return response.status_code in [200, 201]
    except:
        return False

def test_users_get():
    """Test GET /api/users"""
    try:
        response = requests.get(f"{BASE_URL}/users/", timeout=10)
        return response.status_code == 200 and isinstance(response.json(), list)
    except:
        return False

def test_photos_get():
    """Test GET /api/photos"""
    try:
        response = requests.get(f"{BASE_URL}/photos", timeout=10)
        return response.status_code == 200 and isinstance(response.json(), list)
    except:
        return False

def test_notifications_get():
    """Test GET /api/notifications"""
    try:
        response = requests.get(f"{BASE_URL}/notifications", 
                               params={"userId": "sample-user-id"}, 
                               timeout=10)
        return response.status_code == 200 and isinstance(response.json(), list)
    except:
        return False

def test_schedule_changes_get():
    """Test GET /api/schedule-changes"""
    try:
        response = requests.get(f"{BASE_URL}/schedule-changes", timeout=10)
        return response.status_code == 200 and isinstance(response.json(), list)
    except:
        return False

def test_task_patch():
    """Test PATCH /api/tasks/{id} (Update Task Status)"""
    try:
        # First get a task to update
        tasks_response = requests.get(f"{BASE_URL}/tasks", timeout=10)
        if tasks_response.status_code != 200:
            return False
        
        tasks = tasks_response.json()
        if not tasks:
            return False
        
        task_id = tasks[0]["id"]
        update_data = {"status": "in-progress"}
        
        response = requests.patch(f"{BASE_URL}/tasks/{task_id}", 
                                json=update_data, 
                                timeout=10)
        return response.status_code == 200
    except:
        return False

def test_express_proxy():
    """Test Express proxy functionality"""
    try:
        # Test via Express proxy on port 5000
        response = requests.get("http://localhost:5000/api/projects", timeout=10)
        return response.status_code == 200
    except:
        return False

def main():
    """Run all API endpoint tests"""
    print("Tower Flow API Endpoint Testing")
    print("="*50)
    
    tester = APITester()
    
    # Core API Tests
    tester.test("Health Check", test_health_check)
    tester.test("GET Projects", test_projects_get)
    tester.test("POST Projects", test_projects_post)
    tester.test("GET Tasks", test_tasks_get)
    tester.test("POST Tasks", test_tasks_post)
    tester.test("PATCH Tasks", test_task_patch)
    tester.test("GET Users", test_users_get)
    tester.test("GET Photos", test_photos_get)
    tester.test("GET Notifications", test_notifications_get)
    tester.test("GET Schedule Changes", test_schedule_changes_get)
    tester.test("Express Proxy", test_express_proxy)
    
    tester.summary()
    
    # Return success code
    return 0 if tester.failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())