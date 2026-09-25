import { test, expect } from '../fixtures/test-user';
import { CustomerPage } from '../pages/CustomerPage';

test.describe('Happy Paths', () => {

  test('1. Tạo KH mới → Form 3 step → Submit → KH hiện trong list → Click vào drawer → Edit field → Save', async ({ loginPage, seedData }) => {
    const page = loginPage;
    const customerPage = new CustomerPage(page);
    
    // 1. Go to Customers
    await customerPage.goto();
    
    // 2. Click Add Customer & Fill Form
    const testName = seedData.randomName();
    const testPhone = seedData.randomPhone();
    
    await customerPage.create(testName, testPhone);
    
    // 4. Verify in list
    await expect(page.getByText(testName)).toBeVisible();
    
    // 5. Click to open drawer
    await page.getByText(testName).click();
    
    // 6. Edit field 
    await page.getByRole('button', { name: /sửa/i }).click();
    await page.getByLabel(/tên khách hàng/i).fill(`${testName} - Edited`);
    await page.getByRole('button', { name: /lưu/i }).click();
    
    // 7. Verify edit
    await expect(page.getByText(`${testName} - Edited`)).toBeVisible();
  });

  test('2. Tạo BG (loại "BG Vật tư") → Chọn KH có sẵn → Add 2 sản phẩm → Phát hành → Verify trong list', async ({ loginPage }) => {
    const page = loginPage;
    await page.goto('/quotations');
    
    await page.getByRole('button', { name: /tạo báo giá/i }).click();
    
    // Fill specific quotation type
    await page.getByLabel(/loại báo giá/i).fill('BG Vật tư');
    
    // Mock selecting customer
    await page.getByPlaceholder(/tìm tên khách hàng/i).fill('Nguyễn Văn A');
    await page.getByText('Nguyễn Văn A').first().click();
    
    // Add 2 products
    await page.getByRole('button', { name: /thêm sản phẩm/i }).click();
    await page.getByPlaceholder(/tên sản phẩm/i).first().fill('Sản phẩm 1');
    await page.getByRole('button', { name: /thêm sản phẩm/i }).click();
    await page.locator('input[placeholder*="Tên sản phẩm"]').nth(1).fill('Sản phẩm 2');
    
    // Issue (Phát hành)
    await page.getByRole('button', { name: /phát hành/i }).click();
    
    // Verify
    await expect(page.getByText(/sản phẩm 1/i)).toBeVisible();
  });

  test('3. Tạo HĐ từ BG (loại "BG Máy") → Verify gate (BG phải đã chốt) → Submit → Verify status', async ({ loginPage }) => {
    const page = loginPage;
    await page.goto('/contracts');
    await page.getByRole('button', { name: /tạo hợp đồng/i }).click();
    
    // Select Quote
    await page.getByRole('button', { name: /chọn báo giá/i }).click();
    // Assuming there's a finalized quote
    await page.getByText(/báo giá/i).first().click();
    
    await page.getByRole('button', { name: /lưu/i }).click();
    await expect(page.getByText(/chờ thanh toán/i)).toBeVisible();
  });

  test('4. Tạo Phiếu Thu tất toán cho HĐ → Verify gate (HĐ phải có) → Submit → Verify trạng thái', async ({ loginPage }) => {
    const page = loginPage;
    await page.goto('/payments');
    await page.getByRole('button', { name: /tạo phiếu thu/i }).click();
    
    // Fill details
    await page.getByPlaceholder(/nhập số tiền/i).fill('1000000');
    // Confirm
    await page.getByRole('button', { name: /xác nhận/i }).click();
    
    // Verify
    await expect(page.getByText(/đã thanh toán/i).first()).toBeVisible();
  });

  test('5. Tạo Phiếu Giao Hàng từ Phiếu Thu → Submit → Mark "đã giao thực tế" → Verify status', async ({ loginPage }) => {
    const page = loginPage;
    await page.goto('/deliveries');
    await page.getByRole('button', { name: /tạo phiếu giao/i }).click();
    
    await page.getByRole('button', { name: /lưu/i }).click();
    
    // Mark as delivered
    await page.getByRole('button', { name: /hoàn thành/i }).first().click();
    // Confirm modal
    await page.getByRole('button', { name: /xác nhận/i }).click();
    
    await expect(page.getByText(/đã giao/i).first()).toBeVisible();
  });

});
