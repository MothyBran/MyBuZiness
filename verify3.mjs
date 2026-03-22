import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const verificationDir = '/home/jules/verification';
const videoDir = path.join(verificationDir, 'video');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ recordVideo: { dir: videoDir }, viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();

  page.on('dialog', dialog => dialog.accept());

  try {
    console.log("Navigating to app...");
    await page.goto('http://localhost:3000/register');
    await page.waitForTimeout(1000);

    console.log("Registering test user...");
    const email = `test-${Date.now()}@test.com`;
    await page.fill('input[type="text"]', 'Test User');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"] >> nth=0', 'Password123!');
    await page.fill('input[type="password"] >> nth=1', 'Password123!');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    // we might be redirected to /login
    console.log("Logging in...");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    console.log("Going to Einstellungen...");
    await page.goto('http://localhost:3000/einstellungen');
    await page.waitForTimeout(2000);

    console.log("Checking Light/Dark toggle...");
    await page.click('label:has-text("Dunkel (Dark)")');
    await page.waitForTimeout(1000);

    await page.click('label:has-text("Hell (Light)")');
    await page.waitForTimeout(1000);

    console.log("Setting colors to #ff0000...");
    await page.fill('input[type="color"] >> nth=0', '#ff0000');
    await page.fill('input[type="color"] >> nth=1', '#00ff00');

    await page.click('button:has-text("Speichern")');
    await page.waitForTimeout(2000);

    console.log("Going to Finanzen...");
    await page.goto('http://localhost:3000/finanzen');
    await page.waitForTimeout(2000);

    console.log("Taking screenshot of Finanzen with KU (no MwSt columns)...");
    await page.screenshot({ path: path.join(verificationDir, 'finanzen-ku.png') });

    console.log("Going back to Einstellungen to disable KU...");
    await page.goto('http://localhost:3000/einstellungen');
    await page.waitForTimeout(2000);
    await page.click('label:has-text("Aktiv (0% USt, Hinweis in Fußzeile)")'); // toggle it
    await page.click('button:has-text("Speichern")');
    await page.waitForTimeout(2000);

    console.log("Going back to Finanzen...");
    await page.goto('http://localhost:3000/finanzen');
    await page.waitForTimeout(2000);

    console.log("Taking screenshot of Finanzen without KU (has MwSt columns)...");
    await page.screenshot({ path: path.join(verificationDir, 'finanzen-no-ku.png') });

  } catch (err) {
    console.error(err);
  } finally {
    await context.close();
    await browser.close();
  }
})();
