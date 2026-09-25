const { chromium } = require('@playwright/test');

(async () => {
  console.log('--- Testing Rapid Continuous Switching Across All 8 Modules ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    errors.push(`[PAGE ERROR] ${err.stack || err.message}`);
  });

  await page.goto('http://localhost:3000/');
  const loginInput = await page.$('#username');
  if (loginInput) {
    console.log('Logging in as admin...');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForSelector('nav', { timeout: 10000 });
  }

  const routes = [
    { name: 'Khách hàng', href: '/customers' },
    { name: 'Báo giá', href: '/quotations' },
    { name: 'Hợp đồng', href: '/contracts' },
    { name: 'Thanh toán', href: '/payments' },
    { name: 'Giao hàng', href: '/deliveries' },
    { name: 'ZNS Hub', href: '/zns-hub' },
    { name: 'Nhật ký', href: '/audit-logs' },
    { name: 'Cài đặt', href: '/settings/vendor' },
  ];

  console.log('\nStarting Rapid Switching Cycles (3 full cycles, fast pacing 150ms-300ms)...');
  
  for (let cycle = 1; cycle <= 3; cycle++) {
    console.log(`\n=== CYCLE ${cycle} ===`);
    for (const route of routes) {
      const t0 = Date.now();
      try {
        const link = await page.waitForSelector(`a[href="${route.href}"]`, { timeout: 5000 });
        await link.click();
        const duration = Date.now() - t0;
        
        // Check main thread responsiveness
        const evalStart = Date.now();
        const testEval = await page.evaluate(() => performance.now());
        const evalDuration = Date.now() - evalStart;

        console.log(`  -> Switched to ${route.name} (${route.href}): click=${duration}ms, thread_resp=${evalDuration}ms, current_url=${page.url()}`);

        if (evalDuration > 1000) {
          console.warn(`  [WARNING] Main thread slow down detected on ${route.name}: ${evalDuration}ms`);
        }

        // Small random pause simulating real user rapid switching
        await page.waitForTimeout(200);
      } catch (err) {
        console.error(`  [FAILURE] Failed switching to ${route.name}:`, err.message);
      }
    }
  }

  console.log('\n--- Ultra Rapid Stress Test (burst switching 50ms intervals) ---');
  for (let i = 0; i < 16; i++) {
    const route = routes[i % routes.length];
    const link = await page.$(`a[href="${route.href}"]`);
    if (link) {
      const t0 = Date.now();
      await link.click();
      console.log(`Burst ${i + 1}/16: Clicked ${route.name} in ${Date.now() - t0}ms`);
    }
    await page.waitForTimeout(50);
  }

  await page.waitForTimeout(1000);

  // Final responsiveness check
  const tCheck = Date.now();
  const finalCheck = await page.evaluate(() => document.title);
  console.log(`\nFinal responsiveness check returned "${finalCheck}" in ${Date.now() - tCheck}ms`);

  console.log('\nErrors recorded:');
  if (errors.length === 0) {
    console.log('No console or page errors recorded!');
  } else {
    errors.forEach(e => console.error(e));
  }

  await browser.close();
  console.log('\nTest complete.');
})();
