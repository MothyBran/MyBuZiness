import { chromium } from "playwright";

async function verify() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordVideo: { dir: "/home/jules/verification/videos" }
  });
  const page = await context.newPage();

  try {
    // 1. Admin Login
    await page.goto("http://localhost:3000/admin/login");
    await page.waitForTimeout(500);

    // Fill admin password
    await page.locator('input[type="password"]').fill("admin123");
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Anmelden' }).click();

    // 2. Admin Dashboard
    await page.waitForURL("http://localhost:3000/admin");
    await page.waitForTimeout(1000);

    // Generate new license
    await page.getByRole('button', { name: '+ Neuen Schlüssel generieren' }).click();
    await page.waitForTimeout(1000); // Wait for fetch and re-render

    // Get the generated license key from the table
    const licenseKey = await page.locator('table tbody tr:first-child td:first-child').innerText();
    console.log("Generated License Key:", licenseKey);

    await page.screenshot({ path: "/home/jules/verification/screenshots/admin_dashboard.png" });

    // 3. Register with new license key
    await page.goto("http://localhost:3000/register");
    await page.waitForTimeout(500);

    await page.locator('input[placeholder="XXX-XXX-XXX"]').fill(licenseKey);
    await page.locator('input[placeholder="z.B. Max Mustermann"]').fill("Test User");
    await page.locator('input[type="email"]').fill("test@example.com");
    await page.locator('input[type="password"]').nth(0).fill("Password123!");
    await page.locator('input[type="password"]').nth(1).fill("Password123!");
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Registrieren' }).click();
    await page.waitForTimeout(1500);

    // 4. Verify License is marked as used in Admin Dashboard
    await page.goto("http://localhost:3000/admin");
    await page.waitForTimeout(1000);

    await page.screenshot({ path: "/home/jules/verification/screenshots/admin_dashboard_used.png" });
    await page.waitForTimeout(1000);

  } catch (e) {
    console.error(e);
  } finally {
    await context.close();
    await browser.close();
  }
}

verify();
