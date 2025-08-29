const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Listen for console logs and network requests
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log('API RESPONSE:', response.status(), response.url());
    }
  });
  
  try {
    // Navigate to tasks page
    await page.goto('http://localhost:5000/tasks', { waitUntil: 'networkidle' });
    
    // Wait for tasks to load
    await page.waitForSelector('[data-testid*="task"], .task-item, [class*="task"]', { timeout: 10000 });
    
    // Try to click on first task
    const taskElement = await page.$('[data-testid*="task"], .task-item, [class*="task"]');
    if (taskElement) {
      console.log('CLICKING TASK ELEMENT');
      await taskElement.click();
      
      // Wait a bit to see if edit dialog opens
      await page.waitForTimeout(2000);
      
      // Check if edit dialog opened
      const editDialog = await page.$('[role="dialog"], .dialog, [class*="dialog"]');
      if (editDialog) {
        console.log('SUCCESS: Edit dialog opened');
      } else {
        console.log('FAILED: No edit dialog found');
      }
    } else {
      console.log('FAILED: No task element found');
    }
    
  } catch (error) {
    console.log('ERROR:', error.message);
  }
  
  await browser.close();
})();
