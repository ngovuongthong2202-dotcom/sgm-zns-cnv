const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log('[PAGE ERROR]', err.stack || err.message);
  });

  const routes = ['/zns-hub', '/audit-logs', '/settings', '/settings/vendor'];

  for (const route of routes) {
    console.log(`\n========================================`);
    console.log(`Testing route: http://localhost:3000${route}`);
    console.log(`========================================`);
    const t0 = Date.now();
    try {
      await page.goto(`http://localhost:3000${route}`, { timeout: 10000 });
      console.log(`Navigation to ${route} took ${Date.now() - t0}ms`);
      await page.waitForTimeout(3000);
      const title = await page.title();
      console.log(`Page title: ${title}`);
      const cost = await page.$eval('.fixed.bottom-3.left-16', el => el.innerText.replace(/\n/g, ' ')).catch(() => 'NOT FOUND');
      console.log(`Cost badge: ${cost}`);
    } catch (e) {
      console.log(`FAILED on ${route}:`, e.message);
    }
  }

  // Also test clicking between them from sidebar!
  console.log('\n========================================');
  console.log('Testing sidebar clicks between system routes');
  console.log('========================================');
  await page.goto('http://localhost:3000/customers', { timeout: 10000 });
  await page.waitForTimeout(1500);

  for (const sel of ['a[href="/zns-hub"]', 'a[href="/audit-logs"]', 'a[href="/settings"]']) {
    console.log(`Clicking ${sel}...`);
    const t0 = Date.now();
    try {
      await page.click(sel, { timeout: 5000 });
      console.log(`Clicked ${sel} in ${Date.now() - t0}ms, current URL: ${page.url()}`);
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log(`Click error for ${sel}:`, e.message);
    }
  }

  await browser.close();
  console.log('Done testing all system routes.');
})();
