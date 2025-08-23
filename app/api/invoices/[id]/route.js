// app/api/invoices/[id]/route.js
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
    const inv = await q(
      `SELECT id, "invoiceNo", "customerId", "issueDate", "dueDate", currency,
              "netCents", "taxCents", "grossCents", "taxRate", note, status, "paidAt",
              "createdAt", "updatedAt"
       FROM "Invoice" WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (inv.rowCount === 0) return json({ ok: false, error: "Not found" }, 404);

    const items = await q(
      `SELECT id, "invoiceId", "productId", name, description, quantity,
              "unitPriceCents", "lineTotalCents", "extraBaseCents",
              "createdAt", "updatedAt"
       FROM "InvoiceItem"
       WHERE "invoiceId" = $1
       ORDER BY "createdAt" ASC`,
      [id]
    );

    return json({ ok: true, item: inv.rows[0], items: items.rows });
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
      invoiceNo,
      customerId,
      issueDate,
      dueDate,
      currency,
      netCents,
      taxCents,
      grossCents,
      taxRate,
      note,
      status,
      paidAt,
      items,
    } = body || {};

    await q("BEGIN");
    const upd = await q(
      `UPDATE "Invoice"
         SET "invoiceNo" = $2,
             "customerId" = $3,
             "issueDate" = $4,
             "dueDate" = $5,
             currency = $6,
             "netCents" = $7,
             "taxCents" = $8,
             "grossCents" = $9,
             "taxRate" = $10,
             note = $11,
             status = $12,
             "paidAt" = $13,
             "updatedAt" = NOW()
       WHERE id = $1
       RETURNING id`,
      [
        id,
        invoiceNo ?? null,
        customerId ?? null,
        issueDate ?? null,
        dueDate ?? null,
        currency ?? "EUR",
        netCents != null ? Number(netCents) : 0,
        taxCents != null ? Number(taxCents) : 0,
        grossCents != null ? Number(grossCents) : 0,
        taxRate != null ? Number(taxRate) : null,
        note ?? null,
        status ?? "draft",
        paidAt ?? null,
      ]
    );
    if (upd.rowCount === 0) {
      await q("ROLLBACK");
      return json({ ok: false, error: "Not found" }, 404);
    }

    if (Array.isArray(items)) {
      // einfache Strategie: alte Items löschen, neue einfügen
      await q(`DELETE FROM "InvoiceItem" WHERE "invoiceId" = $1`, [id]);
      for (const it of items) {
        const itemId = it?.id || uuid();
        await q(
          `INSERT INTO "InvoiceItem"
           (id, "invoiceId", "productId", name, description, quantity,
            "unitPriceCents", "lineTotalCents", "extraBaseCents",
            "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW(), NOW())`,
          [
            itemId,
            id,
            it?.productId || null,
            it?.name || null,
            it?.description || null,
            it?.quantity != null ? Number(it.quantity) : null,
            it?.unitPriceCents != null ? Number(it.unitPriceCents) : null,
            it?.lineTotalCents != null ? Number(it.lineTotalCents) : null,
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
    await q(`DELETE FROM "InvoiceItem" WHERE "invoiceId" = $1`, [id]);
    const del = await q(`DELETE FROM "Invoice" WHERE id = $1`, [id]);
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
