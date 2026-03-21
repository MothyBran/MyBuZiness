import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ recordVideo: { dir: '/home/jules/verification/video' } });
  const page = await context.newPage();

  try {
    // 1. Register a test admin (UUID to avoid collisions)
    const uuid = Math.random().toString(36).substring(7);
    const email = `admin_${uuid}@test.com`;

    await page.goto("http://localhost:3000/register");
    await page.waitForTimeout(1000);

    await page.getByPlaceholder("z.B. Max Mustermann").fill("Admin User");
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').nth(0).fill("Password123!");
    await page.locator('input[type="password"]').nth(1).fill("Password123!");
    await page.getByRole("button", { name: "Registrieren" }).click();

    // Wait for the URL to change to the login page
    await page.waitForURL("**/login*");
    await page.waitForTimeout(1000);

    // Login as Admin
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill("Password123!");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await page.waitForURL("http://localhost:3000/");

    // 2. Go to Mitarbeiter page
    await page.goto("http://localhost:3000/mitarbeiter");
    await page.waitForTimeout(1000);

    // 3. Add an employee
    await page.getByRole("button", { name: "Mitarbeiter hinzufügen" }).click();
    await page.waitForTimeout(1000);

    const empEmail = `emp_${uuid}@test.com`;
    // Select the form inputs inside the modal
    await page.locator('.modal-backdrop input').nth(0).fill("Mitarbeiter 1");
    await page.locator('.modal-backdrop input[type="email"]').fill(empEmail);
    await page.getByRole("button", { name: "Speichern" }).click();

    // Wait for success message and code to appear
    await page.waitForSelector('text=Mitarbeiter angelegt', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Extract the code from the table row
    const codeText = await page.locator('span', { hasText: 'Code:' }).innerText();
    const loginCode = codeText.split('Code: ')[1].trim();
    console.log("Extracted Login Code:", loginCode);

    // Take a screenshot of the mitarbeiter table
    await page.screenshot({ path: "/home/jules/verification/verification-1.png" });
    await page.waitForTimeout(500);

    // 4. Logout Admin
    await page.locator('button[title="Abmelden"]').click();
    await page.waitForURL("**/login*");
    await page.waitForTimeout(1000);

    // 5. Employee login with initial code
    await page.locator('input[type="email"]').fill(empEmail);
    await page.locator('input[type="password"]').fill(loginCode);
    await page.getByRole("button", { name: "Anmelden" }).click();

    // Wait for Step 2 UI (Passwort festlegen)
    await page.waitForSelector('text=Passwort festlegen');
    await page.waitForTimeout(1000);

    // 6. Set new password
    await page.locator('input[type="password"]').fill("NewEmployeePass123!");
    await page.screenshot({ path: "/home/jules/verification/verification-2.png" });
    await page.getByRole("button", { name: "Passwort speichern und anmelden" }).click();

    // Wait to be logged in and on Dashboard
    await page.waitForURL("http://localhost:3000/");
    await page.waitForTimeout(1000);

    // 7. Verify Profil link in sidebar
    await page.locator('a[title="Profil"]').click();
    await page.waitForURL("http://localhost:3000/profil");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "/home/jules/verification/verification-3.png" });

  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await context.close();
    await browser.close();
  }
})();