// app/api/products/[id]/route.js
import { q, ensureSchemaOnce, now } from "@/lib/db";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function GET(_req, { params }) {
  await ensureSchemaOnce();
  try {
    const { id } = params;
    const res = await q(
      `SELECT id, name, sku, "priceCents", currency, description,
              "createdAt", "updatedAt", kind, "categoryCode",
              "travelEnabled", "travelRateCents", "travelUnit", "travelBaseCents",
              "travelPerKmCents", "hourlyRateCents"
       FROM "Product"
       WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (res.rowCount === 0) return json({ ok: false, error: "Not found" }, 404);
    return json({ ok: true, item: res.rows[0] });
  } catch (e) {
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}

export async function PUT(req, { params }) {
  await ensureSchemaOnce();
  try {
    const { id } = params;
    const b = await req.json();

    const res = await q(
      `UPDATE "Product"
         SET name = $2,
             sku = $3,
             "priceCents" = $4,
             currency = $5,
             description = $6,
             kind = $7,
             "categoryCode" = $8,
             "travelEnabled" = $9,
             "travelRateCents" = $10,
             "travelUnit" = $11,
             "travelBaseCents" = $12,
             "travelPerKmCents" = $13,
             "hourlyRateCents" = $14,
             "updatedAt" = NOW()
       WHERE id = $1
       RETURNING id`,
      [
        id,
        b?.name ?? null,
        b?.sku ?? null,
        b?.priceCents != null ? Number(b.priceCents) : null,
        b?.currency ?? "EUR",
        b?.description ?? null,
        b?.kind ?? null,
        b?.categoryCode ?? null,
        b?.travelEnabled != null ? Boolean(b.travelEnabled) : null,
        b?.travelRateCents != null ? Number(b.travelRateCents) : null,
        b?.travelUnit ?? null,
        b?.travelBaseCents != null ? Number(b.travelBaseCents) : null,
        b?.travelPerKmCents != null ? Number(b.travelPerKmCents) : null,
        b?.hourlyRateCents != null ? Number(b.hourlyRateCents) : null,
      ]
    );

    if (res.rowCount === 0) return json({ ok: false, error: "Not found" }, 404);
    return json({ ok: true, id, updatedAt: now() });
  } catch (e) {
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}

export async function DELETE(_req, { params }) {
  await ensureSchemaOnce();
  try {
    const { id } = params;
    const del = await q(`DELETE FROM "Product" WHERE id = $1`, [id]);
    if (del.rowCount === 0) return json({ ok: false, error: "Not found" }, 404);
    return json({ ok: true, deleted: id });
  } catch (e) {
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}
