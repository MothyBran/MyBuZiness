// app/api/orders/route.js
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
      `SELECT id, "orderNo", "customerId", "orderDate", currency,
              "netCents", "taxCents", "grossCents", status, "signatureDataUrl",
              "createdAt", "updatedAt"
       FROM "Order"
       ORDER BY "createdAt" DESC NULLS LAST, "orderDate" DESC NULLS LAST`
    );
    return json({ ok: true, items: res.rows });
  } catch (e) {
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}

export async function POST(req) {
  await ensureSchemaOnce();
  const client = await (await import("pg")).Pool.prototype.connect.call(q,);
  try {
    const body = await req.json();
    const id = body?.id || uuid();
    const {
      orderNo,
      customerId,
      orderDate = null,
      currency = "EUR",
      netCents = 0,
      taxCents = 0,
      grossCents = 0,
      status = "draft",
      signatureDataUrl = null,
      items = [],
    } = body || {};

    await q("BEGIN");
    await q(
      `INSERT INTO "Order"
       (id, "orderNo", "customerId", "orderDate", currency,
        "netCents", "taxCents", "grossCents", status, "signatureDataUrl",
        "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW(), NOW())`,
      [
        id,
        orderNo || null,
        customerId || null,
        orderDate,
        currency,
        Number(netCents) || 0,
        Number(taxCents) || 0,
        Number(grossCents) || 0,
        status,
        signatureDataUrl,
      ]
    );

    if (Array.isArray(items) && items.length) {
      for (const it of items) {
        const itemId = it?.id || uuid();
        await q(
          `INSERT INTO "OrderItem"
           (id, "orderId", "productId", name, quantity,
            "unitPriceCents", "lineTotalCents", "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7, NOW(), NOW())`,
          [
            itemId,
            id,
            it?.productId || null,
            it?.name || null,
            it?.quantity != null ? Number(it.quantity) : null,
            it?.unitPriceCents != null ? Number(it.unitPriceCents) : null,
            it?.lineTotalCents != null ? Number(it.lineTotalCents) : null,
          ]
        );
      }
    }

    await q("COMMIT");
    return json({ ok: true, id, createdAt: now() }, 201);
  } catch (e) {
    await q("ROLLBACK").catch(() => {});
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  } finally {
    client?.release?.();
  }
}
