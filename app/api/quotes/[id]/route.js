// app/api/quotes/[id]/route.js
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
    const qh = await q(
      `SELECT id, "quoteNo", "customerId", "issueDate", "validUntil", currency,
              "netCents", "taxCents", "grossCents", status, "signatureDataUrl",
              "createdAt", "updatedAt"
       FROM "Quote" WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (qh.rowCount === 0) return json({ ok: false, error: "Not found" }, 404);

    const items = await q(
      `SELECT id, "quoteId", "productId", name, quantity,
              "unitPriceCents", "lineTotalCents", "createdAt", "updatedAt"
       FROM "QuoteItem" WHERE "quoteId" = $1 ORDER BY "createdAt" ASC`,
      [id]
    );

    return json({ ok: true, item: qh.rows[0], items: items.rows });
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
      quoteNo,
      customerId,
      issueDate,
      validUntil,
      currency,
      netCents,
      taxCents,
      grossCents,
      status,
      signatureDataUrl,
      items,
    } = body || {};

    await q("BEGIN");
    const upd = await q(
      `UPDATE "Quote"
         SET "quoteNo" = $2,
             "customerId" = $3,
             "issueDate" = $4,
             "validUntil" = $5,
             currency = $6,
             "netCents" = $7,
             "taxCents" = $8,
             "grossCents" = $9,
             status = $10,
             "signatureDataUrl" = $11,
             "updatedAt" = NOW()
       WHERE id = $1
       RETURNING id`,
      [
        id,
        quoteNo ?? null,
        customerId ?? null,
        issueDate ?? null,
        validUntil ?? null,
        currency ?? "EUR",
        netCents != null ? Number(netCents) : 0,
        taxCents != null ? Number(taxCents) : 0,
        grossCents != null ? Number(grossCents) : 0,
        status ?? "draft",
        signatureDataUrl ?? null,
      ]
    );
    if (upd.rowCount === 0) {
      await q("ROLLBACK");
      return json({ ok: false, error: "Not found" }, 404);
    }

    if (Array.isArray(items)) {
      await q(`DELETE FROM "QuoteItem" WHERE "quoteId" = $1`, [id]);
      for (const it of items) {
        const itemId = it?.id || uuid();
        await q(
          `INSERT INTO "QuoteItem"
           (id, "quoteId", "productId", name, quantity,
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
    await q(`DELETE FROM "QuoteItem" WHERE "quoteId" = $1`, [id]);
    const del = await q(`DELETE FROM "Quote" WHERE id = $1`, [id]);
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
