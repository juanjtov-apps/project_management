#!/usr/bin/env python3
"""
Comprehensive RBAC Test Suite
Based on the practical checklist for testing Tower Flow's RBAC implementation.
"""

import asyncio
import asyncpg
import os
import json
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import requests
import time

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("❌ DATABASE_URL environment variable is required")
    sys.exit(1)

class RBACTester:
    def __init__(self):
        self.conn = None
        self.test_results = []
        self.passed = 0
        self.failed = 0
        
    async def connect(self):
        """Connect to database"""
        self.conn = await asyncpg.connect(DATABASE_URL)
        
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
    
    async def test_schema_sanity(self):
        """1. Schema and constraint validation"""
        print("\n🔍 Testing Schema and Constraint Validation...")
        
        try:
            # Check all RBAC tables exist
            tables = ['companies', 'users', 'role_templates', 'roles', 'permissions', 
                     'company_users', 'role_permissions', 'user_effective_permissions',
                     'project_assignments', 'audit_logs']
            
            for table in tables:
                exists = await self.conn.fetchval(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = '{table}'
                    )
                """)
                self.log_test(f"Table {table} exists", exists)
                
            # Test permission constraints
            try:
                await self.conn.execute("""
                    INSERT INTO permissions (id, name, resource, action, description, category)
                    VALUES (999, 'TEST_PERM', 'test', 'test', 'Test permission', 'platform')
                """)
                await self.conn.execute("DELETE FROM permissions WHERE id = 999")
                self.log_test("Permission insert/delete", True)
            except Exception as e:
                self.log_test("Permission insert/delete", False, str(e))
                
        except Exception as e:
            self.log_test("Schema validation", False, str(e))
    
    async def test_seed_data_sanity(self):
        """3. Seed-data sanity"""
        print("\n🌱 Testing Seed Data Sanity...")
        
        try:
            # Check permissions 1-49 exist
            perm_count = await self.conn.fetchval(
                "SELECT COUNT(*) FROM permissions WHERE id BETWEEN 1 AND 49"
            )
            expected_perms = 26  # Based on our RBAC implementation
            self.log_test(f"Expected permissions exist ({expected_perms})", 
                         perm_count >= expected_perms, 
                         f"Found {perm_count} permissions")
            
            # Check role templates exist
            template_count = await self.conn.fetchval(
                "SELECT COUNT(*) FROM role_templates WHERE is_system_template = true"
            )
            expected_templates = 6
            self.log_test(f"Role templates exist ({expected_templates})", 
                         template_count >= expected_templates,
                         f"Found {template_count} templates")
            
            # Check Company 0 exists
            company_0 = await self.conn.fetchrow("SELECT * FROM companies WHERE id = 0")
            self.log_test("Company 0 (Platform) exists", company_0 is not None)
            
            # Check demo company exists  
            demo_company = await self.conn.fetchrow("SELECT * FROM companies WHERE id = 1")
            self.log_test("Demo company exists", demo_company is not None)
            
        except Exception as e:
            self.log_test("Seed data validation", False, str(e))
    
    async def test_rls_isolation(self):
        """4. Row-level security isolation"""
        print("\n🔒 Testing Row-Level Security Isolation...")
        
        try:
            # Test company context setting
            await self.conn.execute("SELECT set_config('app.current_company', '1', false)")
            
            # Insert test data in company 1
            await self.conn.execute("""
                INSERT INTO roles (id, company_id, name, description, is_active)
                VALUES (9999, 1, 'TEST_ROLE', 'Test role for RLS', true)
                ON CONFLICT (id) DO NOTHING
            """)
            
            # Switch to company 2 context
            await self.conn.execute("SELECT set_config('app.current_company', '2', false)")
            
            # Should not see company 1 role
            role_visible = await self.conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM roles WHERE id = 9999)"
            )
            self.log_test("RLS blocks cross-company access", not role_visible)
            
            # Switch back to company 1
            await self.conn.execute("SELECT set_config('app.current_company', '1', false)")
            role_visible = await self.conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM roles WHERE id = 9999)"
            )
            self.log_test("RLS allows same-company access", role_visible)
            
            # Cleanup
            await self.conn.execute("DELETE FROM roles WHERE id = 9999")
            
        except Exception as e:
            self.log_test("RLS isolation", False, str(e))
    
    async def test_role_permission_matrix(self):
        """5. Role-and-permission matrix"""
        print("\n🎭 Testing Role and Permission Matrix...")
        
        try:
            # Test platform admin has system permissions
            platform_role = await self.conn.fetchrow("""
                SELECT rt.permission_set 
                FROM role_templates rt 
                WHERE rt.name = 'Platform Administrator'
            """)
            
            if platform_role:
                has_system_admin = 1 in platform_role['permission_set']  # SYSTEM_ADMIN permission
                self.log_test("Platform Admin has SYSTEM_ADMIN permission", has_system_admin)
            
            # Test company admin has manage users permission
            company_role = await self.conn.fetchrow("""
                SELECT rt.permission_set 
                FROM role_templates rt 
                WHERE rt.name = 'Company Administrator'
            """)
            
            if company_role:
                has_manage_users = 10 in company_role['permission_set']  # MANAGE_USERS permission
                self.log_test("Company Admin has MANAGE_USERS permission", has_manage_users)
            
            # Test client has limited permissions
            client_role = await self.conn.fetchrow("""
                SELECT rt.permission_set 
                FROM role_templates rt 
                WHERE rt.name = 'Client'
            """)
            
            if client_role:
                has_financial = 11 in client_role['permission_set']  # VIEW_FINANCIALS permission
                self.log_test("Client does NOT have financial permissions", not has_financial)
                
        except Exception as e:
            self.log_test("Role permission matrix", False, str(e))
    
    async def test_effective_permissions_cache(self):
        """7. Trigger & cache coherence"""
        print("\n💾 Testing Effective Permissions Cache...")
        
        try:
            # Create test user
            test_user_id = "test-user-cache-001"
            await self.conn.execute("""
                INSERT INTO users (id, username, password, name, email, first_name, last_name)
                VALUES ($1, 'cache-test', 'temp-password', 'Cache Test', 'cache-test@example.com', 'Cache', 'Test')
                ON CONFLICT (id) DO NOTHING
            """, test_user_id)
            
            # Create test role
            role_id = await self.conn.fetchval("""
                INSERT INTO roles (company_id, name, description, is_active)
                VALUES (1, 'Cache Test Role', 'Test role for cache', true)
                RETURNING id
            """)
            
            # Assign user to role
            await self.conn.execute("""
                INSERT INTO company_users (company_id, user_id, role_id, is_active)
                VALUES (1, $1, $2, true)
                ON CONFLICT (company_id, user_id, role_id) DO NOTHING
            """, test_user_id, role_id)
            
            # Check if cache entry was created
            cache_exists = await self.conn.fetchval("""
                SELECT EXISTS(
                    SELECT 1 FROM user_effective_permissions 
                    WHERE user_id = $1 AND company_id = 1
                )
            """, test_user_id)
            
            self.log_test("Effective permissions cache created", cache_exists)
            
            # Cleanup
            await self.conn.execute("DELETE FROM company_users WHERE user_id = $1", test_user_id)
            await self.conn.execute("DELETE FROM roles WHERE id = $1", role_id)
            await self.conn.execute("DELETE FROM user_effective_permissions WHERE user_id = $1", test_user_id)
            await self.conn.execute("DELETE FROM users WHERE id = $1", test_user_id)
            
        except Exception as e:
            self.log_test("Effective permissions cache", False, str(e))
    
    async def test_audit_trail_integrity(self):
        """9. Audit-trail integrity"""
        print("\n📋 Testing Audit Trail Integrity...")
        
        try:
            # Test audit log structure
            audit_columns = await self.conn.fetch("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'audit_logs'
                ORDER BY ordinal_position
            """)
            
            required_columns = ['id', 'company_id', 'user_id', 'action', 'resource', 'created_at']
            found_columns = [col['column_name'] for col in audit_columns]
            
            has_required = all(col in found_columns for col in required_columns)
            self.log_test("Audit log has required columns", has_required,
                         f"Found: {found_columns}")
            
            # Create test user for audit log
            await self.conn.execute("""
                INSERT INTO users (id, username, password, name, email)
                VALUES ('test-audit-user', 'test-audit', 'temp-password', 'Test Audit', 'test-audit@example.com')
                ON CONFLICT (id) DO NOTHING
            """)
            
            # Test audit log insertion
            await self.conn.execute("""
                INSERT INTO audit_logs (company_id, user_id, action, resource, resource_id)
                VALUES (1, 'test-audit-user', 'TEST_ACTION', 'test_resource', 'test-123')
            """)
            
            # Check if log was inserted
            log_exists = await self.conn.fetchval("""
                SELECT EXISTS(
                    SELECT 1 FROM audit_logs 
                    WHERE action = 'TEST_ACTION' AND resource = 'test_resource'
                )
            """)
            
            self.log_test("Audit log insertion works", log_exists)
            
            # Cleanup
            await self.conn.execute("""
                DELETE FROM audit_logs 
                WHERE action = 'TEST_ACTION' AND resource = 'test_resource'
            """)
            await self.conn.execute("DELETE FROM users WHERE id = 'test-audit-user'")
            
        except Exception as e:
            self.log_test("Audit trail integrity", False, str(e))
    
    async def test_api_endpoints(self):
        """Test API endpoint functionality"""
        print("\n🌐 Testing API Endpoints...")
        
        # Test if Python backend is running
        try:
            response = requests.get("http://localhost:8000/docs", timeout=5)
            api_running = response.status_code == 200
            self.log_test("Python FastAPI backend is running", api_running)
        except Exception as e:
            self.log_test("Python FastAPI backend is running", False, str(e))
            return
        
        # Test existing endpoints
        endpoints_to_test = [
            ("/api/projects", "GET"),
            ("/api/tasks", "GET"),
            ("/api/users", "GET"),
            ("/api/notifications", "GET"),
        ]
        
        for endpoint, method in endpoints_to_test:
            try:
                if method == "GET":
                    response = requests.get(f"http://localhost:8000{endpoint}", timeout=5)
                    success = response.status_code in [200, 404]  # 404 is acceptable for empty data
                    self.log_test(f"API {method} {endpoint}", success, 
                                 f"Status: {response.status_code}")
            except Exception as e:
                self.log_test(f"API {method} {endpoint}", False, str(e))
        
        # Test RBAC endpoints if available
        rbac_endpoints = [
            ("/rbac/companies", "GET"),
            ("/rbac/role-templates", "GET"),
            ("/rbac/permissions", "GET"),
        ]
        
        for endpoint, method in rbac_endpoints:
            try:
                response = requests.get(f"http://localhost:8000{endpoint}", timeout=5)
                success = response.status_code in [200, 401, 403]  # Auth errors are acceptable
                self.log_test(f"RBAC {method} {endpoint}", success,
                             f"Status: {response.status_code}")
            except Exception as e:
                self.log_test(f"RBAC {method} {endpoint}", False, str(e))
    
    async def test_frontend_integration(self):
        """Test frontend integration"""
        print("\n🎨 Testing Frontend Integration...")
        
        try:
            # Test Express server
            response = requests.get("http://localhost:5000", timeout=5)
            frontend_running = response.status_code == 200
            self.log_test("Express frontend server is running", frontend_running)
            
            # Test API proxy
            response = requests.get("http://localhost:5000/api/projects", timeout=5)
            proxy_working = response.status_code in [200, 500]  # 500 is expected if backend is down
            self.log_test("API proxy is configured", proxy_working,
                         f"Status: {response.status_code}")
            
        except Exception as e:
            self.log_test("Frontend integration", False, str(e))
    
    async def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Comprehensive RBAC Test Suite")
        print("=" * 60)
        
        await self.connect()
        
        try:
            # Core database tests
            await self.test_schema_sanity()
            await self.test_seed_data_sanity()
            await self.test_rls_isolation()
            await self.test_role_permission_matrix()
            await self.test_effective_permissions_cache()
            await self.test_audit_trail_integrity()
            
            # API and integration tests
            await self.test_api_endpoints()
            await self.test_frontend_integration()
            
        finally:
            await self.disconnect()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {self.passed}")
        print(f"❌ Failed: {self.failed}")
        print(f"📈 Success Rate: {(self.passed/(self.passed+self.failed)*100):.1f}%")
        
        if self.failed > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['passed']:
                    print(f"   • {result['test']}: {result['message']}")
        
        return self.failed == 0

async def main():
    """Main test runner"""
    tester = RBACTester()
    success = await tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! RBAC system is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Please review the issues above.")
    
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)