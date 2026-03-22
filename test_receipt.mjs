import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('dialog', dialog => {
    console.log("Dialog:", dialog.message());
    dialog.accept();
  });

  try {
    const email = `test-receipt-${Date.now()}@test.com`;

    // Register
    await page.goto('http://localhost:3000/register');
    await page.waitForTimeout(500);
    await page.fill('input[type="text"]', 'Test User');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"] >> nth=0', 'Password123!');
    await page.fill('input[type="password"] >> nth=1', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // Login
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // Go to Belege
    await page.goto('http://localhost:3000/belege');
    await page.waitForTimeout(1000);

    // Open new Beleg
    await page.click('button:has-text("+ Neuer Beleg")');
    await page.waitForTimeout(1000);

    // Add position
    await page.fill('input[type="number"]', '15'); // 15 EUR (unitPriceCents is what we type here, probably 15)
    await page.click('button:has-text("Anlegen")');
    await page.waitForTimeout(1000);

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
