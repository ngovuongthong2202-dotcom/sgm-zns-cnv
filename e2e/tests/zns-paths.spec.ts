import { test, expect } from '../fixtures/test-user';

test.describe('ZNS Flow', () => {

  test('6. Click "Gửi ZNS" customer → preview → confirm → backend gọi CNV (mock) → status update', async ({ loginPage }) => {
    const page = loginPage;
    await page.goto('/customers');
    
    // Open a customer detail
    await page.getByText(/nguyễn văn a/i).first().click();
    
    // Click Send ZNS
    await page.getByRole('button', { name: /gửi zns/i }).click();
    
    // Preview
    await expect(page.getByText(/xem trước zns/i)).toBeVisible();
    
    // Confirm
    await page.getByRole('button', { name: /xác nhận gửi/i }).click();
    
    // Status should be pending or sending
    await expect(page.getByText(/đang gửi/i)).toBeVisible();
  });

  test('7. CNV vendor trả SUCCESS qua webhook → entity status THÀNH CÔNG → notification', async ({ loginPage, request }) => {
    const page = loginPage;
    // We can simulate the webhook call directly to the API
    const response = await request.post('/api/zns/webhook/cnv', {
      data: {
        message_id: 'mock-1234',
        status: 'success'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    
    // Refresh page and check notification or status
    await page.goto('/customers');
    await page.getByText(/nguyễn văn a/i).first().click();
    await expect(page.getByText(/gửi thành công/i)).toBeVisible();
  });

});
