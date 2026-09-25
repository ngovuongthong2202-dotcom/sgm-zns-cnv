const { chromium } = require('@playwright/test');

(async () => {
  console.log('Testing full user flow and profiling hangs...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    consoleLogs.push(`[PAGE ERROR] ${err.stack || err.message}`);
  });

  console.log('1. Loading http://localhost:3000/');
  let t0 = Date.now();
  await page.goto('http://localhost:3000/');
  console.log(`Initial page loaded in ${Date.now() - t0}ms`);
  await page.waitForTimeout(1000);

  // If login form is present, log in as admin
  const loginInput = await page.$('#username');
  if (loginInput) {
    console.log('Logging in as admin...');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForSelector('nav', { timeout: 10000 });
    console.log('Logged in successfully!');
  }
  await page.waitForTimeout(1000);

  // Measure clicking ZNS Hub
  console.log('2. Clicking ZNS Hub...');
  t0 = Date.now();
  await page.click('a[href="/zns-hub"]');
  console.log(`Click ZNS Hub returned in ${Date.now() - t0}ms, URL: ${page.url()}`);
  await page.waitForTimeout(3000);
  console.log(`After 3s on ZNS Hub, checking responsiveness...`);
  t0 = Date.now();
  const resp1 = await page.evaluate(() => 1 + 1);
  console.log(`Main thread response: ${resp1} in ${Date.now() - t0}ms`);

  // Measure clicking Nhật Ký (audit-logs)
  console.log('3. Clicking Nhật Ký (audit-logs)...');
  t0 = Date.now();
  await page.click('a[href="/audit-logs"]');
  console.log(`Click audit-logs returned in ${Date.now() - t0}ms, URL: ${page.url()}`);
  await page.waitForTimeout(3000);
  console.log(`After 3s on audit-logs, checking responsiveness...`);
  t0 = Date.now();
  const resp2 = await page.evaluate(() => 2 + 2);
  console.log(`Main thread response: ${resp2} in ${Date.now() - t0}ms`);

  // Measure clicking Cài đặt (/settings/vendor)
  console.log('4. Clicking Cài đặt (/settings/vendor)...');
  t0 = Date.now();
  await page.click('a[href="/settings/vendor"]');
  console.log(`Click settings returned in ${Date.now() - t0}ms, URL: ${page.url()}`);
  await page.waitForTimeout(3000);
  console.log(`After 3s on settings, checking responsiveness...`);
  t0 = Date.now();
  const resp3 = await page.evaluate(() => 3 + 3);
  console.log(`Main thread response: ${resp3} in ${Date.now() - t0}ms`);

  console.log('Recent Console Logs (last 30):');
  console.log(consoleLogs.slice(-30).join('\n'));

  await browser.close();
  console.log('Done test-user-flow.');
})();
