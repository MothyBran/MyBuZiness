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
    const items = (await q(
      `SELECT * FROM "InvoiceItem"
        WHERE "invoiceId"=$1
        ORDER BY "createdAt" ASC`,
      [id]
    )).rows;
    return Response.json({ ok:true, data: { ...inv, items } });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    await initDb();
    const id = params.id;
    const body = await req.json().catch(()=> ({}));

    // Erlaubte Felder (nur falls übermittelt)
    const patch = {};
    if (typeof body.invoiceNo === "string") patch.invoiceNo = body.invoiceNo.trim();
    if (body.issueDate != null) patch.issueDate = body.issueDate || null;
    if (body.dueDate   != null) patch.dueDate   = body.dueDate || null;
    if (typeof body.status === "string") patch.status = body.status.trim(); // falls Spalte vorhanden

    const keys = Object.keys(patch);
    if (keys.length === 0) return Response.json({ ok:true });

    // Versuch 1: inkl. "status"
    try {
      const sets = keys.map((k, i) => `"${k}"=$${i+1}`);
      const vals = keys.map(k => patch[k]);
      const res = await q(
        `UPDATE "Invoice" SET ${sets.join(", ")}, "updatedAt"=now() WHERE "id"=$${keys.length+1}`,
        [...vals, id]
      );
      if (res.rowCount === 0) return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden." }), { status:404 });
    } catch (err) {
      // Falls z. B. Spalte "status" nicht existiert → ohne "status" erneut versuchen
      if (keys.includes("status")) {
        const keys2 = keys.filter(k => k !== "status");
        if (keys2.length === 0) return Response.json({ ok:true });
        const sets2 = keys2.map((k, i) => `"${k}"=$${i+1}`);
        const vals2 = keys2.map(k => patch[k]);
        const res2 = await q(
          `UPDATE "Invoice" SET ${sets2.join(", ")}, "updatedAt"=now() WHERE "id"=$${keys2.length+1}`,
          [...vals2, id]
        );
        if (res2.rowCount === 0) return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden." }), { status:404 });
      } else {
        throw err;
      }
    }

    return Response.json({ ok:true });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 400 });
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
