import { initDb, q } from "@/lib/db";

export async function PUT(req, { params }) {
  try {
    await initDb();
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { customerId, issueDate, dueDate, taxRate = 19 } = body;
    const items = Array.isArray(body.items) ? body.items : [];

    if (!customerId) {
      return new Response(JSON.stringify({ ok: false, error: "customerId fehlt." }), { status: 400 });
    }
    if (items.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "Mindestens eine Position ist erforderlich." }), { status: 400 });
    }

    // Netto/Steuer/Brutto berechnen
    const netCents = items.reduce(
      (s, it) => s + Number(it.quantity || 0) * Number(it.unitPriceCents || 0) + Number(it.extraBaseCents || 0),
      0
    );
    const taxCents = Math.round(netCents * (Number(taxRate || 0) / 100));
    const grossCents = netCents + taxCents;

    // Rechnung updaten
    await q(
      `UPDATE "Invoice"
       SET "customerId" = $2,
           "issueDate" = COALESCE($3, "issueDate"),
           "dueDate" = $4,
           "taxRate" = $5,
           "netCents" = $6,
           "taxCents" = $7,
           "grossCents" = $8,
           "updatedAt" = NOW()
       WHERE "id" = $1`,
      [id, customerId, issueDate || null, dueDate || null, Number(taxRate || 0), netCents, taxCents, grossCents]
    );

    // Items löschen & neu einfügen
    await q(`DELETE FROM "InvoiceItem" WHERE "invoiceId" = $1`, [id]);

    for (const it of items) {
      await q(
        `INSERT INTO "InvoiceItem" ("id","invoiceId","productId","name","description","quantity","unitPriceCents","lineTotalCents","extraBaseCents","createdAt")
         VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
        [
          id,
          it.productId || null,
          it.name,
          it.description || null,
          Number(it.quantity || 0),
          Number(it.unitPriceCents || 0),
          Number(it.quantity || 0) * Number(it.unitPriceCents || 0) + Number(it.extraBaseCents || 0),
          Number(it.extraBaseCents || 0),
        ]
      );
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error("PUT /invoices/[id] error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await initDb();
    const { id } = params;

    await q(`DELETE FROM "InvoiceItem" WHERE "invoiceId" = $1`, [id]);
    await q(`DELETE FROM "Invoice" WHERE "id" = $1`, [id]);

    return Response.json({ ok: true });
  } catch (e) {
    console.error("DELETE /invoices/[id] error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}
