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

  const initialRouter = await page.evaluate(() => {
    return {
      windowLocation: window.location.pathname,
      routerLocation: window.__router?.location?.pathname
    };
  });
  console.log('Initial router state:', initialRouter);

  console.log('\n--- Calling window.__router.navigate("/zns-hub") ---');
  await page.evaluate(() => {
    try {
      window.__router.navigate('/zns-hub');
    } catch (e) {
      console.error('Navigate error:', e);
    }
  });

  await page.waitForTimeout(1000);

  const afterNavigate = await page.evaluate(() => {
    return {
      windowLocation: window.location.pathname,
      routerLocation: window.__router?.location?.pathname,
      header: document.querySelector('header')?.innerText.replace(/\n/g, ' ')
    };
  });
  console.log('After programmatic navigate:', afterNavigate);

  await browser.close();
})();
