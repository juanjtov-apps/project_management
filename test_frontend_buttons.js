#!/usr/bin/env node
/**
 * Frontend Button and Navigation Tests for Tower Flow
 * Tests all button functionality and navigation routes
 */

import puppeteer from 'puppeteer';

class FrontendTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.passed = 0;
        this.failed = 0;
        this.results = [];
    }

    async init() {
        this.browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        await this.page.goto('http://localhost:5000');
        
        // Wait for app to load
        await this.page.waitForTimeout(2000);
    }

    async test(name, testFunc) {
        try {
            console.log(`Testing: ${name}...`);
            const result = await testFunc.call(this);
            if (result) {
                console.log(`✓ PASS: ${name}`);
                this.passed++;
                this.results.push(`✓ ${name}`);
            } else {
                console.log(`✗ FAIL: ${name}`);
                this.failed++;
                this.results.push(`✗ ${name}`);
            }
        } catch (error) {
            console.log(`✗ ERROR: ${name} - ${error.message}`);
            this.failed++;
            this.results.push(`✗ ${name} - ERROR: ${error.message}`);
        }
    }

    async testQuickActionButtons() {
        // Check if Quick Actions section exists
        const quickActionsExists = await this.page.$('.bg-white .p-6 h3') !== null;
        if (!quickActionsExists) return false;

        // Count visible buttons
        const buttons = await this.page.$$('button');
        return buttons.length >= 4; // Should have at least 4 Quick Action buttons
    }

    async testSidebarNavigation() {
        // Check if sidebar exists
        const sidebar = await this.page.$('aside');
        if (!sidebar) return false;

        // Check navigation links
        const navLinks = await this.page.$$('aside nav ul li a');
        return navLinks.length >= 7; // Should have main navigation items
    }

    async testProjectsPageNavigation() {
        try {
            await this.page.click('a[href="/projects"]');
            await this.page.waitForTimeout(1000);
            const url = this.page.url();
            return url.includes('/projects');
        } catch {
            return false;
        }
    }

    async testTasksPageNavigation() {
        try {
            await this.page.click('a[href="/tasks"]');
            await this.page.waitForTimeout(1000);
            const url = this.page.url();
            return url.includes('/tasks');
        } catch {
            return false;
        }
    }

    async testPhotosPageNavigation() {
        try {
            await this.page.click('a[href="/photos"]');
            await this.page.waitForTimeout(1000);
            const url = this.page.url();
            return url.includes('/photos');
        } catch {
            return false;
        }
    }

    async testSubsPageNavigation() {
        try {
            await this.page.click('a[href="/subs"]');
            await this.page.waitForTimeout(1000);
            const url = this.page.url();
            return url.includes('/subs');
        } catch {
            return false;
        }
    }

    async testDashboardElements() {
        // Return to dashboard
        await this.page.goto('http://localhost:5000');
        await this.page.waitForTimeout(1000);

        // Check for main dashboard elements
        const hasStats = await this.page.$('.grid') !== null;
        const hasQuickActions = await this.page.$('h3') !== null;
        
        return hasStats && hasQuickActions;
    }

    async testButtonClickability() {
        // Test if buttons respond to clicks
        const buttons = await this.page.$$('button');
        let clickableButtons = 0;
        
        for (let button of buttons.slice(0, 5)) { // Test first 5 buttons
            try {
                await button.click();
                clickableButtons++;
                await this.page.waitForTimeout(100);
            } catch {
                // Button might not be clickable
            }
        }
        
        return clickableButtons > 0;
    }

    async testFormElements() {
        // Check if forms exist and can be interacted with
        const inputs = await this.page.$$('input');
        const selects = await this.page.$$('select');
        const textareas = await this.page.$$('textarea');
        
        return inputs.length > 0 || selects.length > 0 || textareas.length > 0;
    }

    async summary() {
        const total = this.passed + this.failed;
        console.log('\n' + '='.repeat(50));
        console.log('FRONTEND TEST SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${this.passed}`);
        console.log(`Failed: ${this.failed}`);
        console.log(`Success Rate: ${total > 0 ? (this.passed/total*100).toFixed(1) : 0}%`);
        console.log('\nDetailed Results:');
        this.results.forEach(result => console.log(`  ${result}`));
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

async function main() {
    console.log('Tower Flow Frontend Button Testing');
    console.log('='.repeat(50));

    const tester = new FrontendTester();
    
    try {
        await tester.init();
        
        // Run all tests
        await tester.test('Quick Action Buttons Visible', tester.testQuickActionButtons);
        await tester.test('Sidebar Navigation Exists', tester.testSidebarNavigation);
        await tester.test('Projects Page Navigation', tester.testProjectsPageNavigation);
        await tester.test('Tasks Page Navigation', tester.testTasksPageNavigation);
        await tester.test('Photos Page Navigation', tester.testPhotosPageNavigation);
        await tester.test('Subs Page Navigation', tester.testSubsPageNavigation);
        await tester.test('Dashboard Elements Visible', tester.testDashboardElements);
        await tester.test('Button Clickability', tester.testButtonClickability);
        await tester.test('Form Elements Present', tester.testFormElements);
        
        await tester.summary();
        
    } catch (error) {
        console.error('Test initialization failed:', error.message);
        return 1;
    } finally {
        await tester.cleanup();
    }
    
    return tester.failed === 0 ? 0 : 1;
}

main().then(process.exit).catch(console.error);