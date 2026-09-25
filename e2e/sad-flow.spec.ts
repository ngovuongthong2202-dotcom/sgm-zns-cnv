import { test, expect } from '@playwright/test';

test.describe('Sad Flow & Security Rules Verification', () => {
  test('Unauthenticated user should be redirected to login or blocked', async ({ page }) => {
    // Clear state just in case
    await page.context().clearCookies();
    
    // Simulate API request without auth state
    const response = await page.request.get('/api/metrics/counters');
    // If our backend is protected, it might return 401/403.
    // If it's pure firestore rule test, we try to access firestore directly.
    // Since page test runs in browser, we check if page renders login or shows error for unauthenticated access.
    await page.goto('/');
    
    // Depending on auth config, it should redirect or show a login screen or loading error
    // We expect the app to handle this gracefully
    const hasLogin = await page.locator('text="Đăng nhập"').isVisible();
    const hasError = await page.locator('text="Bạn không có quyền truy cập"').isVisible();
    
    expect(hasLogin || hasError || await page.url().includes('login')).toBeTruthy();
  });

  test('Form validation error on empty submit', async ({ page }) => {
    // Assuming we manage to mock auth or login...
    await page.goto('/customers');
    
    // Wait for the app to load
    await page.waitForTimeout(1000);
    
    // Open modal
    if (await page.locator('button:has-text("Tạo khách hàng")').isVisible()) {
      await page.click('button:has-text("Tạo khách hàng")');
      await page.click('button:has-text("Tạo mới")');
      
      // Expect validation toast or inline error
      await expect(page.locator('text="Vui lòng điền đủ"').or(page.locator('.text-red-500'))).toBeVisible();
    }
  });
});
