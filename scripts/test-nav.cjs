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
  console.log('--- At /deliveries ---');
  console.log('URL:', page.url());
  console.log('Header:', await page.evaluate(() => document.querySelector('header')?.innerText.replace(/\n/g, ' ')));

  console.log('\n--- Clicking a[href="/zns-hub"] ---');
  // Add debug listeners on window
  await page.evaluate(() => {
    window.addEventListener('popstate', (e) => console.log('POPSTATE event', window.location.pathname));
  });

  const znsLink = await page.$('a[href="/zns-hub"]');
  console.log('znsLink found:', !!znsLink);
  if (znsLink) {
    console.log('znsLink innerHTML:', await page.evaluate(el => el.outerHTML, znsLink));
    await znsLink.click();
  }

  await page.waitForTimeout(1500);
  console.log('After click URL:', page.url());
  console.log('After click Header:', await page.evaluate(() => document.querySelector('header')?.innerText.replace(/\n/g, ' ')));
  console.log('KeepAlive slots rendered:', await page.evaluate(() => {
    return Array.from(document.querySelectorAll('main div[style]')).map(el => ({
      style: el.getAttribute('style'),
      text: el.innerText.slice(0, 50).replace(/\n/g, ' ')
    }));
  }));

  await browser.close();
})();
