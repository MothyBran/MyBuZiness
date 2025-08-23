// app/api/receipts/[id]/route.js
import { q, ensureSchemaOnce, uuid, now } from "@/lib/db";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function GET(_req, { params }) {
  await ensureSchemaOnce();
  try {
    const { id } = params;
    const r = await q(
      `SELECT id, "receiptNo", date, "vatExempt", currency,
              "netCents", "taxCents", "grossCents", note,
              "discountCents", "createdAt", "updatedAt"
       FROM "Receipt" WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (r.rowCount === 0) return json({ ok: false, error: "Not found" }, 404);

    const items = await q(
      `SELECT id, "receiptId", name, quantity, "unitPriceCents", "lineTotalCents",
              "productId", "extraBaseCents", "createdAt", "updatedAt"
       FROM "ReceiptItem" WHERE "receiptId" = $1 ORDER BY "createdAt" ASC`,
      [id]
    );

    return json({ ok: true, item: r.rows[0], items: items.rows });
  } catch (e) {
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}

export async function PUT(req, { params }) {
  await ensureSchemaOnce();
  const client = await (await import("pg")).Pool.prototype.connect.call(q,);
  try {
    const { id } = params;
    const body = await req.json();
    const {
      receiptNo,
      date,
      vatExempt,
      currency,
      netCents,
      taxCents,
      grossCents,
      note,
      discountCents,
      items,
    } = body || {};

    await q("BEGIN");
    const upd = await q(
      `UPDATE "Receipt"
         SET "receiptNo" = $2,
             date = $3,
             "vatExempt" = $4,
             currency = $5,
             "netCents" = $6,
             "taxCents" = $7,
             "grossCents" = $8,
             note = $9,
             "discountCents" = $10,
             "updatedAt" = NOW()
       WHERE id = $1
       RETURNING id`,
      [
        id,
        receiptNo ?? null,
        date ?? null,
        vatExempt != null ? Boolean(vatExempt) : false,
        currency ?? "EUR",
        netCents != null ? Number(netCents) : 0,
        taxCents != null ? Number(taxCents) : 0,
        grossCents != null ? Number(grossCents) : 0,
        note ?? null,
        discountCents != null ? Number(discountCents) : 0,
      ]
    );
    if (upd.rowCount === 0) {
      await q("ROLLBACK");
      return json({ ok: false, error: "Not found" }, 404);
    }

    if (Array.isArray(items)) {
      await q(`DELETE FROM "ReceiptItem" WHERE "receiptId" = $1`, [id]);
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
    return json({ ok: true, id, updatedAt: now() });
  } catch (e) {
    await q("ROLLBACK").catch(() => {});
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  } finally {
    client?.release?.();
  }
}

export async function DELETE(_req, { params }) {
  await ensureSchemaOnce();
  const client = await (await import("pg")).Pool.prototype.connect.call(q,);
  try {
    const { id } = params;
    await q("BEGIN");
    await q(`DELETE FROM "ReceiptItem" WHERE "receiptId" = $1`, [id]);
    const del = await q(`DELETE FROM "Receipt" WHERE id = $1`, [id]);
    await q("COMMIT");
    if (del.rowCount === 0) return json({ ok: false, error: "Not found" }, 404);
    return json({ ok: true, deleted: id });
  } catch (e) {
    await q("ROLLBACK").catch(() => {});
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  } finally {
    client?.release?.();
  }
}
