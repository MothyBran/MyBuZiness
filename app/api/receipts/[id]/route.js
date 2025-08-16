// app/api/receipts/[id]/route.js
import { initDb, q } from "@/lib/db";

export async function GET(_req, { params }) {
  try {
    await initDb();
    const { id } = params;

    const receipt = (await q(`SELECT * FROM "Receipt" WHERE "id"=$1`, [id])).rows[0];
    if (!receipt) {
      return new Response(JSON.stringify({ ok: false, error: "Nicht gefunden." }), { status: 404 });
    }

    const items = (await q(
      `SELECT * FROM "ReceiptItem" WHERE "receiptId"=$1 ORDER BY "id"`,
      [id]
    )).rows;

    return Response.json({ ok: true, data: { receipt, items } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    await initDb();
    const { id } = params;
    const res = await q(`DELETE FROM "Receipt" WHERE "id"=$1`, [id]); // Items werden per CASCADE gelöscht
    if (res.rowCount === 0) {
      return new Response(JSON.stringify({ ok: false, error: "Nicht gefunden." }), { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
}
