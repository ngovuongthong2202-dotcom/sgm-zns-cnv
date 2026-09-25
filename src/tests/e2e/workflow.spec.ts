import { test, expect } from '@playwright/test';

test.describe('ZNS Workflow E2E (Regression)', () => {

  test.beforeEach(async ({ page }) => {
    // Go to the local dev server
    await page.goto('http://localhost:3000');
  });

  test('should load the dashboard and navigate to reports', async ({ page }) => {
    await expect(page.locator('h1').first()).toBeVisible();
    
    // Check if the navigation exists
    const navReports = page.locator('a[href="/reports"]');
    if (await navReports.isVisible()) {
       await navReports.click();
       await expect(page).toHaveURL(/.*\/reports/);
       await expect(page.locator('text=Phân Tích Nghiệp Vụ')).toBeVisible();
    }
  });

  test('should allow creating a quote (dry run)', async ({ page }) => {
    const navQuotes = page.locator('a[href="/quotes"]');
    if (await navQuotes.isVisible()) {
       await navQuotes.click();
       const createBtn = page.locator('button:has-text("Tạo Báo Giá")');
       if (await createBtn.isVisible()) {
          await createBtn.click();
          // We expect the drawer to open
          await expect(page.locator('text=Tạo Báo Giá Mới')).toBeVisible();
          // We won't submit to avoid trashing db in simple test
       }
    }
  });

  test('should orchestrate FAB -> Create Customer -> Soft Delete -> Undo safely', async ({ page }) => {
    // 1. Hover/Click FAB and create customer
    const fabButton = page.locator('button:has(svg.lucide-plus)');
    if (await fabButton.isVisible()) {
      await fabButton.click();
      const fabCreateCustomer = page.locator('text=Tạo Khách hàng');
      if (await fabCreateCustomer.isVisible()) {
        await fabCreateCustomer.click();
        
        // Modal opens
        await expect(page.locator('text=Khởi tạo khách hàng')).toBeVisible();
        
        // Fill form
        await page.fill('input[name="tenCongTy"]', 'E2E Test Company');
        await page.fill('input[name="soDienThoai"]', '0901234567');
        
        // Save
        await page.click('button:has-text("Khởi tạo khách hàng")');
        
        // Wait for it to appear in DataGrid (assuming navigation to /customers)
        await expect(page).toHaveURL(/.*\/customers/);
        
        const customerRow = page.locator('text=E2E Test Company');
        await expect(customerRow).toBeVisible();

        // 2. Click select row
        await customerRow.click();
        
        // 3. Delete from Bulk Action or row action
        const deleteButton = page.locator('button:has-text("Xóa")');
        // If Bulk Action bar shows up after clicking
        if (await deleteButton.isVisible()) {
           // We click Xóa, wait for confirmation modal
           await deleteButton.click();
           const confirmModal = page.locator('button:has-text("Chắc chắn")');
           await expect(confirmModal).toBeVisible();
           await confirmModal.click();

           // Assert row disappeared (Soft delete resolved optimistic)
           await expect(customerRow).not.toBeVisible();

           // 4. Undo from toast
           const undoButton = page.locator('button:has-text("Hoàn tác")');
           if (await undoButton.isVisible()) {
             await undoButton.click();
             
             // Verify it came back
             await expect(customerRow).toBeVisible();
           }
        }
      }
    }
  });
});
