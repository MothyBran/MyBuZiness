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
    // Umsatz (Invoices + Receipts zusammen)
    const inv = await q(
      `SELECT COALESCE(SUM("grossCents"),0)::bigint AS total,
              COUNT(*)::int AS count
       FROM "Invoice"
       WHERE status <> 'draft'`
    );
    const rec = await q(
      `SELECT COALESCE(SUM("grossCents"),0)::bigint AS total,
              COUNT(*)::int AS count
       FROM "Receipt"`
    );

    // Offene Rechnungen
    const openInv = await q(
      `SELECT COUNT(*)::int AS openCount,
              COALESCE(SUM("grossCents"),0)::bigint AS openSum
       FROM "Invoice"
       WHERE status = 'open'`
    );

    // Kundenanzahl
    const customers = await q(`SELECT COUNT(*)::int AS c FROM "Customer"`);

    // Termine (nur Zukunft)
    const appointments = await q(
      `SELECT COUNT(*)::int AS upcoming
       FROM "Appointment"
       WHERE date >= CURRENT_DATE`
    );

    // Monatsumsatz (Invoices + Receipts)
    const monthly = await q(
      `SELECT to_char(COALESCE("issueDate", "createdAt"), 'YYYY-MM') AS ym,
              COALESCE(SUM("grossCents"),0)::bigint AS sumInv
       FROM "Invoice"
       WHERE status <> 'draft'
       GROUP BY ym
       UNION ALL
       SELECT to_char(COALESCE(date, "createdAt"), 'YYYY-MM') AS ym,
              COALESCE(SUM("grossCents"),0)::bigint AS sumRec
       FROM "Receipt"
       GROUP BY ym
       ORDER BY ym DESC
       LIMIT 12`
    );

    return json({
      ok: true,
      totals: {
        invoices: {
          count: inv.rows[0].count,
          sum: inv.rows[0].total,
        },
        receipts: {
          count: rec.rows[0].count,
          sum: rec.rows[0].total,
        },
        openInvoices: {
          count: openInv.rows[0].opencount,
          sum: openInv.rows[0].opensum,
        },
      },
      customers: customers.rows[0].c,
      upcomingAppointments: appointments.rows[0].upcoming,
      monthly: monthly.rows,
    });
  } catch (e) {
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}
