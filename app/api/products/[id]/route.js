// app/api/products/[id]/route.js
import { initDb, q } from "@/lib/db";

function toInt(v, d=0){ const n=Number(v); return Number.isFinite(n)?Math.trunc(n):d; }

export async function PUT(request, { params }) {
  try {
    await initDb();
    const { id } = params;
    const body = await request.json().catch(() => ({}));

    const name = (body.name || "").trim();
    if (!name) {
      return new Response(JSON.stringify({ ok: false, error: "Name ist erforderlich." }), { status: 400 });
    }

    const sku = (body.sku || "").trim() || null;
    const priceCents = toInt(body.priceCents, 0);
    const currency = (body.currency || "EUR").trim();
    const description = (body.description || "").trim() || null;

    // Neue Felder:
    const kind = (body.kind === "product" ? "product" : "service");
    const categoryCode = (body.categoryCode || "").trim() || null;
    const travelEnabled = !!body.travelEnabled;
    const travelRateCents = toInt(body.travelRateCents, 0);
    const travelUnit = (body.travelUnit || "km").trim();

    const res = await q(
      `UPDATE "Product"
       SET "name"=$1,"sku"=$2,"priceCents"=$3,"currency"=$4,"description"=$5,
           "kind"=$6,"categoryCode"=$7,"travelEnabled"=$8,"travelRateCents"=$9,"travelUnit"=$10,
           "updatedAt"=CURRENT_TIMESTAMP
       WHERE "id"=$11
       RETURNING *`,
      [name, sku, priceCents, currency, description, kind, categoryCode, travelEnabled, travelRateCents, travelUnit, id]
    );

    if (res.rowCount === 0) {
      return new Response(JSON.stringify({ ok: false, error: "Nicht gefunden." }), { status: 404 });
    }
    return Response.json({ ok: true, data: res.rows[0] });
  } catch (e) {
    if (String(e).includes("duplicate key")) {
      return new Response(JSON.stringify({ ok: false, error: "SKU ist bereits vergeben." }), { status: 400 });
    }
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    await initDb();
    const { id } = params;
    const res = await q(`DELETE FROM "Product" WHERE "id"=$1`, [id]);
    if (res.rowCount === 0) {
      return new Response(JSON.stringify({ ok: false, error: "Nicht gefunden." }), { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
}
