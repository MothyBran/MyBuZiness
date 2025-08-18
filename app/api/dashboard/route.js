// app/api/dashboard/route.js
import { initDb, q } from "@/lib/db";

/**
 * Hilfsfunktion: Settings laden und in sinnvolle Defaults mappen.
 * Erwartete/unterstützte Spalten in "Settings":
 *  - currency (oder currencyDefault)
 *  - primaryColor, secondaryColor, fontFamily, fontColor, logoUrl / logoPath
 *  - companyName, ownerName, address1, address2, zip, city, phone, email, website, bank, vatId
 *  - kleinunternehmer (boolean)
 */
async function loadSettings() {
  const row = (await q(
    `SELECT * FROM "Settings" ORDER BY "createdAt" ASC NULLS LAST, "id" ASC LIMIT 1`
  )).rows[0];

  const currency =
    row?.currencyDefault || row?.currency || "EUR";

  const logo =
    row?.logoUrl || row?.logoPath || null;

  return {
    currencyDefault: currency,
    kleinunternehmer: !!row?.kleinunternehmer,
    primaryColor: row?.primaryColor || "#0aa",
    secondaryColor: row?.secondaryColor || "#0f766e",
    fontFamily: row?.fontFamily || `Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial`,
    fontColor: row?.fontColor || "#111111",
    logoUrl: logo,
    company: {
      name: row?.companyName || "",
      owner: row?.ownerName || "",
      address1: row?.address1 || "",
      address2: row?.address2 || "",
      zip: row?.zip || "",
      city: row?.city || "",
      phone: row?.phone || "",
      email: row?.email || "",
      website: row?.website || "",
      bank: row?.bank || "",
      vatId: row?.vatId || ""
    }
  };
}

export async function GET() {
  try {
    await initDb();

    // --- KPI / Totals (Belege als "Umsatz" Grundlage) ---
    const today = (await q(`
      SELECT COALESCE(SUM("grossCents"),0)::bigint AS v
      FROM "Receipt"
      WHERE "date" = CURRENT_DATE
    `)).rows[0].v;

    const last7 = (await q(`
      SELECT COALESCE(SUM("grossCents"),0)::bigint AS v
      FROM "Receipt"
      WHERE "date" >= CURRENT_DATE - INTERVAL '6 days'
    `)).rows[0].v;

    const last30 = (await q(`
      SELECT COALESCE(SUM("grossCents"),0)::bigint AS v
      FROM "Receipt"
      WHERE "date" >= CURRENT_DATE - INTERVAL '29 days'
    `)).rows[0].v;

    // --- Counts ---
    const customers = (await q(`SELECT COUNT(*)::int AS c FROM "Customer"`)).rows[0].c ?? 0;
    const products  = (await q(`SELECT COUNT(*)::int AS c FROM "Product"`)).rows[0].c ?? 0;
    const invoices  = (await q(`SELECT COUNT(*)::int AS c FROM "Invoice"`)).rows[0].c ?? 0;
    const receipts  = (await q(`SELECT COUNT(*)::int AS c FROM "Receipt"`)).rows[0].c ?? 0;

    // --- Recent Receipts ---
    const recentReceipts = (await q(`
      SELECT "id","receiptNo","date","grossCents","currency","createdAt","updatedAt"
      FROM "Receipt"
      ORDER BY "createdAt" DESC NULLS LAST, "date" DESC NULLS LAST, "id" DESC
      LIMIT 10
    `)).rows;

    // --- Recent Invoices inkl. Kundenname ---
    const recentInvoices = (await q(`
      SELECT i."id", i."invoiceNo", i."issueDate", i."grossCents", i."currency",
             i."createdAt", i."updatedAt", c."name" AS "customerName"
      FROM "Invoice" i
      LEFT JOIN "Customer" c ON c."id" = i."customerId"
      ORDER BY i."createdAt" DESC NULLS LAST, i."issueDate" DESC NULLS LAST, i."id" DESC
      LIMIT 10
    `)).rows;

    // --- Settings (Design + Firma + Währung) ---
    const settings = await loadSettings();

    return new Response(JSON.stringify({
      ok: true,
      data: {
        totals: { today, last7, last30 },
        counts: { customers, products, invoices, receipts },
        recentReceipts,
        recentInvoices,
        settings   // <— NEU: alles zentral verfügbar (currencyDefault, Farben, Firma, etc.)
      }
    }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store"
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), {
      status: 500,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store"
      }
    });
  }
}
