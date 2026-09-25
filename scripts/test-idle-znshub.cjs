const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/zns-hub');
  await page.waitForTimeout(2000);
  
  const initialBadge = await page.$eval('.fixed.bottom-3.left-16', el => el.innerText.replace(/\n/g, ' ')).catch(() => 'NOT FOUND');
  console.log('Initial Badge on /zns-hub:', initialBadge);
  
  console.log('Sitting idle for 5 seconds...');
  await page.waitForTimeout(5000);
  
  const finalBadge = await page.$eval('.fixed.bottom-3.left-16', el => el.innerText.replace(/\n/g, ' ')).catch(() => 'NOT FOUND');
  console.log('Final Badge after 5s idle:', finalBadge);
  
  if (initialBadge === finalBadge) {
    console.log('SUCCESS: ZERO READ LEAK on /zns-hub during idle!');
  } else {
    console.log('WARNING: Reads changed from', initialBadge, 'to', finalBadge);
  }
  
  await browser.close();
})();
