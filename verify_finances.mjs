import { chromium } from 'playwright';
import { expect } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ recordVideo: { dir: '/home/jules/verification/video' } });
  const page = await context.newPage();

  try {
    // Registriere Benutzer um sich einzuloggen
    await page.goto('http://localhost:3000/admin/login');
    await page.waitForTimeout(500);
    await page.locator('input[type="password"]').fill('admin123');
    await page.getByRole('button', { name: 'Anmelden' }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: '+ Neuen Schlüssel generieren' }).click();
    await page.waitForTimeout(1000);
    const licenseKey = await page.locator('table tbody tr:first-child td:first-child').innerText();

    await page.goto('http://localhost:3000/register');
    await page.waitForTimeout(500);

    const uniqueEmail = `testuser_${Date.now()}@example.com`;
    await page.locator('input[placeholder="XXX-XXX-XXX"]').fill(licenseKey);
    await page.locator('input[placeholder="z.B. Max Mustermann"]').fill('Test User');
    await page.locator('input[type="email"]').fill(uniqueEmail);
    await page.locator('input[type="password"]').nth(0).fill('Password123!');
    await page.locator('input[type="password"]').nth(1).fill('Password123!');
    await page.getByRole('button', { name: 'Registrieren' }).click();

    // Warte auf Login (oder ggfs Dashboard)
    await page.waitForTimeout(1500);
    if(page.url().includes('login')){
        await page.locator('input[type="password"]').fill('Password123!');
        await page.getByRole('button', { name: 'Anmelden' }).click();
        await page.waitForURL('http://localhost:3000/');
    }

    // Navigiere zu Finanzen
    await page.goto('http://localhost:3000/finanzen');
    await page.waitForTimeout(1000);

    // Klicke auf den neuen Umsatzbericht Button (prüfen ob er existiert und Link öffnet)
    const year = new Date().getFullYear();
    const pdfLink = page.getByRole('link', { name: `Umsatzbericht PDF (${year})` });
    await expect(pdfLink).toBeVisible();
    await page.waitForTimeout(500);

    // Erfasse Dashboard Screenshot
    await page.screenshot({ path: '/home/jules/verification/finanzen_page.png' });

    // Da der Link target="_blank" hat, fangen wir den neuen Tab auf
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      pdfLink.click()
    ]);

    await newPage.waitForLoadState();
    await newPage.waitForTimeout(2000);

    // Erfasse PDF Bericht Screenshot
    await newPage.screenshot({ path: '/home/jules/verification/bericht_page_with_data.png', fullPage: true });

  } catch (err) {
    console.error(err);
  } finally {
    await context.close();
    await browser.close();
  }
})();
