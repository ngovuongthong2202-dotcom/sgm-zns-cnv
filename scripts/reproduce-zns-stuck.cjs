const { chromium } = require('@playwright/test');

(async () => {
  console.log('--- REPRODUCING USER SCENARIO ---');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    console.log(`[BROWSER ${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    console.error('[BROWSER ERROR]', err.stack || err.message);
  });

  await page.goto('http://localhost:3000/');
  const loginInput = await page.$('#username');
  if (loginInput) {
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForSelector('nav', { timeout: 10000 });
  }

  console.log('\n1. Navigating to /deliveries...');
  await page.click('a[href="/deliveries"]');
  await page.waitForTimeout(1000);
  console.log(`Current page title: "${await page.title()}", URL: ${page.url()}`);
  
  // Inspect active state in DOM
  const stateAfterDeliveries = await page.evaluate(() => {
    const activeHeader = document.querySelector('header')?.innerText;
    const activeNav = document.querySelector('a.bg-white')?.innerText?.trim();
    return { activeHeader, activeNav };
  });
  console.log('State on deliveries:', stateAfterDeliveries);

  console.log('\n2. Now clicking a[href="/zns-hub"]...');
  await page.click('a[href="/zns-hub"]');
  await page.waitForTimeout(1000);

  const stateAfterZnsClick = await page.evaluate(() => {
    const activeHeader = document.querySelector('header')?.innerText;
    const activeNav = document.querySelector('a.bg-white')?.innerText?.trim();
    const visiblePages = Array.from(document.querySelectorAll('main div[style*="display: flex"], main div[style*="display:flex"]')).map(el => el.className);
    const hiddenPages = Array.from(document.querySelectorAll('main div[style*="display: none"], main div[style*="display:none"]')).map(el => el.className);
    
    // Check KeepAliveShell DOM children
    const keepAliveDivs = Array.from(document.querySelectorAll('.w-full.h-full.min-h-0.flex-col')).map(el => ({
      classes: el.className,
      style: el.getAttribute('style'),
      textSnippet: el.innerText.slice(0, 100).replace(/\n/g, ' ')
    }));

    return {
      activeHeader,
      activeNav,
      url: window.location.pathname,
      keepAliveDivs
    };
  });

  console.log('\nState after clicking ZNS Hub:');
  console.log(JSON.stringify(stateAfterZnsClick, null, 2));

  await page.screenshot({ path: 'scratch/after_zns_click.png' });
  console.log('\nScreenshot saved to scratch/after_zns_click.png');

  await browser.close();
})();
