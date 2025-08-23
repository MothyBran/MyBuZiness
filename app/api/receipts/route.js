// app/api/receipts/route.js
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
      `SELECT id, "receiptNo", date, "vatExempt", currency,
              "netCents", "taxCents", "grossCents", note,
              "discountCents", "createdAt", "updatedAt"
       FROM "Receipt"
       ORDER BY date DESC NULLS LAST, "createdAt" DESC NULLS LAST, "receiptNo" DESC NULLS LAST`
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
      receiptNo,
      date = null,
      vatExempt = false,
      currency = "EUR",
      netCents = 0,
      taxCents = 0,
      grossCents = 0,
      note = null,
      discountCents = 0,
      items = [],
    } = body || {};

    await q("BEGIN");
    await q(
      `INSERT INTO "Receipt"
       (id, "receiptNo", date, "vatExempt", currency,
        "netCents", "taxCents", "grossCents", note, "discountCents",
        "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW(), NOW())`,
      [
        id,
        receiptNo || null,
        date,
        Boolean(vatExempt),
        currency,
        Number(netCents) || 0,
        Number(taxCents) || 0,
        Number(grossCents) || 0,
        note,
        Number(discountCents) || 0,
      ]
    );

    if (Array.isArray(items) && items.length) {
      for (const it of items) {
        const itemId = it?.id || uuid();
        await q(
          `INSERT INTO "ReceiptItem"
           (id, "receiptId", name, quantity, "unitPriceCents", "lineTotalCents",
            "productId", "extraBaseCents", "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW(), NOW())`,
          [
            itemId,
            id,
            it?.name || null,
            it?.quantity != null ? Number(it.quantity) : null,
            it?.unitPriceCents != null ? Number(it.unitPriceCents) : null,
            it?.lineTotalCents != null ? Number(it.lineTotalCents) : null,
            it?.productId || null,
            it?.extraBaseCents != null ? Number(it.extraBaseCents) : null,
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
