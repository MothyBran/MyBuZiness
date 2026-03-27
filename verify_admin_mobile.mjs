import { chromium } from "playwright";

async function verify() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }, // iPhone SE dimensions
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

    // 2. Admin Dashboard Mobile View
    await page.waitForURL("http://localhost:3000/admin");
    await page.waitForTimeout(1000);

    await page.screenshot({ path: "/home/jules/verification/screenshots/admin_dashboard_mobile.png" });
    await page.waitForTimeout(1000);

  } catch (e) {
    console.error(e);
  } finally {
    await context.close();
    await browser.close();
  }
}

verify();
