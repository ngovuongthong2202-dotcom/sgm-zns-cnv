const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', msg => console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log('[PAGE ERROR]', err.message));

  console.log('Loading http://localhost:3000/ ...');
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(2000);

  const url = page.url();
  const title = await page.title();
  console.log(`Current URL: ${url}, Title: ${title}`);

  const hasZnsHubLink = await page.$('a[href="/zns-hub"]');
  console.log(`Has a[href="/zns-hub"]: ${!!hasZnsHubLink}`);

  const hasLoginInput = await page.$('#username');
  console.log(`Has login input: ${!!hasLoginInput}`);

  await page.screenshot({ path: 'scripts/page-at-root.png' });
  console.log('Screenshot saved to scripts/page-at-root.png');

  await browser.close();
})();
