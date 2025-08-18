// app/api/products/[id]/route.js
import { initDb, q } from "@/lib/db";

export async function PUT(_request, { params }) {
  try {
    await initDb();
    const id = params.id;
    const body = await _request.json().catch(()=> ({}));

    const name = (body.name || "").trim();
    if (!name) return new Response(JSON.stringify({ ok:false, error:"Name/Bezeichnung ist erforderlich." }), { status: 400 });

    const kind = (body.kind || "product");
    const priceCents        = Number(body.priceCents || 0);
    const hourlyRateCents   = Number(body.hourlyRateCents || 0);
    const travelBaseCents   = Number(body.travelBaseCents || 0);
    const travelPerKmCents  = Number(body.travelPerKmCents || 0);

    const res = await q(
      `UPDATE "Product" SET
         "name"=$2, "sku"=$3, "description"=$4, "categoryCode"=$5, "kind"=$6,
         "priceCents"=$7, "hourlyRateCents"=$8, "travelBaseCents"=$9, "travelPerKmCents"=$10,
         "updatedAt"=now()
       WHERE "id"=$1`,
      [
        id, name, body.sku || null, body.description || null, body.categoryCode || null, kind,
        priceCents, hourlyRateCents, travelBaseCents, travelPerKmCents
      ]
    );
    if (res.rowCount === 0) return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden." }), { status: 404 });

    const row = (await q(`SELECT * FROM "Product" WHERE "id"=$1`, [id])).rows[0];
    return Response.json({ ok:true, data: row });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 400 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    await initDb();
    const res = await q(`DELETE FROM "Product" WHERE "id"=$1`, [params.id]);
    if (res.rowCount === 0) return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden." }), { status: 404 });
    return Response.json({ ok:true });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 400 });
  }
}
