// app/api/_dbcheck/route.js
import { initDb, q } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await initDb();

    // Zähler
    const invCount = (await q(`SELECT COUNT(*)::int AS n FROM "Invoice"`)).rows[0]?.n ?? 0;
    const invItemCount = (await q(`SELECT COUNT(*)::int AS n FROM "InvoiceItem"`)).rows[0]?.n ?? 0;
    const recCount = (await q(`SELECT COUNT(*)::int AS n FROM "Receipt"`)).rows[0]?.n ?? 0;
    const recItemCount = (await q(`SELECT COUNT(*)::int AS n FROM "ReceiptItem"`)).rows[0]?.n ?? 0;

    // Letzte Datensätze (wirklich aus DB)
    const latestInvoices = (await q(`
      SELECT i."id", i."invoiceNo", i."issueDate", i."grossCents", i."createdAt", c."name" AS "customerName"
      FROM "Invoice" i
      LEFT JOIN "Customer" c ON c."id" = i."customerId"
      ORDER BY i."createdAt" DESC NULLS LAST, i."issueDate" DESC NULLS LAST, i."id" DESC
      LIMIT 5
    `)).rows;

    const latestReceipts = (await q(`
      SELECT "id","receiptNo","date","grossCents","createdAt"
      FROM "Receipt"
      ORDER BY "createdAt" DESC NULLS LAST, "date" DESC NULLS LAST, "id" DESC
      LIMIT 5
    `)).rows;

    // Spalten-Check (erwischt Schema-Mismatches)
    const colQuery = `
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_name IN ('Invoice','InvoiceItem','Receipt','ReceiptItem')
      ORDER BY table_name, column_name
    `;
    const columns = (await q(colQuery)).rows;

    // Minimale DB-Infos (keine Secrets)
    const dbName = (await q(`SELECT current_database() AS db`)).rows[0]?.db;

    return new Response(JSON.stringify({
      ok: true,
      db: { currentDatabase: dbName },
      counts: {
        Invoice: invCount,
        InvoiceItem: invItemCount,
        Receipt: recCount,
        ReceiptItem: recItemCount,
      },
      latest: { invoices: latestInvoices, receipts: latestReceipts },
      columns
    }), { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}
