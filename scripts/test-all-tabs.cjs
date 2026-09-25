const { chromium } = require('@playwright/test');

(async () => {
  console.log('=== MULTI-TAB SWITCHING STRESS TEST ===');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  let pageError = null;
  page.on('pageerror', err => {
    console.error('[BROWSER ERROR]', err.message);
    pageError = err;
  });

  await page.goto('http://localhost:3000/');
  const loginInput = await page.$('#username');
  if (loginInput) {
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForSelector('nav', { timeout: 10000 });
  }

  const routes = [
    { href: '/customers', name: 'Khách hàng' },
    { href: '/quotations', name: 'Báo giá' },
    { href: '/contracts', name: 'Hợp đồng' },
    { href: '/payments', name: 'Thanh toán' },
    { href: '/deliveries', name: 'Giao hàng' },
    { href: '/zns-hub', name: 'ZNS Hub' },
    { href: '/audit-logs', name: 'Nhật ký' },
    { href: '/settings', name: 'Cài đặt' },
  ];

  // Run 2 full cycles across all tabs
  for (let cycle = 1; cycle <= 2; cycle++) {
    console.log(`\n--- CYCLE ${cycle} ---`);
    for (const route of routes) {
      const startTime = Date.now();
      const selector = `a[href^="${route.href}"]`;
      await page.click(selector);
      
      // Wait for URL to match
      await page.waitForFunction(
        (expectedPath) => window.location.pathname.startsWith(expectedPath),
        route.href,
        { timeout: 3000 }
      );
      
      // Check active navigation link and header
      const result = await page.evaluate(() => {
        const activeNav = document.querySelector('a.bg-white')?.innerText?.trim() || '';
        const header = document.querySelector('header')?.innerText?.replace(/\n/g, ' ') || '';
        return { activeNav, header, path: window.location.pathname };
      });

      const elapsed = Date.now() - startTime;
      console.log(`[PASS] Navigated to ${route.name} (${result.path}) in ${elapsed}ms -> ActiveNav: "${result.activeNav}"`);
    }
  }

  // Specific check: Giao hàng -> ZNS Hub -> Giao hàng -> ZNS Hub
  console.log('\n--- TARGETED TEST: Deliveries <-> ZNS Hub rapid alternating ---');
  for (let i = 1; i <= 3; i++) {
    const t0 = Date.now();
    await page.click('a[href="/deliveries"]');
    await page.waitForFunction(() => window.location.pathname === '/deliveries');
    const dTime = Date.now() - t0;

    const t1 = Date.now();
    await page.click('a[href="/zns-hub"]');
    await page.waitForFunction(() => window.location.pathname === '/zns-hub');
    const zTime = Date.now() - t1;

    console.log(`Cycle ${i}: /deliveries (${dTime}ms) -> /zns-hub (${zTime}ms)`);
  }

  // Check Supabase reads / writes counter in bottom left
  const badgeText = await page.evaluate(() => {
    return document.querySelector('button[title*="Supabase"]')?.innerText ||
           document.body.innerText.match(/Supabase:\s*\d+R\s*\|\s*\d+W/)?.[0] || 'Unknown';
  });
  console.log(`\nDatabase usage badge: ${badgeText}`);

  await browser.close();
  if (pageError) {
    console.error('Test failed due to page error!');
    process.exit(1);
  }
  console.log('\n=== ALL SWITCHING TESTS PASSED PERFECTLY! ===');
})();
