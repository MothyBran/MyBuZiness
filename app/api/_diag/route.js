// app/api/_diag/route.js
import { initDb, q } from "@/lib/db";

export async function GET() {
  try {
    await initDb();

    const invCount = (await q(`SELECT COUNT(*)::int AS n FROM "Invoice"`)).rows[0]?.n ?? 0;
    const recCount = (await q(`SELECT COUNT(*)::int AS n FROM "Receipt"`)).rows[0]?.n ?? 0;

    const invoices = (await q(
      `SELECT i."id", i."invoiceNo", i."issueDate", i."grossCents",
              i."createdAt", i."updatedAt", c."name" AS "customerName"
       FROM "Invoice" i
       LEFT JOIN "Customer" c ON c."id" = i."customerId"
       ORDER BY i."createdAt" DESC NULLS LAST, i."issueDate" DESC NULLS LAST
       LIMIT 5`
    )).rows;

    const receipts = (await q(
      `SELECT "id", "receiptNo", "date", "grossCents", "createdAt", "updatedAt"
       FROM "Receipt"
       ORDER BY "createdAt" DESC NULLS LAST, "date" DESC NULLS LAST
       LIMIT 5`
    )).rows;

    return new Response(JSON.stringify({
      ok: true,
      counts: { invoices: invCount, receipts: recCount },
      latest: { invoices, receipts },
    }), { status: 200, headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { "content-type": "application/json" }
    });
  }
}
