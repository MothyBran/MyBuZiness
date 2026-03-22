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
    const email = `test-receipt-full-${Date.now()}@test.com`;

    // Register
    console.log("Registering");
    await page.goto('http://localhost:3000/register');
    await page.waitForTimeout(500);
    await page.fill('input[type="text"]', 'Test User');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"] >> nth=0', 'Password123!');
    await page.fill('input[type="password"] >> nth=1', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Login if redirected to login
    const currentUrl = page.url();
    if(currentUrl.includes("/login")) {
      console.log("Logging in");
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', 'Password123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }

    // Go to Belege
    console.log("Going to Belege");
    await page.goto('http://localhost:3000/belege');
    await page.waitForTimeout(1000);

    // Open new Beleg
    console.log("Opening new Beleg");
    await page.click('button:has-text("+ Neuer Beleg")');
    await page.waitForTimeout(1000);

    // Add position
    console.log("Adding position");
    // Get all numeric inputs and fill the last one (unit price)
    const numericInputs = await page.locator('input[type="number"]');
    const count = await numericInputs.count();
    await numericInputs.nth(count - 1).fill('15'); // 15 EUR (unitPriceCents is what we type here, probably 1500? Actually the UI parses `toInt(e.target.value)` directly? wait, the code is `value={Math.round(unit)}` and `onChange=...toInt(e.target.value)` in cents. So typing 15 is 15 cents.)
    await page.click('button:has-text("Anlegen")');
    await page.waitForTimeout(2000);

    // Verify it was added
    const rowCount = await page.locator('tbody tr').count();
    console.log("Row count:", rowCount);

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
