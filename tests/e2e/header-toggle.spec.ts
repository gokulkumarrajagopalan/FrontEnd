import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Header Toggle and UI Enhancements', () => {
  test.beforeEach(async ({ page }) => {
    // Mock electronAPI and sessionStorage to bypass login and Electron dependencies
    await page.addInitScript(() => {
      (window as any).electronAPI = {
        invoke: async (channel: string) => {
          if (channel === 'fetch-license') return { success: true, data: { license_number: '12345' } };
          if (channel === 'fetch-companies') return { success: true, data: [] };
          return { success: true };
        },
        send: () => {},
        on: () => {},
        removeListener: () => {},
        backendUrl: process.env.BACKEND_URL || 'http://3.80.124.37:8080'
      };

      sessionStorage.setItem('authToken', 'mock-token');
      sessionStorage.setItem('currentUser', JSON.stringify({
        username: 'testuser',
        fullName: 'Test User',
        role: 'admin'
      }));
    });

    const filePath = path.join(process.cwd(), 'src/main/index.html');
    await page.goto(`file://${filePath}`);
  });

  test('should verify tableHeaderToggleBtnOpened visibility and behavior', async ({ page }) => {
    // Wait for the app to initialize
    await page.waitForSelector('#page-content');

    // Initially, the toggle button should be hidden (since we start at Home)
    const toggleBtn = page.locator('#tableHeaderToggleBtnOpened');
    await expect(toggleBtn).toBeHidden();

    // Mock a page that has a table and trigger fullscreen
    await page.evaluate(() => {
      if ((window as any).app) {
        (window as any).app.setTableHeaderToggleBtnVisibility(true, false);
      }
    });

    // Now it should be visible with "Collapse Header" title
    await expect(toggleBtn).toBeVisible();
    await expect(toggleBtn).toHaveAttribute('title', 'Collapse Header');

    // Click the button to toggle (mocking the behavior of exitTableFullscreenLock)
    await page.evaluate(() => {
      // Mock window.currentPage with exitTableFullscreenLock
      (window as any).currentPage = {
        exitTableFullscreenLock: () => {
          (window as any).app.setTableHeaderToggleBtnVisibility(false);
        }
      };
    });

    await toggleBtn.click();

    // Verify it's hidden again
    await expect(toggleBtn).toBeHidden();
  });

  test('should verify page transition fade-in animation', async ({ page }) => {
    const pageContent = page.locator('#page-content');
    
    // Check if fade-in class is added during navigation (mock navigation)
    await page.evaluate(() => {
        if ((window as any).router) {
            (window as any).router.navigate('dashboard');
        }
    });

    await expect(pageContent).toHaveClass(/fade-in/);
  });
});
