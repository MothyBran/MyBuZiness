import { chromium } from "playwright";

async function verifyFeature() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ recordVideo: { dir: "/home/jules/verification/video" }, viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();

  try {
    // 1. Register a test user
    await page.goto("http://localhost:3000/register");
    await page.waitForTimeout(500);
    const uniqueEmail = `test-${Date.now()}@example.com`;
    await page.locator('input[type="text"]').fill("Test User");
    await page.locator('input[type="email"]').fill(uniqueEmail);
    await page.locator('input[type="password"]').nth(0).fill("Password123!");
    await page.locator('input[type="password"]').nth(1).fill("Password123!");
    await page.getByRole('button', { name: 'Registrieren' }).click();
    await page.waitForTimeout(2000);

    // 2. Login
    await page.goto("http://localhost:3000/login");
    await page.waitForTimeout(500);
    await page.locator('input[type="email"]').fill(uniqueEmail);
    await page.locator('input[type="password"]').fill("Password123!");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);

    // 3. Create a Customer
    await page.goto("http://localhost:3000/kunden");
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: '+ Neuer Kunde' }).click();
    await page.waitForTimeout(1000);
    await page.locator('form input[name="name"]').fill("Max Mustermann");
    await page.getByRole('button', { name: 'Speichern' }).click();
    await page.waitForTimeout(1500);

    // 4. Create a Product
    await page.goto("http://localhost:3000/produkte");
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: '+ Neue Leistung/Artikel' }).click().catch(() => page.getByRole('button', { name: /Neu/i }).click());
    await page.waitForTimeout(1000);
    // Find input by label "Bezeichnung"
    await page.locator('label').filter({ hasText: 'Bezeichnung' }).locator('input').fill("Test Leistung");
    // Find input by label "Preis (€)"
    await page.locator('label').filter({ hasText: 'Preis (€)' }).locator('input').fill("50,00");
    await page.getByRole('button', { name: 'Speichern' }).click();
    await page.waitForTimeout(1500);

    // Create an Invoice
    await page.goto("http://localhost:3000/rechnungen");
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: '+ Neue Rechnung' }).click();
    await page.waitForTimeout(1000);

    await page.locator('select').nth(0).selectOption({ index: 1 }); // customer
    await page.locator('select').nth(1).selectOption({ index: 1 }); // product
    await page.getByRole('button', { name: 'Anlegen' }).click();
    await page.waitForTimeout(1500);

    // 5. Change status to "done"
    await page.locator('tr.row-clickable').nth(0).click(); // Click the invoice to expand
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: '✏️ Korrigieren' }).click();
    await page.waitForTimeout(1000);
    await page.locator('select').nth(1).selectOption("done"); // Text is 'abgeschlossen', value is 'done'
    await page.getByRole('button', { name: 'Speichern' }).click();
    await page.waitForTimeout(1500);

    // 6. Check Receipts
    await page.goto("http://localhost:3000/belege");
    await page.waitForTimeout(1500);

    // The Receipt should be created
    await page.screenshot({ path: "/home/jules/verification/verification.png" });
    await page.waitForTimeout(1000);

    // Expand the receipt
    await page.locator('tr.row-clickable').nth(0).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "/home/jules/verification/verification-receipt-open.png" });
    await page.waitForTimeout(1000);

    // Check Dashboard
    await page.goto("http://localhost:3000/");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "/home/jules/verification/verification2.png" });
    await page.waitForTimeout(1000);

  } finally {
    await context.close();
    await browser.close();
  }
}

verifyFeature().catch(console.error);
