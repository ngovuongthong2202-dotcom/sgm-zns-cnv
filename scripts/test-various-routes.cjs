const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log(`[BROWSER ${msg.type()}]`, msg.text()));
  page.on('pageerror', err => console.error('[BROWSER ERROR]', err));

  await page.goto('http://localhost:3000/customers');
  const loginInput = await page.$('input#username');
  if (loginInput) {
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForSelector('nav', { timeout: 10000 });
  }

  await page.waitForTimeout(1000);

  console.log('\n--- Testing navigate to /deliveries ---');
  await page.evaluate(() => {
    window.__router.navigate('/deliveries');
  });
  await page.waitForTimeout(1000);
  console.log('Header after /deliveries:', await page.evaluate(() => document.querySelector('header')?.innerText.replace(/\n/g, ' ')));

  console.log('\n--- Testing navigate from /deliveries to /zns-hub ---');
  await page.evaluate(() => {
    try {
      console.log('Calling navigate(/zns-hub)...');
      window.__router.navigate('/zns-hub');
      console.log('Called navigate(/zns-hub) successfully, window.location:', window.location.pathname);
    } catch (err) {
      console.error('Error during navigate:', err);
    }
  });
  await page.waitForTimeout(1000);
  console.log('Header after /zns-hub:', await page.evaluate(() => document.querySelector('header')?.innerText.replace(/\n/g, ' ')));

  await browser.close();
})();
