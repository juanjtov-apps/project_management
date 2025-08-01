#!/usr/bin/env node
/**
 * Frontend Integration Tests
 * Tests React components, API integration, and user interactions
 */

import puppeteer from 'puppeteer';
import fs from 'fs';

class FrontendTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = [];
        this.passed = 0;
        this.failed = 0;
        this.baseUrl = 'http://localhost:5000';
    }

    logTest(testName, passed, message = '') {
        const status = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${testName}`);
        if (message) {
            console.log(`    ${message}`);
        }
        
        this.testResults.push({
            test: testName,
            passed: passed,
            message: message,
            timestamp: new Date().toISOString()
        });
        
        if (passed) {
            this.passed++;
        } else {
            this.failed++;
        }
    }

    async setup() {
        console.log('🚀 Setting up browser for frontend testing...');
        try {
            this.browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            this.page = await this.browser.newPage();
            
            // Set viewport
            await this.page.setViewport({ width: 1200, height: 800 });
            
            // Listen for console logs
            this.page.on('console', msg => {
                if (msg.type() === 'error') {
                    console.log('Browser console error:', msg.text());
                }
            });
            
            this.logTest('Browser setup', true);
        } catch (error) {
            this.logTest('Browser setup', false, error.message);
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async testPageLoad() {
        console.log('\n🌐 Testing Page Load and Basic Navigation');
        
        try {
            // Test home page load
            await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0', timeout: 10000 });
            const title = await this.page.title();
            this.logTest('Home page loads', title.length > 0, `Title: ${title}`);
            
            // Check if React app is mounted
            const reactRoot = await this.page.$('[data-reactroot], #root');
            this.logTest('React app mounted', reactRoot !== null);
            
            // Test sidebar navigation
            const sidebar = await this.page.$('nav, .sidebar');
            this.logTest('Sidebar navigation present', sidebar !== null);
            
            // Test if navigation links are present
            const navLinks = await this.page.$$('nav a, .sidebar a');
            this.logTest('Navigation links present', navLinks.length > 0, `Found ${navLinks.length} links`);
            
        } catch (error) {
            this.logTest('Page load', false, error.message);
        }
    }

    async testAuthenticationFlow() {
        console.log('\n🔐 Testing Authentication Flow');
        
        try {
            // Check if we're on landing page (unauthenticated)
            await this.page.goto(this.baseUrl);
            
            // Look for login button or authentication elements
            const loginElement = await this.page.$('a[href*="login"], button:contains("Login"), .login');
            this.logTest('Authentication UI present', loginElement !== null);
            
            // Test that protected content shows appropriate state
            const content = await this.page.content();
            const hasAuthContent = content.includes('log in') || content.includes('Login') || content.includes('authenticate');
            this.logTest('Authentication state handled', hasAuthContent);
            
        } catch (error) {
            this.logTest('Authentication flow', false, error.message);
        }
    }

    async testUIComponents() {
        console.log('\n🎨 Testing UI Components');
        
        try {
            await this.page.goto(this.baseUrl);
            
            // Test for key UI components
            const components = [
                { selector: 'button', name: 'Buttons' },
                { selector: 'input', name: 'Input fields' },
                { selector: 'nav', name: 'Navigation' },
                { selector: '.card, [class*="card"]', name: 'Card components' }
            ];
            
            for (const component of components) {
                const elements = await this.page.$$(component.selector);
                this.logTest(`${component.name} rendered`, elements.length > 0, `Found ${elements.length} elements`);
            }
            
            // Test for specific Tower Flow components
            const quickActions = await this.page.$('.quick-actions, [class*="quick"]');
            this.logTest('Quick Actions component', quickActions !== null);
            
        } catch (error) {
            this.logTest('UI components', false, error.message);
        }
    }

    async testRBACInterface() {
        console.log('\n🛡️ Testing RBAC Interface');
        
        try {
            await this.page.goto(this.baseUrl);
            
            // Look for RBAC admin link in navigation
            const rbacLink = await this.page.$('a[href*="rbac"], a:contains("RBAC")');
            this.logTest('RBAC admin link present', rbacLink !== null);
            
            if (rbacLink) {
                // Try to navigate to RBAC page
                try {
                    await rbacLink.click();
                    await this.page.waitForNavigation({ timeout: 5000 });
                    
                    const currentUrl = this.page.url();
                    this.logTest('RBAC page navigation', currentUrl.includes('rbac'));
                    
                    // Check for RBAC components
                    const rbacContent = await this.page.content();
                    const hasRbacContent = rbacContent.includes('role') || rbacContent.includes('permission') || rbacContent.includes('company');
                    this.logTest('RBAC content loaded', hasRbacContent);
                    
                } catch (navError) {
                    this.logTest('RBAC page navigation', false, 'Navigation timeout or auth required');
                }
            }
            
        } catch (error) {
            this.logTest('RBAC interface', false, error.message);
        }
    }

    async testAPIIntegration() {
        console.log('\n🔗 Testing API Integration');
        
        try {
            await this.page.goto(this.baseUrl);
            
            // Monitor network requests
            const apiRequests = [];
            this.page.on('request', request => {
                if (request.url().includes('/api/')) {
                    apiRequests.push(request.url());
                }
            });
            
            // Wait for initial API calls
            await this.page.waitForTimeout(3000);
            
            this.logTest('API requests made', apiRequests.length > 0, `Found ${apiRequests.length} API calls`);
            
            // Check for specific API endpoints
            const expectedEndpoints = ['/api/auth/user', '/api/projects', '/api/tasks', '/api/notifications'];
            const foundEndpoints = expectedEndpoints.filter(endpoint => 
                apiRequests.some(req => req.includes(endpoint))
            );
            
            this.logTest('Expected API endpoints called', foundEndpoints.length > 0, 
                `Found: ${foundEndpoints.join(', ')}`);
            
        } catch (error) {
            this.logTest('API integration', false, error.message);
        }
    }

    async testResponsiveDesign() {
        console.log('\n📱 Testing Responsive Design');
        
        try {
            const viewports = [
                { width: 320, height: 568, name: 'Mobile' },
                { width: 768, height: 1024, name: 'Tablet' },
                { width: 1200, height: 800, name: 'Desktop' }
            ];
            
            for (const viewport of viewports) {
                await this.page.setViewport(viewport);
                await this.page.goto(this.baseUrl);
                
                // Check if content is visible and properly laid out
                const body = await this.page.$('body');
                const bodySize = await body.boundingBox();
                
                this.logTest(`${viewport.name} viewport (${viewport.width}x${viewport.height})`, 
                    bodySize.width > 0 && bodySize.height > 0);
            }
            
        } catch (error) {
            this.logTest('Responsive design', false, error.message);
        }
    }

    async testAccessibility() {
        console.log('\n♿ Testing Basic Accessibility');
        
        try {
            await this.page.goto(this.baseUrl);
            
            // Check for basic accessibility features
            const hasTitle = await this.page.title();
            this.logTest('Page has title', hasTitle.length > 0);
            
            // Check for alt text on images
            const images = await this.page.$$('img');
            let imagesWithAlt = 0;
            for (const img of images) {
                const alt = await img.getAttribute('alt');
                if (alt !== null) imagesWithAlt++;
            }
            this.logTest('Images have alt text', images.length === 0 || imagesWithAlt > 0, 
                `${imagesWithAlt}/${images.length} images`);
            
            // Check for form labels
            const inputs = await this.page.$$('input');
            const labels = await this.page.$$('label');
            this.logTest('Form accessibility', inputs.length === 0 || labels.length > 0, 
                `${labels.length} labels for ${inputs.length} inputs`);
            
        } catch (error) {
            this.logTest('Accessibility', false, error.message);
        }
    }

    async runAllTests() {
        console.log('🧪 Starting Comprehensive Frontend Test Suite');
        console.log('='.repeat(80));
        
        await this.setup();
        
        if (this.browser) {
            await this.testPageLoad();
            await this.testAuthenticationFlow();
            await this.testUIComponents();
            await this.testRBACInterface();
            await this.testAPIIntegration();
            await this.testResponsiveDesign();
            await this.testAccessibility();
        }
        
        await this.cleanup();
        
        // Print summary
        console.log('\n' + '='.repeat(80));
        console.log('📊 FRONTEND TEST SUMMARY');
        console.log('='.repeat(80));
        console.log(`✅ Passed: ${this.passed}`);
        console.log(`❌ Failed: ${this.failed}`);
        console.log(`📈 Success Rate: ${((this.passed/(this.passed+this.failed))*100).toFixed(1)}%`);
        
        if (this.failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            for (const result of this.testResults) {
                if (!result.passed) {
                    console.log(`   • ${result.test}: ${result.message}`);
                }
            }
        }
        
        return this.failed === 0;
    }
}

async function main() {
    const tester = new FrontendTester();
    const success = await tester.runAllTests();
    
    if (success) {
        console.log('\n🎉 All frontend tests passed!');
    } else {
        console.log('\n⚠️  Some frontend tests failed. Please review the issues above.');
    }
    
    return success;
}

// Run if this is the main module
main().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
});

export { FrontendTester };