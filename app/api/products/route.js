// app/api/products/route.js
import { q, ensureSchemaOnce, uuid, now } from "@/lib/db";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function GET() {
  await ensureSchemaOnce();
  try {
    const res = await q(
      `SELECT id, name, sku, "priceCents", currency, description,
              "createdAt", "updatedAt", kind, "categoryCode",
              "travelEnabled", "travelRateCents", "travelUnit", "travelBaseCents",
              "travelPerKmCents", "hourlyRateCents"
       FROM "Product"
       ORDER BY "createdAt" DESC NULLS LAST, name ASC`
    );
    return json({ ok: true, items: res.rows });
  } catch (e) {
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}

export async function POST(req) {
  await ensureSchemaOnce();
  try {
    const body = await req.json();
    const id = body?.id || uuid();

    const res = await q(
      `INSERT INTO "Product"
       (id, name, sku, "priceCents", currency, description,
        "createdAt", "updatedAt", kind, "categoryCode",
        "travelEnabled", "travelRateCents", "travelUnit", "travelBaseCents",
        "travelPerKmCents", "hourlyRateCents")
       VALUES
       ($1,$2,$3,$4,$5,$6,NOW(),NOW(),$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        id,
        body?.name ?? null,
        body?.sku ?? null,
        body?.priceCents != null ? Number(body.priceCents) : null,
        body?.currency ?? "EUR",
        body?.description ?? null,
        body?.kind ?? null,
        body?.categoryCode ?? null,
        body?.travelEnabled != null ? Boolean(body.travelEnabled) : null,
        body?.travelRateCents != null ? Number(body.travelRateCents) : null,
        body?.travelUnit ?? null,
        body?.travelBaseCents != null ? Number(body.travelBaseCents) : null,
        body?.travelPerKmCents != null ? Number(body.travelPerKmCents) : null,
        body?.hourlyRateCents != null ? Number(body.hourlyRateCents) : null,
      ]
    );

    return json({ ok: true, id: res.rows[0].id }, 201);
  } catch (e) {
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}
