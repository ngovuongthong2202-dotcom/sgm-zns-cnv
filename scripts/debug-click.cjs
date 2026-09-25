const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log(`[BROWSER ${msg.type()}]`, msg.text()));
  page.on('pageerror', err => console.error('[BROWSER ERROR]', err));

  await page.goto('http://localhost:3000/deliveries');
  const loginInput = await page.$('input#username');
  if (loginInput) {
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForSelector('nav', { timeout: 10000 });
  }

  await page.waitForTimeout(1000);

  // Monitor click and react router
  await page.evaluate(() => {
    window.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      console.log('[DEBUG CLICK] target:', e.target.tagName, 'link:', link?.getAttribute('href'), 'defaultPrevented:', e.defaultPrevented);
      setTimeout(() => {
        console.log('[DEBUG CLICK AFTER 10ms] defaultPrevented:', e.defaultPrevented, 'pathname:', window.location.pathname);
      }, 10);
    }, true);
  });

  console.log('\n--- Clicking a[href="/zns-hub"] ---');
  await page.click('a[href="/zns-hub"]');
  await page.waitForTimeout(1000);

  console.log('Pathname now:', await page.evaluate(() => window.location.pathname));

  await browser.close();
})();
