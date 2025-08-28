// app/api/finances/summary/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

// Hilfs-Query: Summe in Cent nach Zeitraum
const sumSql = (days) => `
  SELECT 
    COALESCE(SUM(CASE WHEN kind='income'  THEN amount_cents END),0)::int AS income_cents,
    COALESCE(SUM(CASE WHEN kind='expense' THEN amount_cents END),0)::int AS expense_cents
  FROM finance_transactions
  WHERE booked_on >= (CURRENT_DATE - INTERVAL '${days} days')
`;

export async function GET() {
  try {
    const [today, seven, thirty, mtd] = await Promise.all([
      q(sumSql(0)),
      q(sumSql(7)),
      q(sumSql(30)),
      q(`SELECT 
            COALESCE(SUM(CASE WHEN kind='income'  THEN amount_cents END),0)::int AS income_cents,
            COALESCE(SUM(CASE WHEN kind='expense' THEN amount_cents END),0)::int AS expense_cents
          FROM finance_transactions
          WHERE booked_on >= date_trunc('month', CURRENT_DATE)`),
    ]);

    // Optional: offene Rechnungen/Belege addieren, wenn Tabellen existieren
    let open_invoices_cents = 0;
    let open_receipts_cents = 0;
    try {
      const inv = await q(`
        SELECT COALESCE(SUM(total_cents),0)::int AS sum
        FROM invoices
        WHERE COALESCE(paid,false) = false
      `);
      open_invoices_cents = inv.rows[0]?.sum || 0;
    } catch {}
    try {
      const rec = await q(`
        SELECT COALESCE(SUM(total_cents),0)::int AS sum
        FROM receipts
        WHERE COALESCE(paid,false) = false
      `);
      open_receipts_cents = rec.rows[0]?.sum || 0;
    } catch {}

    const fmt = (r) => ({
      income_cents: r.rows[0]?.income_cents || 0,
      expense_cents: r.rows[0]?.expense_cents || 0,
      net_cents: (r.rows[0]?.income_cents || 0) - (r.rows[0]?.expense_cents || 0),
    });

    return NextResponse.json({
      ok: true,
      today: fmt(today),
      last_7_days: fmt(seven),
      last_30_days: fmt(thirty),
      month_to_date: fmt(mtd),
      open_cents: {
        invoices: open_invoices_cents,
        receipts: open_receipts_cents,
        total: open_invoices_cents + open_receipts_cents,
      }
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Summary fehlgeschlagen." }, { status: 500 });
  }
}
