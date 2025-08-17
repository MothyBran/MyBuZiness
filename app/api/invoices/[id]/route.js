// app/api/invoices/[id]/route.js
import { initDb, q } from "@/lib/db";

export async function GET(_req, { params }) {
  try {
    await initDb();
    const { id } = params;

    const head = (await q(
      `SELECT i.*, c."name" AS "customerName",
              c."email" AS "customerEmail",
              c."phone" AS "customerPhone"
       FROM "Invoice" i
       JOIN "Customer" c ON c."id" = i."customerId"
       WHERE i."id"=$1`,
      [id]
    )).rows[0];

    if (!head) return new Response(JSON.stringify({ ok:false, error:"Not found" }), { status:404 });

    const items = (await q(
      `SELECT * FROM "InvoiceItem" WHERE "invoiceId"=$1 ORDER BY "createdAt" NULLS LAST, "id"`,
      [id]
    )).rows;

    return Response.json({ ok:true, data: { ...head, items } });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    await initDb();
    const { id } = params;
    const res = await q(`DELETE FROM "Invoice" WHERE "id"=$1`, [id]);
    if (res.rowCount === 0) return new Response(JSON.stringify({ ok:false, error:"Not found" }), { status:404 });
    return Response.json({ ok:true });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500 });
  }
}
