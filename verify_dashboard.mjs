import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ recordVideo: { dir: '/home/jules/verification/videos' } });
  const page = await context.newPage();

  try {
    // 1. Create a user via Admin panel and register
    await page.goto('http://localhost:3000/admin/login');
    await page.waitForTimeout(1000);
    await page.locator('input[type="password"]').fill('admin123');
    await page.getByRole('button', { name: /Anmelden/i }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: '+ Neuen Schlüssel generieren' }).click();
    await page.waitForTimeout(1000);
    const licenseKey = await page.locator('table tbody tr:first-child td:first-child').innerText();

    await page.goto('http://localhost:3000/register');
    await page.waitForTimeout(1000);
    const testEmail = `dashboard-${Date.now()}@example.com`;
    await page.locator('input[placeholder="XXX-XXX-XXX"]').fill(licenseKey);
    await page.locator('input[placeholder="z.B. Max Mustermann"]').fill('Test User');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').nth(0).fill('Password123!');
    await page.locator('input[type="password"]').nth(1).fill('Password123!');
    await page.getByRole('button', { name: /Registrieren/i }).click();
    await page.waitForTimeout(2000);

    // Login
    await page.goto('http://localhost:3000/login');
    await page.waitForTimeout(1000);
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill('Password123!');
    await page.getByRole('button', { name: /Anmelden/i }).click();
    await page.waitForTimeout(2000);

    // 2. Create a customer to link to invoice
    await page.goto('http://localhost:3000/kunden');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: '+ Neuer Kunde' }).click();
    await page.waitForTimeout(500);
    await page.locator('input[placeholder="z.B. Max Mustermann"]').fill('Test Customer');
    await page.getByRole('button', { name: 'Speichern' }).click();
    await page.waitForTimeout(1000);

    // 3. Create a product for the invoice
    await page.goto('http://localhost:3000/produkte');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: '+ Neues Produkt' }).click();
    await page.waitForTimeout(500);
    await page.locator('input[placeholder="z.B. Wartungspauschale"]').fill('Test Product');
    await page.locator('input[placeholder="0,00"]').fill('100,00');
    await page.getByRole('button', { name: 'Speichern' }).click();
    await page.waitForTimeout(1000);

    // 4. Create an Invoice
    await page.goto('http://localhost:3000/rechnungen');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: '+ Neue Rechnung' }).click();
    await page.waitForTimeout(1000);

    // Pick customer
    await page.locator('select[required]').selectOption({ index: 1 });
    await page.waitForTimeout(500);

    // Add item
    await page.getByRole('button', { name: '+ Position' }).click();
    await page.waitForTimeout(500);

    // Pick product in the first available select
    const selects = await page.locator('table select');
    await selects.nth(0).selectOption({ index: 1 });
    await page.waitForTimeout(500);

    // Save as Open
    await page.getByRole('button', { name: 'Anlegen' }).click();
    await page.waitForTimeout(2000);

    // 5. Create a Stornierte Invoice
    await page.getByRole('button', { name: '+ Neue Rechnung' }).click();
    await page.waitForTimeout(1000);
    await page.locator('select[required]').selectOption({ index: 1 });
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: '+ Position' }).click();
    await page.waitForTimeout(500);
    const selects2 = await page.locator('table select');
    await selects2.nth(0).selectOption({ index: 1 });
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Anlegen' }).click();
    await page.waitForTimeout(2000);

    // Expand the second invoice and edit it to be "storniert"
    await page.locator('.row-clickable').nth(0).click(); // Top one is newest
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: '✏️ Korrigieren' }).click();
    await page.waitForTimeout(1000);

    // Find the status select (it's the second select on the form if we count customer, but let's be more specific)
    // Wait, let's just use text "storniert" in the status select
    await page.locator('select').filter({ hasText: 'offen' }).selectOption('canceled');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Speichern' }).click();
    await page.waitForTimeout(2000);

    // 6. Go to dashboard and verify the changes!
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(2000);

    // Take screenshot showing the dashboard recent invoices list with the colored rings and all invoices visible
    await page.screenshot({ path: '/home/jules/verification/screenshots/dashboard-rings.png' });
    await page.waitForTimeout(1000);

    // 7. Verify print layout for an invoice
    // Get the ID of the first invoice created
    await page.goto('http://localhost:3000/rechnungen');
    await page.waitForTimeout(2000);
    await page.locator('.row-clickable').nth(1).click();
    await page.waitForTimeout(500);

    // Click druckansicht and capture it (it normally opens in a new tab, so let's just grab the href and go there)
    const printHref = await page.getByRole('link', { name: '🖨️ Druckansicht' }).getAttribute('href');
    await page.goto(`http://localhost:3000${printHref}`);
    await page.waitForTimeout(2000);

    // Take screenshot of the print page layout (shows payment instruction below totals)
    await page.screenshot({ path: '/home/jules/verification/screenshots/invoice-print-layout.png' });
    await page.waitForTimeout(1000);

  } catch (err) {
    console.error(err);
  } finally {
    await context.close();
    await browser.close();
  }
})();
