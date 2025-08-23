// app/api/invoices/route.js
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
      `SELECT id, "invoiceNo", "customerId", "issueDate", "dueDate", currency,
              "netCents", "taxCents", "grossCents", "taxRate", note, status, "paidAt",
              "createdAt", "updatedAt"
       FROM "Invoice"
       ORDER BY "createdAt" DESC NULLS LAST, "issueDate" DESC NULLS LAST, "invoiceNo" DESC NULLS LAST`
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
      invoiceNo,
      customerId,
      issueDate,
      dueDate,
      currency = "EUR",
      netCents = 0,
      taxCents = 0,
      grossCents = 0,
      taxRate = null,
      note = null,
      status = "draft",
      paidAt = null,
      items = [],
    } = body || {};

    await q("BEGIN");
    await q(
      `INSERT INTO "Invoice"
       (id, "invoiceNo", "customerId", "issueDate", "dueDate", currency,
        "netCents", "taxCents", "grossCents", "taxRate", note, status, "paidAt",
        "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())`,
      [
        id,
        invoiceNo || null,
        customerId || null,
        issueDate || null,
        dueDate || null,
        currency,
        Number(netCents) || 0,
        Number(taxCents) || 0,
        Number(grossCents) || 0,
        taxRate !== null ? Number(taxRate) : null,
        note,
        status,
        paidAt || null,
      ]
    );

    if (Array.isArray(items) && items.length) {
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
    return json({ ok: true, id, createdAt: now() }, 201);
  } catch (e) {
    await q("ROLLBACK").catch(() => {});
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  } finally {
    client?.release?.();
  }
}
