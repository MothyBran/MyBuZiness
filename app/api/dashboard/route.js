// app/api/dashboard/route.js
import { q, ensureSchemaOnce } from "@/lib/db";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function GET() {
  await ensureSchemaOnce();
  try {
    // Totals: Rechnungen (ohne drafts)
    const inv = await q(
      `SELECT COALESCE(SUM("grossCents"),0)::bigint AS sum, COUNT(*)::int AS count
       FROM "Invoice"
       WHERE status <> 'draft'`
    );

    // Totals: Quittungen
    const rec = await q(
      `SELECT COALESCE(SUM("grossCents"),0)::bigint AS sum, COUNT(*)::int AS count
       FROM "Receipt"`
    );

    // Offene Rechnungen – zuerst über View, Fallback falls View fehlt
    let openInv;
    try {
      openInv = await q(`SELECT open_count AS count, open_sum AS sum FROM view_open_invoices_summary`);
    } catch {
      openInv = await q(
        `SELECT COUNT(*)::int AS count, COALESCE(SUM("grossCents"),0)::bigint AS sum
         FROM "Invoice" WHERE status = 'open'`
      );
    }

    // Kundenanzahl
    const customers = await q(`SELECT COUNT(*)::int AS c FROM "Customer"`);

    // Bevorstehende Termine (ab heute)
    const appts = await q(
      `SELECT COUNT(*)::int AS upcoming FROM "Appointment" WHERE date >= CURRENT_DATE`
    );

    // Monatliche Umsätze – View bevorzugt, sonst Fallback
    let monthly;
    try {
      monthly = await q(
        `SELECT ym, gross_cents::bigint AS sum
         FROM view_monthly_revenue
         ORDER BY ym DESC
         LIMIT 12`
      );
    } catch {
      monthly = await q(
        `SELECT ym, SUM(sum)::bigint AS sum FROM (
           SELECT to_char(COALESCE("issueDate","createdAt"), 'YYYY-MM') AS ym,
                  COALESCE(SUM("grossCents"),0)::bigint AS sum
           FROM "Invoice" WHERE status <> 'draft'
           GROUP BY 1
           UNION ALL
           SELECT to_char(COALESCE(date,"createdAt"), 'YYYY-MM') AS ym,
                  COALESCE(SUM("grossCents"),0)::bigint AS sum
           FROM "Receipt" GROUP BY 1
         ) t
         GROUP BY ym
         ORDER BY ym DESC
         LIMIT 12`
      );
    }

    return json({
      ok: true,
      totals: {
        invoices: { count: inv.rows[0].count, sum: inv.rows[0].sum },
        receipts: { count: rec.rows[0].count, sum: rec.rows[0].sum },
        openInvoices: { count: openInv.rows[0].count, sum: openInv.rows[0].sum },
      },
      customers: customers.rows[0].c,
      upcomingAppointments: appts.rows[0].upcoming,
      monthly: monthly.rows, // [{ ym, sum }]
    });
  } catch (e) {
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}
