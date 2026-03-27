import { chromium } from "playwright";

async function verify() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }, // iPhone SE dimensions
    recordVideo: { dir: "/home/jules/verification/videos" }
  });
  const page = await context.newPage();

  try {
    // 1. First, register a user and login to set the user session cookie
    await page.goto("http://localhost:3000/register");
    await page.waitForTimeout(500);

    // Get admin license to register first!
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await page2.goto("http://localhost:3000/admin/login");
    await page2.locator('input[type="password"]').fill("admin123");
    await page2.getByRole('button', { name: 'Anmelden' }).click();
    await page2.waitForURL("http://localhost:3000/admin");
    await page2.getByRole('button', { name: '+ Neuen Schlüssel generieren' }).click();
    await page2.waitForTimeout(1000);
    const licenseKey = await page2.locator('table tbody tr:first-child td:first-child').innerText();
    await context2.close();

    // Register user
    const uniqueEmail = `test-${Date.now()}@example.com`;
    await page.locator('input[placeholder="XXX-XXX-XXX"]').fill(licenseKey);
    await page.locator('input[placeholder="z.B. Max Mustermann"]').fill("Test User");
    await page.locator('input[type="email"]').fill(uniqueEmail);
    await page.locator('input[type="password"]').nth(0).fill("Password123!");
    await page.locator('input[type="password"]').nth(1).fill("Password123!");
    await page.getByRole('button', { name: 'Registrieren' }).click();
    await page.waitForTimeout(1500);

    // Login as user to establish the "user" cookie
    await page.goto("http://localhost:3000/login");
    await page.locator('input[type="email"]').fill(uniqueEmail);
    await page.locator('input[type="password"]').fill("Password123!");
    await page.getByRole('button', { name: 'Anmelden' }).click();
    await page.waitForTimeout(1500);

    // 2. Now navigate to Admin Login within the SAME context
    await page.goto("http://localhost:3000/admin/login");
    await page.waitForTimeout(500);

    // Fill admin password
    await page.locator('input[type="password"]').fill("admin123");
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Anmelden' }).click();

    // 3. Admin Dashboard Mobile View (should NOT have sidebar/header)
    await page.waitForURL("http://localhost:3000/admin");
    await page.waitForTimeout(1000);

    await page.screenshot({ path: "/home/jules/verification/screenshots/admin_dashboard_isolated.png" });
    await page.waitForTimeout(1000);

  } catch (e) {
    console.error(e);
  } finally {
    await context.close();
    await browser.close();
  }
}

verify();
