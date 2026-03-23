import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const VERIFICATION_DIR = '/home/jules/verification';
const VIDEO_DIR = path.join(VERIFICATION_DIR, 'video');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ recordVideo: { dir: VIDEO_DIR } });
  const page = await context.newPage();

  try {
    console.log("Navigating to register...");
    await page.goto('http://localhost:3000/register');

    // Create test user
    const testEmail = `test-${Date.now()}@example.com`;
    await page.fill('input[type="text"]', 'Max Mustermann');
    await page.fill('input[type="email"]', testEmail);
    await page.locator('input[type="password"]').nth(0).fill('Password123!');
    await page.locator('input[type="password"]').nth(1).fill('Password123!');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(3000);

    console.log("Navigating to login...");
    await page.goto('http://localhost:3000/login');
    await page.waitForTimeout(1000);

    // Login with the previously created test user
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(3000);

    console.log("Opening Belege...");
    await page.goto('http://localhost:3000/belege');
    await page.waitForTimeout(2000);

    // check if we are on belege page and have the button
    const hasButton = await page.locator('button:has-text("+ Neuer Beleg")').count();
    console.log("Button count:", hasButton);
    if(hasButton > 0){
        await page.click('button:has-text("+ Neuer Beleg")');
        await page.waitForTimeout(1000);

        console.log("Entering Position...");
        const qtySelect = page.locator('.positions select').nth(1);
        await qtySelect.selectOption({ value: '1' });

        const priceInput = page.locator('.positions input[inputMode="decimal"]');
        await priceInput.fill('60,00');
        await priceInput.blur();
        await page.waitForTimeout(500);

        console.log("Entering Discount...");
        const discountInput = page.locator('input[placeholder="0,00"]');
        await discountInput.fill('5,00');
        await discountInput.blur();
        await page.waitForTimeout(1000);

        console.log("Saving Beleg...");
        await page.click('button:has-text("Anlegen")');
        await page.waitForTimeout(2000);

        console.log("Expanding first Beleg...");
        await page.locator('.row-clickable').first().click();
        await page.waitForTimeout(1000);

        const printHref = await page.locator('a.btn-ghost:has-text("Druckansicht")').getAttribute('href');
        if (printHref) {
          console.log("Navigating to Print View:", printHref);
          await page.goto(`http://localhost:3000${printHref}`);
          await page.waitForTimeout(2000);

          console.log("Taking screenshot of Print View...");
          await page.screenshot({ path: path.join(VERIFICATION_DIR, 'print_view.png') });
        } else {
          console.log("Could not find print view link.");
        }
    } else {
        console.log("Taking screenshot of Belege Page to see what went wrong...");
        await page.screenshot({ path: path.join(VERIFICATION_DIR, 'belege_error.png') });
    }
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await context.close();
    await browser.close();
  }
})();
