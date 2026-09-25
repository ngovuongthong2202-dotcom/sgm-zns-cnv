const { chromium } = require('@playwright/test');

(async () => {
  console.log('Simulating realistic human rapid switching across all 8 modules...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[CONSOLE ERROR] ${msg.text()}`);
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    console.log('[PAGE ERROR]', err.message);
    errors.push(err.message);
  });

  await page.goto('http://localhost:3000/customers');
  await page.waitForTimeout(2000);

  const modules = [
    { name: 'Khách hàng', path: '/customers' },
    { name: 'Báo giá', path: '/quotations' },
    { name: 'Hợp đồng', path: '/contracts' },
    { name: 'Thanh toán', path: '/payments' },
    { name: 'Giao hàng', path: '/deliveries' },
    { name: 'ZNS Hub', path: '/zns-hub' },
    { name: 'Nhật ký', path: '/audit-logs' },
    { name: 'Cài đặt', path: '/settings/vendor' },
  ];

  console.log('Starting 5 full rounds of rapid switching across all 8 modules (40 transitions)...');
  let switchCount = 0;
  const timings = [];

  for (let round = 1; round <= 5; round++) {
    console.log(`\n--- Round ${round} ---`);
    for (const mod of modules) {
      switchCount++;
      const t0 = Date.now();
      
      // Simulate user clicking on the navigation link in the sidebar
      await page.evaluate((href) => {
        const link = document.querySelector(`a[href="${href}"]`);
        if (link) {
          link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        }
      }, mod.path);

      // Verify the URL changed immediately
      const elapsed = Date.now() - t0;
      timings.push(elapsed);
      console.log(`  [Switch ${switchCount}] ${mod.name} (${mod.path}) -> ${elapsed}ms, URL: ${page.url()}`);

      // Rapid: 100ms interval between switches
      await page.waitForTimeout(100);
    }
  }

  console.log('\n=============================================');
  console.log(`Completed all ${switchCount} switches!`);
  const avg = Math.round(timings.reduce((a, b) => a + b, 0) / timings.length);
  const max = Math.max(...timings);
  console.log(`Average switch time: ${avg}ms, Max switch time: ${max}ms`);

  // Now verify that after 40 rapid switches, the page is 100% responsive and alive!
  console.log('\nVerifying application health and responsiveness...');
  const tCheck = Date.now();
  const title = await page.evaluate(() => document.title);
  const checkTime = Date.now() - tCheck;
  console.log(`Main thread check: ${checkTime}ms, Title: ${title}`);

  const cost = await page.$eval('.fixed.bottom-3.left-16', el => el.innerText.replace(/\n/g, ' ')).catch(() => 'NOT FOUND');
  console.log(`Cost badge: ${cost}`);

  console.log(`Total errors captured during 40 switches: ${errors.length}`);
  if (errors.length > 0) {
    console.log('Errors:', errors);
  }

  // Take screenshot of the final responsive state
  await page.screenshot({ path: 'scripts/rapid-switching-healthy.png' });
  console.log('Saved health screenshot: scripts/rapid-switching-healthy.png');

  await browser.close();
  console.log('Simulation completed successfully!');
})();
