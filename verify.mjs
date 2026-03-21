import { chromium } from 'playwright';

async function verify_feature(page) {
  // Navigate and wait
  await page.goto("http://localhost:3000");
  await page.waitForTimeout(500);

  // Register a new user
  await page.goto("http://localhost:3000/register");
  await page.waitForTimeout(500);

  const uuid = Math.random().toString(36).substring(7);
  // Using more robust selectors based on page content
  await page.fill('input[placeholder="z.B. Max Mustermann"]', "Test User");
  await page.fill('input[type="email"]', `test${uuid}@example.com`);

  // Find password inputs by locating the label first, then the next input
  await page.locator('label:has-text("Passwort") + div > input').first().fill("Password123!");
  await page.locator('label:has-text("Passwort wiederholen") + div > input').first().fill("Password123!");

  await page.click('button:has-text("Registrieren")');
  await page.waitForTimeout(3000);

  // Note: the original code redirect to `/login?email=...`
  await page.waitForURL("**/login*");

  // Log in
  await page.locator('input[type="password"]').fill("Password123!");
  await page.click('button:has-text("Anmelden")');
  await page.waitForTimeout(3000);

  // Go to Customers
  await page.goto("http://localhost:3000/kunden");
  await page.waitForTimeout(500);

  // Create a customer
  await page.click('button:has-text("+ Neuer Kunde")');
  await page.waitForTimeout(500);

  // Focus and type instead of fill
  await page.locator('input[name="name"]').fill("Max Mustermann");
  await page.locator('input[name="email"]').fill("max@example.com");
  await page.locator('input[name="phone"]').fill("+4912345678");
  await page.click('button:has-text("Speichern")');
  await page.waitForTimeout(1000);

  // Read customer ID from DB (indirectly by waiting for the page to load it and clicking the row)
  await page.locator('td:has-text("Max Mustermann")').click();
  await page.waitForTimeout(1000);

  // Since we haven't created any appointments, the "Keine Termine vorhanden." message should be shown.
  await page.screenshot({ path: "/home/jules/verification/verification-empty.png" });

  // Now, create an appointment for this customer
  await page.goto("http://localhost:3000/termine");
  await page.waitForTimeout(1000);

  await page.click('button:has-text("Neu")');
  await page.waitForTimeout(500);

  // Fill in the appointment details
  // Wait for the modal and form to be fully visible
  await page.waitForSelector('.modal');
  // Then type title into the input that corresponds to 'Bezeichnung'
  await page.locator('.modal').locator('label:has-text("Bezeichnung") input').fill("Besprechung");

  // Assuming a standard select, wait for the customer to load
  await page.locator('.modal').locator('label:has-text("Kunde") select').selectOption({ label: 'Max Mustermann' });

  // Type date
  await page.locator('.modal').locator('label:has-text("Datum") input').fill("2024-12-01"); // Use a fixed date

  // Type times
  await page.locator('.modal').locator('label:has-text("Start") input').fill("10:00");
  await page.locator('.modal').locator('label:has-text("Ende") input').fill("11:00");

  await page.locator('.modal').locator('button:has-text("Speichern")').click();
  await page.waitForTimeout(1000);

  // Go back to Customers
  await page.goto("http://localhost:3000/kunden");
  await page.waitForTimeout(1000);

  // Open the customer details again
  await page.locator('td:has-text("Max Mustermann")').click();
  await page.waitForTimeout(1000);

  // We should see the appointment in the history
  await page.screenshot({ path: "/home/jules/verification/verification.png" });
  await page.waitForTimeout(1000);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ recordVideo: { dir: "/home/jules/verification/video" } });
  const page = await context.newPage();
  try {
    await verify_feature(page);
  } catch (e) {
    console.error(e);
  } finally {
    await context.close();
    await browser.close();
  }
})();