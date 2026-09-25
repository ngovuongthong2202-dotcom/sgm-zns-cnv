import { test, expect } from '@playwright/test';

test.describe('Golden Flow Verification', () => {
  test('Khách Hàng -> Báo Giá -> Hợp Đồng -> Thanh Toán -> Giao Hàng', async ({ page }) => {
    // Navigate to customers page
    await page.goto('/');

    // 1. Tạo Khách Hàng
    await page.getByRole('link', { name: /khách hàng/i }).first().click();
    await page.waitForSelector('text="Tạo khách hàng"');
    await page.click('button:has-text("Tạo khách hàng")');
    
    const customerPhone = '090' + Math.floor(Math.random() * 10000000);
    
    // Fill customer form
    await page.fill('input[name="tenKhachHang"]', 'Test E2E Customer');
    await page.fill('input[name="maKh"]', 'E2E' + Math.floor(Math.random() * 1000));
    await page.fill('input[name="sdt"]', customerPhone);
    
    await page.click('button:has-text("Tạo mới")');
    await expect(page.locator('text="Đã lưu thông tin"')).toBeVisible();

    // 2. Lên Báo Giá
    await page.click('text="Báo Giá"');
    await page.waitForSelector('text="Tạo báo giá"');
    await page.click('button:has-text("Tạo báo giá")');
    
    // Wait for form
    await page.waitForSelector('select[name="customerId"]');
    // Select customer
    await page.selectOption('select[name="customerId"]', { label: 'Test E2E Customer' });
    
    // Select product
    await page.click('button:has-text("Thêm sản phẩm")');
    await page.fill('input[placeholder="Tên SP / DV..."]', 'Máy in E2E');
    await page.fill('input[placeholder="SL"]', '1');
    await page.fill('input[placeholder="Đơn giá..."]', '15000000');
    
    await page.click('button:has-text("Tạo mới")');
    await expect(page.locator('text="Đã lưu thông tin"').or(page.locator('text="Tạo báo giá thành công"'))).toBeVisible();

    // 3. Đẩy Hợp Đồng
    await page.click('text="Hợp Đồng"');
    await page.waitForSelector('text="Tạo hợp đồng"');
    await page.click('button:has-text("Tạo hợp đồng")');
    
    // Select customer & quotation
    await page.selectOption('select[name="customerId"]', { label: 'Test E2E Customer' });
    
    // Product should auto fill if quotation selected, or manually add
    await page.click('button:has-text("Thêm sản phẩm")');
    await page.fill('input[placeholder="Tên SP / DV..."]', 'Máy in E2E');
    await page.fill('input[placeholder="SL"]', '1');
    
    await page.click('button:has-text("Tạo mới")');
    await expect(page.locator('text="Đã lưu thông tin"').or(page.locator('text="Tạo hợp đồng thành công"'))).toBeVisible();

    // 4. Đổ Thanh Toán / ZNS Ping
    await page.click('text="Thanh Toán"');
    await page.waitForSelector('text="Ghi nhận thanh toán"');
    await page.click('button:has-text("Ghi nhận thanh toán")');
    
    await page.selectOption('select[name="customerId"]', { label: 'Test E2E Customer' });
    await page.fill('input[name="soTien"]', '15000000');
    await page.selectOption('select[name="tinhTrangThanhToan"]', { label: 'Tất toán' });
    
    await page.click('button:has-text("Tạo mới")');
    await expect(page.locator('text="Đã lưu thông tin"').or(page.locator('text="Tạo thanh toán thành công"'))).toBeVisible();

    // 5. Xuất Giao Hàng thành công
    await page.click('text="Giao Hàng"');
    await page.waitForSelector('text="Tạo Lệnh Giao Hàng"');
    await page.click('button:has-text("Tạo Lệnh Giao Hàng")');
    
    await page.selectOption('select[name="customerId"]', { label: 'Test E2E Customer' });
    
    await page.click('button:has-text("Tạo mới")');
    
    // Ensure success message
    await expect(page.locator('text="Lưu phiếu giao hàng"')).toBeVisible();
  });
});
