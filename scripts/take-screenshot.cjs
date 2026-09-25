const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:3000/deliveries');
  await page.waitForTimeout(3000);

  const stats = await page.$eval('.fixed.bottom-3.left-16', el => el.innerText.replace(/\n/g, ' ')).catch(() => 'NOT FOUND');
  console.log('Final Page Stats:', stats);

  const screenshotPath = 'C:/Users/Doney/.gemini/antigravity-ide/brain/bb566709-fa8e-4078-aca5-d6964f56de14/deliveries_unfrozen.png';
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to:', screenshotPath);

  await browser.close();
})();
