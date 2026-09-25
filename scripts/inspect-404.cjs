const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(`[HTTP ${res.status()}] ${res.url()}`);
    }
  });

  await page.goto('http://localhost:3000/customers');
  await page.waitForTimeout(3000);

  for (const path of ['/quotations', '/contracts', '/payments', '/deliveries', '/zns-hub', '/audit-logs', '/settings/vendor']) {
    console.log(`\nNavigating to ${path}...`);
    await page.evaluate((p) => {
      const link = document.querySelector(`a[href="${p}"]`);
      if (link) link.click();
    }, path);
    await page.waitForTimeout(1000);
  }

  await browser.close();
})();
