const { chromium } = require('@playwright/test');

(async () => {
  console.log('Testing full user walkthrough of ZNS Hub, Nhật ký, Cài đặt...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Cost')) {
      console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    console.log('[PAGE ERROR]', err.stack || err.message);
  });

  // 1. Start at home
  console.log('1. Navigating to / ...');
  await page.goto('http://localhost:3000/', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // 2. Click ZNS Hub
  console.log('2. Clicking ZNS Hub...');
  const tZns = Date.now();
  await page.click('a[href="/zns-hub"]');
  await page.waitForSelector('text=ZNS Control Hub', { timeout: 5000 });
  console.log(`ZNS Hub loaded in ${Date.now() - tZns}ms`);
  await page.waitForTimeout(2000);

  // 3. Click Nhật ký (audit-logs)
  console.log('3. Clicking Nhật ký (/audit-logs)...');
  const tAudit = Date.now();
  await page.click('a[href="/audit-logs"]');
  await page.waitForSelector('text=Nhật ký Hoạt động', { timeout: 5000 });
  console.log(`Audit Logs loaded in ${Date.now() - tAudit}ms`);
  await page.waitForTimeout(2000);

  // 4. Click Cài đặt (/settings/vendor)
  console.log('4. Clicking Cài đặt (/settings/vendor)...');
  const tSettings = Date.now();
  await page.click('a[href="/settings/vendor"]');
  await page.waitForTimeout(2000);
  console.log(`Settings loaded in ${Date.now() - tSettings}ms, current URL: ${page.url()}`);

  // 5. Test each Settings sub-page
  const settingPaths = [
    '/settings/vendor',
    '/settings/gates',
    '/settings/health-score',
    '/settings/fields',
    '/settings/catalog',
    '/settings/telegram',
    '/settings/users',
    '/settings/system',
    '/settings/about'
  ];

  for (const sub of settingPaths) {
    console.log(`Navigating setting subpage: ${sub}...`);
    const t0 = Date.now();
    try {
      await page.click(`a[href="${sub}"]`, { timeout: 5000 });
      await page.waitForTimeout(1000);
      console.log(`Subpage ${sub} clicked in ${Date.now() - t0}ms`);
    } catch (e) {
      console.log(`Subpage ${sub} click failed:`, e.message);
    }
  }

  // 6. Check final cost badge
  const cost = await page.$eval('.fixed.bottom-3.left-16', el => el.innerText.replace(/\n/g, ' ')).catch(() => 'NOT FOUND');
  console.log('Final Cost Badge:', cost);

  await page.screenshot({ path: 'scripts/settings-walkthrough.png' });
  console.log('Saved scripts/settings-walkthrough.png');

  await browser.close();
  console.log('Walkthrough completed successfully!');
})();
