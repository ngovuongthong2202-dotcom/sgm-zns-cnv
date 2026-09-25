const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('request', req => {
    if (req.url().includes('supabase.co')) {
      console.log(`[SUPABASE REQ] ${req.method()} ${req.url()}`);
    }
  });

  page.on('console', msg => {
    if (msg.text().includes('Reads:') || msg.text().includes('error')) {
      console.log(`[CONSOLE] ${msg.text()}`);
    }
  });

  console.log('Navigating to /zns-hub...');
  await page.goto('http://localhost:3000/zns-hub');
  await page.waitForTimeout(3000);

  const statsBadge = await page.$eval('.fixed.bottom-3.left-16', el => el.innerText.replace(/\n/g, ' ')).catch(() => 'NOT FOUND');
  console.log('Final Stats Badge:', statsBadge);

  await browser.close();
})();
