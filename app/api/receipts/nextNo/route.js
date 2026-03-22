// app/api/receipts/nextNo/route.js
import { initDb, q } from "@/lib/db";

import { getUser } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getUser();
    if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    const uId = session.role === "employee" && session.ownerId ? session.ownerId : session.id;

    await initDb();
    // Höchste Ziffernfolge aus receiptNo ziehen, +1
    const row = (await q(
      `SELECT COALESCE(MAX(
          NULLIF(substring("receiptNo" from '\\d+$'), '')::bigint
        ), 0)::bigint AS last
       FROM "Receipt"
       WHERE "userId" = $1`, [uId]
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
