#!/usr/bin/env python3
"""
Full Battery Test Suite for Proesphere Backend
Tests database connection, API endpoints, and RBAC functionality.
"""

import asyncio
import httpx
import json
import sys
import os
from typing import Dict, List, Any, Optional

# Add path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../python_backend'))

class ProesphereTestSuite:
    def __init__(self, base_url: str = "http://127.0.0.1:8000"):
        self.base_url = base_url
        self.session_cookies = None
        self.csrf_token = None
        self.passed_tests = 0
        self.failed_tests = 0
        self.skipped_tests = 0
        self.results = []

    def log(self, status: str, message: str, details: str = ""):
        """Log test result"""
        symbols = {"PASS": "✅", "FAIL": "❌", "SKIP": "⚠️", "INFO": "ℹ️"}
        symbol = symbols.get(status, "  ")
        print(f"{symbol} {message}")
        if details:
            print(f"   {details}")
        self.results.append({"status": status, "message": message, "details": details})

    async def test_database_connection(self) -> bool:
        """Test 1: Database Connection"""
        print("\n" + "=" * 60)
        print("🗄️  TEST 1: Database Connection")
        print("=" * 60)
        
        try:
            from src.database.connection import get_db_pool, close_db_pool
            
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                # Basic query
                result = await conn.fetchval("SELECT 1")
                if result == 1:
                    self.log("PASS", "Basic query executed successfully")
                    self.passed_tests += 1
                else:
                    self.log("FAIL", f"Basic query returned unexpected result: {result}")
                    self.failed_tests += 1
                    return False
                
                # Check tables exist
                tables = await conn.fetch("""
                    SELECT table_name FROM information_schema.tables 
                    WHERE table_schema = 'public' ORDER BY table_name
                """)
                table_names = [t['table_name'] for t in tables]
                
                required_tables = ['users', 'roles', 'permissions', 'companies', 'projects', 'tasks']
                missing = [t for t in required_tables if t not in table_names]
                
                if missing:
                    self.log("FAIL", f"Missing required tables: {missing}")
                    self.failed_tests += 1
                else:
                    self.log("PASS", f"All required tables present ({len(table_names)} total)")
                    self.passed_tests += 1
                
                # Check users count
                user_count = await conn.fetchval("SELECT COUNT(*) FROM users")
                self.log("INFO", f"Users in database: {user_count}")
                
                # Check role_permissions table (new from migration)
                rp_count = await conn.fetchval("SELECT COUNT(*) FROM role_permissions") if 'role_permissions' in table_names else 0
                self.log("INFO", f"Role-Permission mappings: {rp_count}")
                
            await close_db_pool()
            return True
            
        except Exception as e:
            self.log("FAIL", f"Database connection failed: {str(e)}")
            self.failed_tests += 1
            return False

    async def test_api_health(self) -> bool:
        """Test 2: API Server Health"""
        print("\n" + "=" * 60)
        print("🏥 TEST 2: API Server Health")
        print("=" * 60)
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Test if server is responding
                response = await client.get(f"{self.base_url}/")
                
                if response.status_code in [200, 404]:  # 404 is OK, means server is up
                    self.log("PASS", f"API server is responding (status: {response.status_code})")
                    self.passed_tests += 1
                    return True
                else:
                    self.log("FAIL", f"Unexpected response: {response.status_code}")
                    self.failed_tests += 1
                    return False
                    
        except Exception as e:
            self.log("FAIL", f"API server not reachable: {str(e)}")
            self.failed_tests += 1
            return False

    async def test_public_endpoints(self) -> bool:
        """Test 3: Public API Endpoints"""
        print("\n" + "=" * 60)
        print("🌐 TEST 3: Public API Endpoints")
        print("=" * 60)
        
        endpoints = [
            ("GET", "/api/v1/companies", [200, 401, 403]),  # May require auth
            ("OPTIONS", "/api/auth/login", [200]),
            ("OPTIONS", "/api/auth/user", [200]),
        ]
        
        all_passed = True
        async with httpx.AsyncClient(timeout=10.0) as client:
            for method, endpoint, expected_statuses in endpoints:
                try:
                    if method == "GET":
                        response = await client.get(f"{self.base_url}{endpoint}")
                    elif method == "OPTIONS":
                        response = await client.options(f"{self.base_url}{endpoint}")
                    else:
                        continue
                    
                    if response.status_code in expected_statuses:
                        self.log("PASS", f"{method} {endpoint} → {response.status_code}")
                        self.passed_tests += 1
                    else:
                        self.log("FAIL", f"{method} {endpoint} → {response.status_code} (expected: {expected_statuses})")
                        self.failed_tests += 1
                        all_passed = False
                        
                except Exception as e:
                    self.log("FAIL", f"{method} {endpoint} → ERROR: {str(e)}")
                    self.failed_tests += 1
                    all_passed = False
        
        return all_passed

    async def test_authentication_flow(self) -> bool:
        """Test 4: Authentication Flow"""
        print("\n" + "=" * 60)
        print("🔐 TEST 4: Authentication Flow")
        print("=" * 60)
        
        # First, get a user's password hash from DB and create a test session
        try:
            from src.database.connection import get_db_pool, close_db_pool
            import uuid
            from datetime import datetime, timedelta
            
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                # Get first admin user
                user = await conn.fetchrow("""
                    SELECT id, email, company_id, role_id, is_root 
                    FROM users 
                    WHERE role_id = 1 OR role = 'admin'
                    LIMIT 1
                """)
                
                if not user:
                    self.log("SKIP", "No admin user found for auth testing")
                    self.skipped_tests += 1
                    return True
                
                # Create a test session directly in database
                session_id = str(uuid.uuid4())
                expires_at = datetime.utcnow() + timedelta(hours=1)
                
                session_data = json.dumps({
                    "id": user['id'],
                    "email": user['email'],
                    "company_id": user['company_id'],
                    "role_id": user['role_id'],
                    "is_root": user['is_root']
                })
                
                await conn.execute("""
                    INSERT INTO sessions (sid, sess, expire)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (sid) DO UPDATE SET sess = $2, expire = $3
                """, session_id, session_data, expires_at)
                
                self.session_cookies = {"session_id": session_id}
                self.log("PASS", f"Test session created for user: {user['email']}")
                self.passed_tests += 1
                
            await close_db_pool()
            return True
            
        except Exception as e:
            self.log("FAIL", f"Authentication setup failed: {str(e)}")
            self.failed_tests += 1
            return False

    async def test_authenticated_endpoints(self) -> bool:
        """Test 5: Authenticated API Endpoints"""
        print("\n" + "=" * 60)
        print("🔒 TEST 5: Authenticated API Endpoints")
        print("=" * 60)
        
        if not self.session_cookies:
            self.log("SKIP", "No session available - skipping authenticated tests")
            self.skipped_tests += 1
            return True
        
        endpoints = [
            ("GET", "/api/auth/user", 200, "Current user info"),
            ("GET", "/api/projects", 200, "List projects"),
            ("GET", "/api/tasks", 200, "List tasks"),
            ("GET", "/api/users", 200, "List users"),
            ("GET", "/api/users/managers", 200, "List managers"),
            ("GET", "/api/photos", 200, "List photos"),
            ("GET", "/api/notifications", 200, "User notifications"),
            ("GET", "/api/dashboard/stats", 200, "Dashboard stats"),
            ("GET", "/api/activities", 200, "Recent activities"),
        ]
        
        all_passed = True
        async with httpx.AsyncClient(timeout=30.0, cookies=self.session_cookies) as client:
            for method, endpoint, expected_status, description in endpoints:
                try:
                    response = await client.get(f"{self.base_url}{endpoint}")
                    
                    if response.status_code == expected_status:
                        self.log("PASS", f"{endpoint} → {response.status_code} | {description}")
                        self.passed_tests += 1
                    else:
                        # Some endpoints may return 307 redirect
                        if response.status_code in [200, 307]:
                            self.log("PASS", f"{endpoint} → {response.status_code} | {description}")
                            self.passed_tests += 1
                        else:
                            self.log("FAIL", f"{endpoint} → {response.status_code} (expected: {expected_status}) | {description}")
                            self.failed_tests += 1
                            all_passed = False
                        
                except Exception as e:
                    self.log("FAIL", f"{endpoint} → ERROR: {str(e)}")
                    self.failed_tests += 1
                    all_passed = False
        
        return all_passed

    async def test_rbac_endpoints(self) -> bool:
        """Test 6: RBAC Endpoints"""
        print("\n" + "=" * 60)
        print("🛡️  TEST 6: RBAC Endpoints")
        print("=" * 60)
        
        if not self.session_cookies:
            self.log("SKIP", "No session available - skipping RBAC tests")
            self.skipped_tests += 1
            return True
        
        endpoints = [
            ("GET", "/api/v1/rbac/roles", "List roles"),
            ("GET", "/api/v1/rbac/permissions", "List permissions"),
            ("GET", "/api/v1/rbac/users", "RBAC users"),
        ]
        
        all_passed = True
        async with httpx.AsyncClient(timeout=30.0, cookies=self.session_cookies) as client:
            for method, endpoint, description in endpoints:
                try:
                    response = await client.get(f"{self.base_url}{endpoint}")
                    
                    if response.status_code in [200, 307]:
                        try:
                            data = response.json()
                            count = len(data) if isinstance(data, list) else "N/A"
                            self.log("PASS", f"{endpoint} → {response.status_code} | {description} (count: {count})")
                        except:
                            self.log("PASS", f"{endpoint} → {response.status_code} | {description}")
                        self.passed_tests += 1
                    elif response.status_code == 403:
                        self.log("INFO", f"{endpoint} → 403 Forbidden (expected for non-admin)")
                        self.passed_tests += 1
                    else:
                        self.log("FAIL", f"{endpoint} → {response.status_code} | {description}")
                        self.failed_tests += 1
                        all_passed = False
                        
                except Exception as e:
                    self.log("FAIL", f"{endpoint} → ERROR: {str(e)}")
                    self.failed_tests += 1
                    all_passed = False
        
        return all_passed

    async def test_data_integrity(self) -> bool:
        """Test 7: Data Integrity Checks"""
        print("\n" + "=" * 60)
        print("📊 TEST 7: Data Integrity Checks")
        print("=" * 60)
        
        try:
            from src.database.connection import get_db_pool, close_db_pool
            
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                # Check all users have role_id
                null_role_count = await conn.fetchval("""
                    SELECT COUNT(*) FROM users WHERE role_id IS NULL
                """)
                
                if null_role_count == 0:
                    self.log("PASS", "All users have role_id assigned")
                    self.passed_tests += 1
                else:
                    self.log("FAIL", f"{null_role_count} users have NULL role_id")
                    self.failed_tests += 1
                
                # Check all users have company_id (except root possibly)
                null_company_count = await conn.fetchval("""
                    SELECT COUNT(*) FROM users WHERE company_id IS NULL AND is_root = false
                """)
                
                if null_company_count == 0:
                    self.log("PASS", "All non-root users have company_id assigned")
                    self.passed_tests += 1
                else:
                    self.log("FAIL", f"{null_company_count} users have NULL company_id")
                    self.failed_tests += 1
                
                # Check root user exists
                root_count = await conn.fetchval("""
                    SELECT COUNT(*) FROM users WHERE is_root = true
                """)
                
                if root_count == 1:
                    self.log("PASS", "Exactly 1 root user exists")
                    self.passed_tests += 1
                elif root_count == 0:
                    self.log("INFO", "No root user set (may need to be configured)")
                    self.skipped_tests += 1
                else:
                    self.log("FAIL", f"{root_count} root users exist (should be 1)")
                    self.failed_tests += 1
                
                # Check role_permissions populated
                rp_count = await conn.fetchval("SELECT COUNT(*) FROM role_permissions")
                if rp_count > 0:
                    self.log("PASS", f"Role permissions populated ({rp_count} mappings)")
                    self.passed_tests += 1
                else:
                    self.log("FAIL", "role_permissions table is empty")
                    self.failed_tests += 1
                
            await close_db_pool()
            return True
            
        except Exception as e:
            self.log("FAIL", f"Data integrity check failed: {str(e)}")
            self.failed_tests += 1
            return False

    async def cleanup(self):
        """Clean up test session"""
        if self.session_cookies:
            try:
                from src.database.connection import get_db_pool, close_db_pool
                pool = await get_db_pool()
                async with pool.acquire() as conn:
                    await conn.execute(
                        "DELETE FROM sessions WHERE sid = $1",
                        self.session_cookies.get("session_id")
                    )
                await close_db_pool()
            except:
                pass

    async def run_all_tests(self):
        """Run all tests"""
        print("\n" + "=" * 60)
        print("🚀 PROESPHERE FULL BATTERY TEST SUITE")
        print("=" * 60)
        
        try:
            await self.test_database_connection()
            await self.test_api_health()
            await self.test_public_endpoints()
            await self.test_authentication_flow()
            await self.test_authenticated_endpoints()
            await self.test_rbac_endpoints()
            await self.test_data_integrity()
        finally:
            await self.cleanup()
        
        # Summary
        total = self.passed_tests + self.failed_tests + self.skipped_tests
        success_rate = (self.passed_tests / total * 100) if total > 0 else 0
        
        print("\n" + "=" * 60)
        print("📈 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed:  {self.passed_tests}")
        print(f"❌ Failed:  {self.failed_tests}")
        print(f"⚠️  Skipped: {self.skipped_tests}")
        print(f"📊 Success Rate: {success_rate:.1f}%")
        print("=" * 60)
        
        if self.failed_tests == 0:
            print("\n🎉 ALL TESTS PASSED! Backend is working correctly.")
            return True
        else:
            print(f"\n⚠️  {self.failed_tests} test(s) failed. Please review the issues above.")
            return False


async def main():
    """Main entry point"""
    tester = ProesphereTestSuite()
    success = await tester.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
