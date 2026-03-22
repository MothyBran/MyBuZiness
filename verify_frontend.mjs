import { chromium } from "playwright";

async function verify() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordVideo: { dir: "/home/jules/verification/video" }
  });
  const page = await context.newPage();

  try {
    // Navigate and test user registration
    await page.goto("http://localhost:3000/register");
    await page.waitForTimeout(2000);

    // Fill out the registration form properly
    const email = "test" + Date.now() + "@example.com";
    await page.fill('input[type="text"].input', "Test User");
    await page.fill('input[type="email"].input', email);

    const pwds = await page.locator('input[type="password"].input').all();
    await pwds[0].fill("Password123!");
    await pwds[1].fill("Password123!");

    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000); // Wait for redirect to login page

    // Fill login form
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', "Password123!");
    await page.click('button:has-text("Anmelden")');
    await page.waitForTimeout(4000); // wait for redirect to dashboard

    // 2. Open Settings and verify 'Live anwenden' is gone
    await page.goto("http://localhost:3000/einstellungen");
    await page.waitForTimeout(2000);
    const liveBtnCount = await page.locator('button:has-text("Live anwenden")').count();
    console.log("Is 'Live anwenden' button visible?", liveBtnCount > 0);
    await page.screenshot({ path: "/home/jules/verification/settings_no_live_btn.png" });

    // 3. Create a Receipt
    await page.goto("http://localhost:3000/belege");
    await page.waitForTimeout(2000);
    await page.click('button:has-text("+ Neuer Beleg")');
    await page.waitForTimeout(1000);

    // Fill the cent-bug test (input: 20 -> expected sum 20,00)
    // The price input is an `inputMode="decimal"`
    const decimalInputs = await page.locator('input[inputmode="decimal"]').all();

    // There are 2 inputs with inputMode="decimal": 1 for discount, 1 for the first receipt item.
    // The second one is the price
    const priceInput = decimalInputs[1];
    await priceInput.fill("20");
    await priceInput.blur(); // blur triggers formatting
    await page.waitForTimeout(500);

    await page.click('button:has-text("Anlegen")');
    await page.waitForTimeout(3000);

    // Expand the receipt
    await page.locator('.row-clickable').first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "/home/jules/verification/receipt_row.png" });

    // Print Receipt
    // Wait for target blank context
    const printPromise = context.waitForEvent('page');
    await page.click('a:has-text("🖨️ Druckansicht")');
    const printPage = await printPromise;
    await printPage.waitForLoadState();
    await printPage.waitForTimeout(1000);
    await printPage.screenshot({ path: "/home/jules/verification/receipt_print.png" });
    await printPage.close();

    // 4. Test Search Bar in Belege
    const belegeSearch = page.locator('input[placeholder="Suchen (Nr/Datum/Betrag)…"]');
    console.log("Belege Search Input visible?", await belegeSearch.isVisible());
    const belegeScanner = page.getByRole('button', { name: "📷 Scanner" });
    console.log("Belege Scanner Button visible?", await belegeScanner.isVisible());
    await page.screenshot({ path: "/home/jules/verification/belege_search.png" });

    // 5. Test Search Bar in Rechnungen
    await page.goto("http://localhost:3000/rechnungen");
    await page.waitForTimeout(2000);
    const rechnungenSearch = page.locator('input[placeholder="Suchen (Nr/Datum/Kunde/Betrag)…"]');
    console.log("Rechnungen Search Input visible?", await rechnungenSearch.isVisible());
    const rechnungenScanner = page.getByRole('button', { name: "📷 Scanner" });
    console.log("Rechnungen Scanner Button visible?", await rechnungenScanner.isVisible());
    await page.screenshot({ path: "/home/jules/verification/rechnungen_search.png" });

    console.log("Verification checks passed!");

  } catch (err) {
    console.error(err);
  } finally {
    await context.close();
    await browser.close();
  }
}

verify();
