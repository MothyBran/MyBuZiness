import { initDb, q } from "@/lib/db";

export async function GET() {
  try {
    await initDb();

    const today = (await q(`SELECT COALESCE(SUM("grossCents"),0)::bigint AS v FROM "Receipt" WHERE "date"=CURRENT_DATE`)).rows[0].v;
    const last7 = (await q(`SELECT COALESCE(SUM("grossCents"),0)::bigint AS v FROM "Receipt" WHERE "date">=CURRENT_DATE - INTERVAL '6 days'`)).rows[0].v;
    const last30 = (await q(`SELECT COALESCE(SUM("grossCents"),0)::bigint AS v FROM "Receipt" WHERE "date">=CURRENT_DATE - INTERVAL '29 days'`)).rows[0].v;

    const custs = (await q(`SELECT COUNT(*)::int AS c FROM "Customer"`)).rows[0].c ?? 0;
    const prods = (await q(`SELECT COUNT(*)::int AS c FROM "Product"`)).rows[0].c ?? 0;
    const invs  = (await q(`SELECT COUNT(*)::int AS c FROM "Invoice"`)).rows[0].c ?? 0;
    const recs  = (await q(`SELECT COUNT(*)::int AS c FROM "Receipt"`)).rows[0].c ?? 0;

    const recentReceipts = (await q(
      `SELECT "id","receiptNo","date","grossCents","currency"
       FROM "Receipt" ORDER BY "createdAt" DESC LIMIT 10`
    )).rows;

    return Response.json({
      ok: true,
      data: {
        totals: { today, last7, last30 },
        counts: { customers: custs, products: prods, invoices: invs, receipts: recs },
        recentReceipts
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 500 });
  }
}
