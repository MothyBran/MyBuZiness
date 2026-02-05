// app/api/dashboard/route.js
import { initDb, q } from "@/lib/db";
import { requireUser } from "@/lib/auth";

async function loadSettings(userId) {
  const row = (await q(
    `SELECT * FROM "Settings" WHERE "userId"=$1 LIMIT 1`,
    [userId]
  )).rows[0];

  const currency = row?.currencyDefault || row?.currency || "EUR";
  const logo = row?.logoUrl || row?.logoPath || null;

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
    const userId = await requireUser();
    await initDb();

    // --- KPI / Totals (Belege als "Umsatz" Grundlage) ---
    const today = (await q(`
      SELECT COALESCE(SUM("grossCents"),0)::bigint AS v
      FROM "Receipt"
      WHERE "userId"=$1 AND "date" = CURRENT_DATE
    `, [userId])).rows[0].v;

    const last7 = (await q(`
      SELECT COALESCE(SUM("grossCents"),0)::bigint AS v
      FROM "Receipt"
      WHERE "userId"=$1 AND "date" >= CURRENT_DATE - INTERVAL '6 days'
    `, [userId])).rows[0].v;

    const last30 = (await q(`
      SELECT COALESCE(SUM("grossCents"),0)::bigint AS v
      FROM "Receipt"
      WHERE "userId"=$1 AND "date" >= CURRENT_DATE - INTERVAL '29 days'
    `, [userId])).rows[0].v;

    // --- Counts ---
    const customers = (await q(`SELECT COUNT(*)::int AS c FROM "Customer" WHERE "userId"=$1`, [userId])).rows[0].c ?? 0;
    const products  = (await q(`SELECT COUNT(*)::int AS c FROM "Product" WHERE "userId"=$1`, [userId])).rows[0].c ?? 0;
    const invoices  = (await q(`SELECT COUNT(*)::int AS c FROM "Invoice" WHERE "userId"=$1`, [userId])).rows[0].c ?? 0;
    const receipts  = (await q(`SELECT COUNT(*)::int AS c FROM "Receipt" WHERE "userId"=$1`, [userId])).rows[0].c ?? 0;

    // --- Recent Receipts ---
    const recentReceipts = (await q(`
      SELECT "id","receiptNo","date","grossCents","currency","createdAt","updatedAt"
      FROM "Receipt"
      WHERE "userId"=$1
      ORDER BY "createdAt" DESC NULLS LAST, "date" DESC NULLS LAST, "id" DESC
      LIMIT 10
    `, [userId])).rows;

    // --- Recent Invoices inkl. Kundenname ---
    const recentInvoices = (await q(`
      SELECT i."id", i."invoiceNo", i."issueDate", i."grossCents", i."currency",
             i."createdAt", i."updatedAt", c."name" AS "customerName"
      FROM "Invoice" i
      LEFT JOIN "Customer" c ON c."id" = i."customerId"
      WHERE i."userId"=$1
      ORDER BY i."createdAt" DESC NULLS LAST, i."issueDate" DESC NULLS LAST, i."id" DESC
      LIMIT 10
    `, [userId])).rows;

    // --- Settings (Design + Firma + Währung) ---
    const settings = await loadSettings(userId);

    return new Response(JSON.stringify({
      ok: true,
      data: {
        totals: { today, last7, last30 },
        counts: { customers, products, invoices, receipts },
        recentReceipts,
        recentInvoices,
        settings
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
      status: e.message === "Unauthorized" ? 401 : 500,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store"
      }
    });
  }
}
