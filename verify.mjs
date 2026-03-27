import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ recordVideo: { dir: '/home/jules/verification/video' } });
  const page = await context.newPage();

  try {
    // Navigate to admin to create a license key
    await page.goto('http://localhost:3000/admin/login');
    await page.waitForTimeout(500);
    await page.locator('input[type="password"]').fill('admin123');
    await page.getByRole('button', { name: /Anmelden/i }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: '+ Neuen Schlüssel generieren' }).click();
    await page.waitForTimeout(1000);
    const licenseKey = await page.locator('table tbody tr:first-child td:first-child').innerText();

    // Navigate to register and create test user
    await page.goto('http://localhost:3000/register');
    await page.waitForTimeout(500);
    const testEmail = `test-${Date.now()}@example.com`;
    await page.locator('input[placeholder="XXX-XXX-XXX"]').fill(licenseKey);
    await page.locator('input[placeholder="z.B. Max Mustermann"]').fill('Test User');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').nth(0).fill('Password123!');
    await page.locator('input[type="password"]').nth(1).fill('Password123!');
    await page.getByRole('button', { name: /Registrieren/i }).click();
    await page.waitForTimeout(1500);
    await page.goto('http://localhost:3000/login');
    await page.waitForTimeout(1000);
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill('Password123!');
    await page.getByRole('button', { name: /Anmelden/i }).click();
    await page.waitForTimeout(1500);

    // Navigate to Settings
    await page.goto('http://localhost:3000/einstellungen');
    await page.waitForTimeout(500);

    // Verify Settings Bank Fields exist
    await page.locator('input[placeholder="z. B. Sparkasse Musterstadt"]').fill('MyBank');
    await page.locator('input[placeholder="z. B. Max Mustermann"]').fill('John Doe');
    await page.locator('input[placeholder="DE..."]').fill('DE123456');
    await page.locator('input[placeholder="XXXXXXXXXXX"]').fill('BICKY');
    await page.getByRole('button', { name: 'Speichern' }).nth(0).click();
    await page.waitForTimeout(500);

    // Take screenshot of Settings
    await page.screenshot({ path: '/home/jules/verification/settings.png' });

    // Navigate to Belege
    await page.goto('http://localhost:3000/belege');
    await page.waitForTimeout(500);

    // Create a new Beleg
    await page.getByRole('button', { name: 'Neuer Beleg' }).click();
    await page.waitForTimeout(500);

    // Fill in basic info
    await page.locator('input[placeholder="0,00"]').nth(0).fill('0,00'); // discount

    // Create a dummy product to pick from (need to mock or skip it)
    // Wait, let's just use a free-text item.
    // Oh wait, free-text in Receipts doesn't have an input element for free text name in the standard select flow, it just uses a generic select for product or a manual update, but we don't have free text in belege positions...
    // Let's create a product first!
    await page.goto('http://localhost:3000/produkte');
    await page.waitForTimeout(1000);
    // Forget products, just go to Belege and test the new widths & fields there directly.
    await page.goto('http://localhost:3000/belege');
    await page.waitForTimeout(1000);

    // Neuer Beleg
    await page.getByRole('button').nth(0).click();
    await page.waitForTimeout(500);

    // Take screenshot to show Grundpreis + Layout
    await page.screenshot({ path: '/home/jules/verification/belege.png' });

  } catch (err) {
    console.error(err);
  } finally {
    await context.close();
    await browser.close();
  }
})();
