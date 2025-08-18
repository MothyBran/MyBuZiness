import { initDb, q } from "@/lib/db";

export async function PUT(req, { params }) {
  try {
    await initDb();
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { date, discountCents = 0 } = body;
    const items = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "Mindestens eine Position ist erforderlich." }), { status: 400 });
    }

    // Netto berechnen
    const netCents = items.reduce(
      (s, it) => s + Number(it.quantity || 0) * Number(it.unitPriceCents || 0) + Number(it.extraBaseCents || 0),
      0
    );
    const netAfterDiscount = Math.max(0, netCents - Number(discountCents || 0));

    // Steuer: wird bei Kleinunternehmer-Regelung in POST/Frontend schon deaktiviert
    const taxCents = body.vatExempt ? 0 : Math.round(netAfterDiscount * 0.19);
    const grossCents = netAfterDiscount + taxCents;

    // Receipt updaten
    await q(
      `UPDATE "Receipt"
       SET "date" = COALESCE($2, "date"),
           "discountCents" = $3,
           "netCents" = $4,
           "taxCents" = $5,
           "grossCents" = $6,
           "updatedAt" = NOW()
       WHERE "id" = $1`,
      [id, date || null, Number(discountCents || 0), netAfterDiscount, taxCents, grossCents]
    );

    // Alte Items löschen & neue einfügen
    await q(`DELETE FROM "ReceiptItem" WHERE "receiptId" = $1`, [id]);

    for (const it of items) {
      await q(
        `INSERT INTO "ReceiptItem" ("id","receiptId","productId","name","quantity","unitPriceCents","lineTotalCents","extraBaseCents","createdAt")
         VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,NOW())`,
        [
          id,
          it.productId || null,
          it.name,
          Number(it.quantity || 0),
          Number(it.unitPriceCents || 0),
          Number(it.quantity || 0) * Number(it.unitPriceCents || 0) + Number(it.extraBaseCents || 0),
          Number(it.extraBaseCents || 0),
        ]
      );
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error("PUT /receipts/[id] error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await initDb();
    const { id } = params;

    await q(`DELETE FROM "ReceiptItem" WHERE "receiptId" = $1`, [id]);
    await q(`DELETE FROM "Receipt" WHERE "id" = $1`, [id]);

    return Response.json({ ok: true });
  } catch (e) {
    console.error("DELETE /receipts/[id] error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}
