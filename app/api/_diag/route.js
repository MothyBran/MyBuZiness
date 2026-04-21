// app/api/_diag/route.js
import { initDb, q } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await requireUser();
    await initDb();

    const invCount = (await q(`SELECT COUNT(*)::int AS n FROM "Invoice" WHERE "userId"=$1`, [userId])).rows[0]?.n ?? 0;
    const recCount = (await q(`SELECT COUNT(*)::int AS n FROM "Receipt" WHERE "userId"=$1`, [userId])).rows[0]?.n ?? 0;

    const invoices = (await q(
      `SELECT i."id", i."invoiceNo", i."issueDate", i."grossCents",
              i."createdAt", i."updatedAt", c."name" AS "customerName"
       FROM "Invoice" i
       LEFT JOIN "Customer" c ON c."id" = i."customerId"
       WHERE i."userId" = $1
       ORDER BY i."createdAt" DESC NULLS LAST, i."issueDate" DESC NULLS LAST
       LIMIT 5`,
      [userId]
    )).rows;

    const receipts = (await q(
      `SELECT "id", "receiptNo", "date", "grossCents", "createdAt", "updatedAt"
       FROM "Receipt"
       WHERE "userId" = $1
       ORDER BY "createdAt" DESC NULLS LAST, "date" DESC NULLS LAST
       LIMIT 5`,
      [userId]
    )).rows;

    return new Response(JSON.stringify({
      ok: true,
      counts: { invoices: invCount, receipts: recCount },
      latest: { invoices, receipts },
    }), { status: 200, headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: e.message === "Unauthorized" ? 401 : 500,
      headers: { "content-type": "application/json" }
    });
  }
}
