import { chromium } from "playwright";

async function verifyFeature() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ recordVideo: { dir: "/home/jules/verification/videos" }, viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();

  try {
    // 0. Get license
    await page.goto('http://localhost:3000/admin/login');
    await page.waitForTimeout(500);
    const hasAdminLogin = await page.getByRole('button', { name: 'Anmelden' }).count();
    if (hasAdminLogin > 0) {
        await page.locator('input[type="password"]').fill('admin123');
        await page.getByRole('button', { name: 'Anmelden' }).click();
        await page.waitForTimeout(1000);
    }

    await page.getByRole('button', { name: '+ Neuen Schlüssel generieren' }).click();
    await page.waitForTimeout(1000);
    const licenseKey = await page.locator('table tbody tr:first-child td:first-child').innerText();

    // Logout admin
    await page.goto('http://localhost:3000/api/auth/logout');
    await page.waitForTimeout(500);

    // 1. Register a test user
    await page.goto("http://localhost:3000/register");
    await page.waitForTimeout(500);
    const uniqueEmail = `test-${Date.now()}@example.com`;
    await page.locator('input[placeholder="XXX-XXX-XXX"]').fill(licenseKey);
    await page.locator('input[placeholder="z.B. Max Mustermann"]').fill("Test User");
    await page.locator('input[type="email"]').fill(uniqueEmail);
    await page.locator('input[type="password"]').nth(0).fill("Password123!");
    await page.locator('input[type="password"]').nth(1).fill("Password123!");
    await page.getByRole('button', { name: 'Account erstellen' }).click();
    await page.waitForTimeout(2000);

    // Navigate to Termine page
    await page.goto('http://localhost:3000/termine');
    await page.waitForTimeout(1000);

    // Open Settings Modal
    await page.getByRole('button', { name: '⚙️' }).click();
    await page.waitForTimeout(1000);

    // Check visually
    await page.screenshot({ path: '/home/jules/verification/screenshots/termine-settings.png' });
    await page.waitForTimeout(500);

    // Change some settings
    await page.getByRole('button', { name: 'Mo' }).click(); // toggle Monday off
    await page.getByRole('button', { name: 'Mo' }).click(); // toggle Monday on
    await page.locator('input[type="time"]').nth(0).fill('10:00'); // Start
    await page.locator('input[type="time"]').nth(1).fill('16:00'); // End
    await page.getByRole('button', { name: 'Speichern' }).click();
    await page.waitForTimeout(1000);

    // Navigate to today day view
    await page.getByRole('link', { name: 'Heute' }).click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: '/home/jules/verification/screenshots/termine-dayview-business-hours.png' });
    await page.waitForTimeout(500);

    // Add a new Appointment
    await page.locator('.card', { hasText: 'Zeitplan' }).click({ position: { x: 50, y: 150 } }); // Clicking around 10:00 AM area
    await page.waitForTimeout(1000);

    // Select Absence
    await page.locator('select').first().selectOption('absence');
    await page.waitForTimeout(500);

    // Fill out form
    await page.locator('input[type="date"]').nth(1).fill('2025-12-31'); // endDate
    await page.getByRole('button', { name: /Speichern/i }).click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: '/home/jules/verification/screenshots/termine-dayview-absence-added.png' });
    await page.waitForTimeout(1000);

  } catch(e) {
      console.error("Test failed:", e);
      // Wait for a second so error screenshot might be useful
      await page.waitForTimeout(1000);
  } finally {
      await context.close();
      await browser.close();
  }
}

verifyFeature().catch(console.error);
