// app/api/receipts/nextNo/route.js
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
    const prefix = `BN-${yy}${mm}-`;

    const last = await q(
      `SELECT COALESCE(MAX(
          NULLIF(substring("receiptNo" from '\\d+$'), '')::bigint
        ), 0)::bigint AS last
       FROM "Receipt"
       WHERE "userId" = $1 AND "receiptNo" LIKE $2`,
      [uId, `${prefix}%`]
    );

    const nextNum = Number(last.rows[0]?.last || 0) + 1;

    return new Response(JSON.stringify({ ok: true, nextNo: String(nextNum) }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}
