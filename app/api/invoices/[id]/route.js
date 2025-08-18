// app/api/invoices/[id]/route.js
import { initDb, q } from "@/lib/db";

export async function GET(_req, { params }) {
  try {
    await initDb();
    const id = params.id;
    const inv = (await q(
      `SELECT i.*, c."name" AS "customerName"
       FROM "Invoice" i
       JOIN "Customer" c ON c."id" = i."customerId"
       WHERE i."id"=$1 LIMIT 1`,
      [id]
    )).rows[0];
    if (!inv) return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden." }), { status: 404 });
    const items = (await q(`SELECT * FROM "InvoiceItem" WHERE "invoiceId"=$1 ORDER BY "createdAt" ASC`, [id])).rows;
    return Response.json({ ok:true, data: { ...inv, items } });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    await initDb();
    const id = params.id;
    await q(`DELETE FROM "InvoiceItem" WHERE "invoiceId"=$1`, [id]);
    const res = await q(`DELETE FROM "Invoice" WHERE "id"=$1`, [id]);
    if (res.rowCount === 0) return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden." }), { status: 404 });
    return Response.json({ ok:true });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 400 });
  }
}
