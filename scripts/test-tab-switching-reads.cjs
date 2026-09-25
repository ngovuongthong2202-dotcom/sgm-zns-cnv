const { chromium } = require('@playwright/test');

(async () => {
  console.log('Testing Tab Switching & Keep-Alive 0-read behavior...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[COST_INCREMENT_READS]') || text.includes('[Firestore Cost]')) {
      console.log(`[CONSOLE] ${text}`);
    }
  });

  const getStats = async () => {
    return await page.$eval('.fixed.bottom-3.left-16', el => el.innerText.replace(/\n/g, ' ')).catch(() => 'NOT FOUND');
  };

  // 1. Visit /customers
  console.log('1. Navigating to /customers...');
  await page.goto('http://localhost:3000/customers');
  await page.waitForTimeout(3000);
  console.log('Stats after /customers:', await getStats());

  // 2. Click Quotations tab in sidebar
  console.log('2. Clicking Quotations link...');
  await page.click('a[href="/quotations"]');
  await page.waitForTimeout(2000);
  console.log('Stats after /quotes:', await getStats());

  // 3. Click Contracts tab in sidebar
  console.log('3. Clicking Contracts link...');
  await page.click('a[href="/contracts"]');
  await page.waitForTimeout(2000);
  console.log('Stats after /contracts:', await getStats());

  // 4. Return to /customers
  console.log('4. Clicking Customers link...');
  await page.click('a[href="/customers"]');
  await page.waitForTimeout(2000);
  console.log('Stats after returning to /customers:', await getStats());

  // 5. Idle test: Wait 5 seconds
  console.log('5. Waiting 5s idle on /customers...');
  await page.waitForTimeout(5000);
  console.log('Final Stats after idle:', await getStats());

  await browser.close();
  console.log('Tab switching test complete.');
})();
