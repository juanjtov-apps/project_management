/**
 * Frontend Integration Test Suite
 * Tests critical frontend functionality and API integration
 */

const BASE_URL = 'http://localhost:5000';

class FrontendTestSuite {
    constructor() {
        this.testResults = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${level}: ${message}`);
    }

    async testAPI(method, endpoint, data = null, expectedStatus = null) {
        this.testResults.total++;
        
        try {
            const options = {
                method: method.toUpperCase(),
                headers: {
                    'Content-Type': 'application/json',
                },
            };
            
            if (data) {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(`${BASE_URL}${endpoint}`, options);
            
            if (expectedStatus && response.status !== expectedStatus) {
                this.log(`❌ FAIL: ${method} ${endpoint} - Expected ${expectedStatus}, got ${response.status}`, 'ERROR');
                this.testResults.failed++;
                this.testResults.errors.push(`${method} ${endpoint}: Status ${response.status}`);
                return null;
            }
            
            this.log(`✅ PASS: ${method} ${endpoint} - Status ${response.status}`);
            this.testResults.passed++;
            
            return response.ok ? await response.json() : null;
            
        } catch (error) {
            this.log(`❌ ERROR: ${method} ${endpoint} - ${error.message}`, 'ERROR');
            this.testResults.failed++;
            this.testResults.errors.push(`${method} ${endpoint}: ${error.message}`);
            return null;
        }
    }

    async testCriticalEndpoints() {
        this.log('🔍 Testing Critical API Endpoints...');
        
        // Authentication
        await this.testAPI('GET', '/api/auth/user', null, null);
        
        // Core data endpoints
        await this.testAPI('GET', '/api/tasks');
        await this.testAPI('GET', '/api/projects');
        await this.testAPI('GET', '/api/companies');
        await this.testAPI('GET', '/api/users/managers');
        await this.testAPI('GET', '/api/photos');
        await this.testAPI('GET', '/api/notifications');
        
        // RBAC endpoints
        await this.testAPI('GET', '/api/rbac/users');
        await this.testAPI('GET', '/api/rbac/roles');
        await this.testAPI('GET', '/api/rbac/permissions');
    }

    async testCRUDOperations() {
        this.log('📝 Testing CRUD Operations...');
        
        // Test task creation and deletion
        const testTask = {
            title: `Frontend Test Task ${Date.now()}`,
            description: 'Test task from frontend integration test',
            category: 'general',
            status: 'pending',
            priority: 'medium'
        };
        
        const createdTask = await this.testAPI('POST', '/api/tasks', testTask);
        
        if (createdTask && createdTask.id) {
            // Update task
            await this.testAPI('PUT', `/api/tasks/${createdTask.id}`, { status: 'in-progress' });
            
            // Delete task
            await this.testAPI('DELETE', `/api/tasks/${createdTask.id}`);
        }
    }

    async testFrontendRoutes() {
        this.log('🌐 Testing Frontend Route Accessibility...');
        
        const routes = [
            '/',
            '/dashboard',
            '/projects',
            '/tasks',
            '/project-health',
            '/schedule',
            '/photos',
            '/project-logs',
            '/crew',
            '/subs',
            '/rbac-admin'
        ];
        
        for (const route of routes) {
            this.testResults.total++;
            try {
                const response = await fetch(`${BASE_URL}${route}`);
                if (response.ok) {
                    this.log(`✅ PASS: Route ${route} - Status ${response.status}`);
                    this.testResults.passed++;
                } else {
                    this.log(`❌ FAIL: Route ${route} - Status ${response.status}`, 'ERROR');
                    this.testResults.failed++;
                    this.testResults.errors.push(`Route ${route}: Status ${response.status}`);
                }
            } catch (error) {
                this.log(`❌ ERROR: Route ${route} - ${error.message}`, 'ERROR');
                this.testResults.failed++;
                this.testResults.errors.push(`Route ${route}: ${error.message}`);
            }
        }
    }

    async runFullSuite() {
        this.log('🚀 Starting Frontend Integration Test Suite');
        this.log('='.repeat(60));
        
        const startTime = Date.now();
        
        await this.testCriticalEndpoints();
        await this.testCRUDOperations();
        await this.testFrontendRoutes();
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        this.generateReport(duration);
    }

    generateReport(duration) {
        this.log('='.repeat(60));
        this.log('📊 FRONTEND INTEGRATION TEST RESULTS');
        this.log('='.repeat(60));
        
        const { total, passed, failed } = this.testResults;
        const successRate = total > 0 ? (passed / total * 100) : 0;
        
        this.log(`Total Tests: ${total}`);
        this.log(`Passed: ${passed}`);
        this.log(`Failed: ${failed}`);
        this.log(`Success Rate: ${successRate.toFixed(1)}%`);
        this.log(`Duration: ${duration.toFixed(2)} seconds`);
        
        if (failed > 0) {
            this.log('\n❌ FAILED TESTS:');
            this.testResults.errors.forEach(error => {
                this.log(`  - ${error}`);
            });
        }
        
        // Overall status
        if (successRate >= 95) {
            this.log('\n🟢 FRONTEND STATUS: EXCELLENT - All systems operational');
        } else if (successRate >= 85) {
            this.log('\n🟡 FRONTEND STATUS: GOOD - Minor issues detected');
        } else {
            this.log('\n🔴 FRONTEND STATUS: CRITICAL - Major issues require attention');
        }
    }
}

// Run the test suite
const tester = new FrontendTestSuite();
tester.runFullSuite();