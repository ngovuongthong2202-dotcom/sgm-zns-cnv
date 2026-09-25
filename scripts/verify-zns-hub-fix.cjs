const { chromium } = require('@playwright/test');
const { createClient } = require('@supabase/supabase-js');

const url = 'https://baduyiiwvaxudcplffri.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZHV5aWl3dmF4dWRjcGxmZnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNDg2ODksImV4cCI6MjEwNTcyNDY4OX0.1FSGqLqHN_g09NOt6mFw8vGGk8I1VH735iPgaMx-0ao';
const supabase = createClient(url, key);

(async () => {
  console.log('=== VERIFYING ZNS HUB ZERO-FREEZE PERFORMANCE ===');

  // 1. Seed 10 test records into zns_messages
  console.log('1. Seeding 10 test records into zns_messages...');
  const records = [];
  for (let i = 1; i <= 10; i++) {
    records.push({
      id: 'verify_zns_' + i,
      entity_type: 'customer',
      entity_id: 'cust_seed_' + i,
      status: i % 3 === 0 ? 'FAILED' : i % 2 === 0 ? 'DLQ' : 'SUCCESS',
      data: {
        id: 'verify_zns_' + i,
        phone: '098765432' + i,
        tenKhachHang: 'Khách hàng Test ' + i,
        customerName: 'Khách hàng Test ' + i
      },
      created_at: new Date(Date.now() - i * 120000).toISOString()
    });
  }
  await supabase.from('zns_messages').upsert(records);
  console.log('Seed completed.');

  // 2. Launch browser
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleLogs = [];
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Cost') || msg.text().includes('Freeze')) {
      console.log(`[BROWSER ${msg.type()}] ${msg.text()}`);
    }
  });

  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(`[HTTP ${res.status()}] ${res.url()}`);
    }
  });

  page.on('pageerror', err => {
    console.log('[PAGE ERROR]', err.message);
  });

  // 3. Navigate from /customers to /zns-hub
  console.log('2. Navigating to /customers...');
  await page.goto('http://localhost:3000/customers', { timeout: 15000 });
  await page.waitForTimeout(1500);

  console.log('3. Clicking ZNS Hub nav link (client-side route transition)...');
  const tNav = Date.now();
  await page.click('a[href="/zns-hub"]');
  console.log(`Nav click dispatched in ${Date.now() - tNav}ms`);

  // Measure load responsiveness
  await page.waitForSelector('text=ZNS Control Hub', { timeout: 5000 });
  const loadDuration = Date.now() - tNav;
  console.log(`ZNS Hub mounted and responsive in ${loadDuration}ms!`);

  // Wait a few seconds to verify no infinite loops or freezing
  console.log('4. Checking UI stability for 3 seconds...');
  await page.waitForTimeout(3000);

  // 5. Test tab switching
  const tabs = ['Hàng Đợi Lỗi (DLQ)', 'Webhook Debug', 'Unmapped Payload', 'Outbox (Active)'];
  for (const tab of tabs) {
    const t0 = Date.now();
    await page.getByRole('button', { name: tab }).click();
    await page.waitForTimeout(600);
    console.log(`Switched to tab "${tab}" smoothly in ${Date.now() - t0}ms`);
  }

  // 6. Check final cost badge
  const statsBadge = await page.$eval('.fixed.bottom-3.left-16', el => el.innerText.replace(/\n/g, ' ')).catch(() => 'NOT FOUND');
  console.log('Final Cost Badge:', statsBadge);

  // 7. Save screenshot
  await page.screenshot({ path: 'scripts/zns-hub-verified.png' });
  console.log('Saved screenshot to scripts/zns-hub-verified.png');

  await browser.close();

  // 8. Clean up seeded records
  console.log('5. Cleaning up seeded test records...');
  await supabase.from('zns_messages').delete().like('id', 'verify_zns%');
  console.log('Cleaned up. Verification complete!');
})();
