// app/api/invoices/nextNo/route.js
import { initDb, q } from "@/lib/db";
import { getUser } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getUser();
    if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    const uId = session.role === "employee" && session.ownerId ? session.ownerId : session.id;

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
        WHERE "userId" = $2 AND "invoiceNo" ~ $1`,
      [pattern, uId]
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
