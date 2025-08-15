// app/api/invoices/[id]/route.js
import { initDb, q } from "@/lib/db";

export async function GET(_req, { params }) {
  try {
    await initDb();
    const { id } = params;

    const inv = (await q(
      `SELECT i.*, c."name" as "customerName", c."email" as "customerEmail"
       FROM "Invoice" i
       JOIN "Customer" c ON c."id" = i."customerId"
       WHERE i."id"=$1`, [id]
    )).rows[0];

    if (!inv) return new Response(JSON.stringify({ ok: false, error: "Nicht gefunden." }), { status: 404 });

    const items = (await q(
      `SELECT * FROM "InvoiceItem" WHERE "invoiceId"=$1 ORDER BY "id"`, [id]
    )).rows;

    return Response.json({ ok: true, data: { invoice: inv, items } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await initDb();
    const { id } = params;
    const body = await request.json().catch(() => ({}));
    const status = (body.status || "").trim(); // open | paid | canceled
    if (!["open","paid","canceled"].includes(status)) {
      return new Response(JSON.stringify({ ok: false, error: "Ungültiger Status." }), { status: 400 });
    }

    const res = await q(
      `UPDATE "Invoice"
       SET "status"=$1, "paidAt"=CASE WHEN $1='paid' THEN CURRENT_TIMESTAMP ELSE NULL END,
           "updatedAt"=CURRENT_TIMESTAMP
       WHERE "id"=$2
       RETURNING *`,
      [status, id]
    );

    if (res.rowCount === 0) return new Response(JSON.stringify({ ok: false, error: "Nicht gefunden." }), { status: 404 });

    return Response.json({ ok: true, data: res.rows[0] });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    await initDb();
    const { id } = params;
    const res = await q(`DELETE FROM "Invoice" WHERE "id"=$1`, [id]);
    if (res.rowCount === 0) return new Response(JSON.stringify({ ok: false, error: "Nicht gefunden." }), { status: 404 });
    return Response.json({ ok: true });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
}
