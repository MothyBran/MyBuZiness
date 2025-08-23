// app/api/receipts/nextNo/route.js
import { q, ensureSchemaOnce } from "@/lib/db";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });

function pad4(n) {
  return String(n).padStart(4, "0");
}

export async function GET() {
  await ensureSchemaOnce();
  try {
    const year = new Date().getFullYear();
    const { rows } = await q(
      `SELECT COUNT(*)::int AS c
       FROM "Receipt"
       WHERE EXTRACT(YEAR FROM COALESCE(date,"createdAt")) = $1`,
      [year]
    );
    const nextCount = (rows?.[0]?.c || 0) + 1;
    const nextNo = `RCPT-${year}-${pad4(nextCount)}`;
    return json({ ok: true, nextNo });
  } catch (e) {
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}
