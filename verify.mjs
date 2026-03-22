import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const verificationDir = '/home/jules/verification';
const videoDir = path.join(verificationDir, 'video');
fs.mkdirSync(videoDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ recordVideo: { dir: videoDir }, viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();

  try {
    console.log("Navigating to app...");
    await page.goto('http://localhost:3000/register');

    console.log("Registering test user...");
    await page.fill('input[type="text"]', 'Test User');
    await page.fill('input[type="email"]', 'test15@test.com');
    await page.fill('input[type="password"] >> nth=0', 'Password123!');
    await page.fill('input[type="password"] >> nth=1', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    console.log("Logging in...");
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'test15@test.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    await page.waitForTimeout(4000);

    console.log("Going to Einstellungen...");
    await page.goto('http://localhost:3000/einstellungen');
    await page.waitForTimeout(500);

    console.log("Checking Light/Dark toggle...");
    await page.screenshot({ path: "/home/jules/verification/failure2.png", fullPage: true });
    await page.click('label:has-text("Dunkel (Dark)")');
    await page.waitForTimeout(500);

    await page.click('label:has-text("Hell (Light)")');
    await page.waitForTimeout(500);

    // Set some colors
    console.log("Setting colors...");
    await page.fill('input[type="color"] >> nth=0', '#ff0000'); // primary
    await page.fill('input[type="color"] >> nth=1', '#00ff00'); // secondary
    await page.click('button:has-text("Speichern")');
    await page.waitForTimeout(4000);

    // Handle alert "Einstellungen gespeichert."
    page.on('dialog', dialog => dialog.accept());

    // verify finanzen page (MwSt visibility)
    console.log("Going to Finanzen...");
    await page.goto('http://localhost:3000/finanzen');
    await page.waitForTimeout(4000);

    console.log("Taking screenshot of Finanzen with KU (no MwSt columns)...");
    await page.screenshot({ path: path.join(verificationDir, 'finanzen-ku.png') });

    // Go back and disable KU
    console.log("Going to Einstellungen to disable KU...");
    await page.goto('http://localhost:3000/einstellungen');
    await page.waitForTimeout(500);
    await page.click('label:has-text("Aktiv (0% USt, Hinweis in Fußzeile)")'); // uncheck
    await page.click('button:has-text("Speichern")');
    await page.waitForTimeout(4000);

    // Go to finanzen again
    console.log("Going to Finanzen...");
    await page.goto('http://localhost:3000/finanzen');
    await page.waitForTimeout(4000);

    console.log("Taking screenshot of Finanzen without KU (has MwSt columns)...");
    await page.screenshot({ path: path.join(verificationDir, 'finanzen-no-ku.png') });

  } catch (err) {
    console.error(err);
  } finally {
    await context.close();
    await browser.close();
  }
})();
