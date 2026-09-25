import { test, expect } from '../fixtures/test-user';

test.describe('Sad Paths', () => {

  test('1. Tạo KH với SĐT trùng → expect error message', async ({ loginPage, seedData }) => {
    const page = loginPage;
    await page.goto('/customers');
    
    // Attempt 1: create customer
    const testPhone = seedData.randomPhone();
    
    await page.getByRole('button', { name: /thêm khách hàng/i }).click();
    await page.getByLabel(/tên khách hàng/i).fill('KH 1');
    await page.getByLabel(/số điện thoại/i).fill(testPhone);
    await page.getByRole('button', { name: /lưu/i }).click();
    
    // Output success or list view comes back
    // Attempt 2: Duplicate
    await page.getByRole('button', { name: /thêm khách hàng/i }).click();
    await page.getByLabel(/tên khách hàng/i).fill('KH 2');
    await page.getByLabel(/số điện thoại/i).fill(testPhone); // Same phone
    await page.getByRole('button', { name: /lưu/i }).click();
    
    // Verify duplicate error
    await expect(page.getByText(/sđt đã tồn tại/i)).toBeVisible();
  });

  test('2. Submit form khi network offline → expect error toast + retry available', async ({ loginPage, context }) => {
    const page = loginPage;
    await page.goto('/customers');
    await page.getByRole('button', { name: /thêm khách hàng/i }).click();
    await page.getByLabel(/tên khách hàng/i).fill('Offline Test');
    
    // Simulate offline
    await context.setOffline(true);
    
    await page.getByRole('button', { name: /lưu/i }).click();
    
    // Expect error toast
    await expect(page.getByText(/lỗi mạng/i, { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: /thử lại/i })).toBeVisible();
  });

  test('3. 2 tab cùng edit 1 customer → expect conflict warning', async ({ loginPage, browser }) => {
    const page1 = loginPage;
    
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await page2.goto('/customers');

    // Assume we click on the same customer on both tabs
    await page1.getByText(/nguyễn văn a/i).first().click();
    await page1.getByRole('button', { name: /sửa/i }).click();
    await page1.getByLabel(/tên khách hàng/i).fill('Edited 1');

    await page2.getByText(/nguyễn văn a/i).first().click();
    await page2.getByRole('button', { name: /sửa/i }).click();
    await page2.getByLabel(/tên khách hàng/i).fill('Edited 2');

    // Save from page 1
    await page1.getByRole('button', { name: /lưu/i }).click();

    // Try save from page 2
    await page2.getByRole('button', { name: /lưu/i }).click();
    
    // Conflict warning should appear
    await expect(page2.getByText(/đã được chỉnh sửa bởi/i)).toBeVisible();
  });

  test('4. Xóa customer có liên quan BG/HĐ → expect block hoặc cascade confirmation', async ({ loginPage }) => {
    const page = loginPage;
    await page.goto('/customers');
    
    // Find customer with related docs
    const customer = page.getByText(/công ty x/i).first();
    await customer.click();
    
    // Try to delete
    await page.getByRole('button', { name: /xóa/i }).click();
    
    // Check for block message
    await expect(page.getByText(/không thể xóa vì có dữ liệu liên quan/i)).toBeVisible();
  });

  test('5. Gate STRICT, tạo HĐ trước khi BG chốt → expect block', async ({ loginPage }) => {
    const page = loginPage;
    await page.goto('/contracts');
    await page.getByRole('button', { name: /tạo hợp đồng/i }).click();
    
    // Target a non-finalized Quote
    await page.getByRole('button', { name: /chọn báo giá/i }).click();
    await page.getByText(/bản nháp/i).first().click();
    
    // Should be blocked
    await expect(page.getByText(/báo giá chưa được chốt/i)).toBeVisible();
  });

});
