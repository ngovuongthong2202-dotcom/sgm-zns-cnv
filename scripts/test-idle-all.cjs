const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:3000/');
  const loginInput = await page.$('#username');
  if (loginInput) {
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForSelector('nav', { timeout: 10000 });
  }

  const routes = [
    '/customers',
    '/quotations',
    '/contracts',
    '/payments',
    '/deliveries',
    '/zns-hub',
    '/audit-logs',
    '/settings/vendor'
  ];

  let allPassed = true;

  for (const route of routes) {
    console.log(`\nTesting idle reads on ${route}...`);
    await page.click(`a[href="${route}"]`);
    await page.waitForTimeout(2000);
    const initialBadge = await page.$eval('.fixed.bottom-3.left-16', el => el.innerText.replace(/\n/g, ' ')).catch(() => 'NOT FOUND');
    console.log(`Initial Badge: ${initialBadge}`);
    
    await page.waitForTimeout(4000);
    const finalBadge = await page.$eval('.fixed.bottom-3.left-16', el => el.innerText.replace(/\n/g, ' ')).catch(() => 'NOT FOUND');
    console.log(`After 4s idle: ${finalBadge}`);
    
    if (initialBadge === finalBadge && initialBadge !== 'NOT FOUND') {
      console.log(`PASS: Zero read leaks (0R | 0W on idle) on ${route}!`);
    } else {
      console.log(`FAIL: Read leak or badge missing on ${route}!`);
      allPassed = false;
    }
  }
  
  await browser.close();
  if (allPassed) {
    console.log('\nALL 8 ROUTES VERIFIED: 0R | 0W ON IDLE!');
  } else {
    console.error('\nSOME ROUTES FAILED IDLE TEST!');
    process.exit(1);
  }
})();
