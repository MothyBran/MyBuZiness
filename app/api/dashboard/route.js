// app/api/dashboard/route.js
import { initDb, q } from "@/lib/db";

export async function GET() {
  try {
    await initDb();

    // Umsätze (nur Belege, wie in deiner bisherigen Version)
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

    // Zähler
    const custs = (await q(`SELECT COUNT(*)::int AS c FROM "Customer"`)).rows[0].c ?? 0;
    const prods = (await q(`SELECT COUNT(*)::int AS c FROM "Product"`)).rows[0].c ?? 0;
    const invs  = (await q(`SELECT COUNT(*)::int AS c FROM "Invoice"`)).rows[0].c ?? 0;
    const recs  = (await q(`SELECT COUNT(*)::int AS c FROM "Receipt"`)).rows[0].c ?? 0;

    // Neueste Belege (robustes Sorting, falls createdAt NULL ist)
    const recentReceipts = (await q(`
      SELECT "id","receiptNo","date","grossCents","currency","createdAt","updatedAt"
      FROM "Receipt"
      ORDER BY "createdAt" DESC NULLS LAST, "date" DESC NULLS LAST, "id" DESC
      LIMIT 10
    `)).rows;

    // Bonus: Neueste Rechnungen (optional nutzbar im Dashboard)
    const recentInvoices = (await q(`
      SELECT i."id", i."invoiceNo", i."issueDate", i."grossCents", i."currency",
             i."createdAt", i."updatedAt", c."name" AS "customerName"
      FROM "Invoice" i
      LEFT JOIN "Customer" c ON c."id" = i."customerId"
      ORDER BY i."createdAt" DESC NULLS LAST, i."issueDate" DESC NULLS LAST, i."id" DESC
      LIMIT 10
    `)).rows;

    return new Response(JSON.stringify({
      ok: true,
      data: {
        totals: { today, last7, last30 },
        counts: { customers: custs, products: prods, invoices: invs, receipts: recs },
        recentReceipts,           // bleibt wie gehabt
        recentInvoices            // neu verfügbar (optional im UI nutzen)
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
