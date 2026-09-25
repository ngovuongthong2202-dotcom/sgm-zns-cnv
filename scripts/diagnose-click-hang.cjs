const { chromium } = require('@playwright/test');

(async () => {
  console.log('Diagnosing why click hung in Playwright...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.log(`[PAGE ERROR]: ${err.stack || err.message}`));

  await page.goto('http://localhost:3000/customers');
  await page.waitForTimeout(2000);

  // Pin the sidebar so it never animates width
  await page.evaluate(() => {
    localStorage.setItem('sgm_sidebar_pinned', 'true');
  });
  await page.reload();
  await page.waitForTimeout(1000);

  const routes = [
    '/quotations',
    '/contracts',
    '/payments',
    '/deliveries',
    '/zns-hub',
    '/audit-logs',
    '/settings/vendor',
    '/customers'
  ];

  for (let i = 0; i < 3; i++) {
    console.log(`\n=== Cycle ${i + 1} ===`);
    for (const r of routes) {
      const t0 = Date.now();
      console.log(`Navigating to ${r}...`);
      await page.evaluate((path) => {
        // Trigger react-router navigation by clicking the link directly in DOM
        const link = document.querySelector(`a[href="${path}"]`);
        if (link) link.click();
        else window.location.pathname = path;
      }, r);
      
      await page.waitForTimeout(200);
      const url = page.url();
      console.log(`  -> URL after 200ms: ${url} (took ${Date.now() - t0}ms)`);
    }
  }

  await browser.close();
  console.log('Diagnosis completed.');
})();
