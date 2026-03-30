import { chromium } from 'playwright';
import { randomUUID } from 'crypto';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ recordVideo: { dir: '/home/jules/verification/videos' } });
  const page = await context.newPage();

  try {
    // 1. Admin Login
    await page.goto("http://localhost:3000/admin/login");
    await page.waitForTimeout(500);

    // Fill admin password
    await page.locator('input[type="password"]').fill("secret");
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Anmelden' }).click();

    // 2. Admin Dashboard
    await page.waitForURL("http://localhost:3000/admin");
    await page.waitForTimeout(1000);

    // Wait for the license table to load or keys to be visible
    await page.waitForTimeout(1000);

    const checkBoxes = await page.locator('.font-mono').allInnerTexts();
    if(checkBoxes.length === 0){
       // Generate new license
    await page.getByRole('button', { name: '+ Neuen Schlüssel generieren' }).click();
      await page.waitForTimeout(1000); // Wait for fetch and re-render
    }

    // Get the generated license key from the table
    const licenseKey = await page.locator('table tbody tr:first-child td:first-child').innerText();

    // 3. Register user
    const userEmail = `test-${randomUUID()}@example.com`;
    await page.goto('http://localhost:3000/register');
    await page.locator('input[type="text"]').nth(1).fill('Test User');
    await page.locator('input[type="email"]').fill(userEmail);
    await page.locator('input[type="password"]').nth(0).fill('Password123!');
    await page.locator('input[type="password"]').nth(1).fill('Password123!');
    await page.locator('input[type="text"]').nth(0).fill(licenseKey);
    await page.getByRole('button', { name: 'Registrieren' }).click();

    // Login after registration
    await page.waitForURL(url => url.toString().includes('http://localhost:3000/login'));
    await page.locator('input[type="password"]').fill('Password123!');
    await page.getByRole('button', { name: 'Anmelden' }).click();

    await page.waitForURL('http://localhost:3000/');
    await page.waitForTimeout(500);

    // 4. Einstellungen -> Dashboard konfigurieren & Standardnotiz
    await page.goto('http://localhost:3000/einstellungen');
    await page.waitForTimeout(500);

    // Change receipt default note
    const defaultNoteInput = page.locator('input[placeholder*="Vielen Dank, ich freue mich auf deinen nächsten Besuch!"]');
    await defaultNoteInput.fill('Neue Standard Belegnotiz für den Test!');

    // Uncheck "Letzte 7 Tage" and censor "Letzte 30 Tage"
    const last7TageCheckbox = page.locator('div').filter({ hasText: /^Letzte 7 TageAnzeigenWert zensieren \(\*\*\*\)$/ }).locator('input[type="checkbox"]').first();
    await last7TageCheckbox.uncheck();

    const last30TageCensorCheckbox = page.locator('div').filter({ hasText: /^Letzte 30 TageAnzeigenWert zensieren \(\*\*\*\)$/ }).locator('input[type="checkbox"]').nth(1);
    await last30TageCensorCheckbox.check();

    await page.getByRole('button', { name: 'Speichern' }).click();
    await page.waitForTimeout(1000);

    // 5. Verify Dashboard configuration
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/home/jules/verification/screenshots/dashboard_config.png' });

    // 6. Create product first for receipt
    await page.goto('http://localhost:3000/produkte');
    await page.getByRole('button', { name: '+ Neues Produkt' }).click();
    await page.waitForTimeout(500);

    // Input name
    await page.locator('.inp').first().fill('Test Product');
    // Input price (4th input field based on visual layout)
    await page.locator('.inp').nth(3).fill('10,00');
    await page.getByRole('button', { name: /Speichern|Anlegen/ }).click();
    await page.waitForTimeout(1000);

    // 7. Test Schnellerfassung - with success banner (no kassen-modus)
    await page.goto('http://localhost:3000/schnellerfassung');
    await page.waitForTimeout(500);
    await page.getByText('Test Product').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Auswahl ansehen/ }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Abschließen' }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/home/jules/verification/screenshots/success_banner.png' });
    await page.waitForTimeout(2000); // wait for redirect

    // 8. Test Schnellerfassung - Kassen-Modus (print modal)
    await page.goto('http://localhost:3000/schnellerfassung');
    await page.waitForTimeout(500);
    await page.getByText('Test Product').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Auswahl ansehen/ }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Kassen-Modus' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Passend' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Abschließen' }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/home/jules/verification/screenshots/print_modal.png' });

    // Verify default note is set in manually created receipt
    await page.goto('http://localhost:3000/belege');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: '+ Neuer Beleg' }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/home/jules/verification/screenshots/manual_receipt_note.png' });

  } finally {
    await context.close();
    await browser.close();
  }
})();
