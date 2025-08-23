// app/api/receipts/nextNo/route.js
import { initDb, q } from "@/lib/db";

export async function GET() {
  try {
    await initDb();
    // Höchste Ziffernfolge aus receiptNo ziehen, +1
    const row = (await q(
      `SELECT COALESCE(MAX(
          NULLIF(regexp_replace("receiptNo", '\\D', '', 'g'), '')::bigint
        ), 0)::bigint AS last
       FROM "Receipt"`
    )).rows[0];

    const next = Number(row?.last || 0) + 1;
    return new Response(JSON.stringify({ ok: true, nextNo: String(next) }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}
