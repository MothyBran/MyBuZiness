// app/api/invoices/nextNo/route.js
import { initDb, q } from "@/lib/db";

export async function GET() {
  try {
    await initDb();
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yymm = `${yy}${mm}`;

    // Suche höchste laufende Nummer für RN-YYMM-xyz
    const pattern = `^RN-${yymm}-(\\d{3})$`;
    const row = (await q(
      `SELECT COALESCE(MAX( (regexp_match("invoiceNo", $1))[1]::int ), 0) AS last
         FROM "Invoice"
        WHERE "invoiceNo" ~ $1`,
      [pattern]
    )).rows[0];

    const next = Number(row?.last || 0) + 1;
    const invoiceNo = `RN-${yymm}-${String(next).padStart(3, "0")}`;
    return new Response(JSON.stringify({ ok: true, invoiceNo, yymm }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}
