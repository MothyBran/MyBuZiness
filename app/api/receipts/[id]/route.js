// app/api/receipts/[id]/route.js
import { initDb, q } from "@/lib/db";
import { randomUUID } from "crypto";

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

export async function GET(_req, { params }) {
  try {
    await initDb();
    const id = params.id;
    const r = (await q(`SELECT * FROM "Receipt" WHERE "id"=$1 LIMIT 1`, [id])).rows[0];
    if (!r) return new Response(JSON.stringify({ ok: false, error: "Nicht gefunden." }), { status: 404 });
    const items = (await q(`SELECT * FROM "ReceiptItem" WHERE "receiptId"=$1 ORDER BY "createdAt" ASC`, [id])).rows;
    return Response.json({ ok: true, data: { ...r, items } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    await initDb();
    const id = params.id;
    await q(`DELETE FROM "ReceiptItem" WHERE "receiptId"=$1`, [id]);
    const res = await q(`DELETE FROM "Receipt" WHERE "id"=$1`, [id]);
    if (res.rowCount === 0) return new Response(JSON.stringify({ ok: false, error: "Nicht gefunden." }), { status: 404 });
    return Response.json({ ok: true });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
}

/**
 * PUT – Bearbeiten: rechnet Summen neu und ersetzt die Positionen.
 * Body:
 * {
 *   receiptNo?: string,
 *   date?: 'YYYY-MM-DD',
 *   currency?: string,
 *   vatExempt?: boolean,
 *   discountCents?: number,
 *   customerId?: string|null, // optional
 *   items: [{ productId?: string|null, name: string, quantity: number, unitPriceCents: number }]
 * }
 */
export async function PUT(req, { params }) {
  try {
    await initDb();
    const id = params.id;
    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "Mindestens eine Position ist erforderlich." }), { status: 400 });
    }

    // Summen
    let net = 0;
    for (const it of items) {
      net += toInt(it.quantity || 0) * toInt(it.unitPriceCents || 0);
    }
    const discountCents = toInt(body.discountCents || 0);
    const netAfter = Math.max(0, net - discountCents);
    const vatExempt = !!body.vatExempt;
    const taxRate = vatExempt ? 0 : 19;
    const taxCents = Math.round(netAfter * (taxRate / 100));
    const grossCents = netAfter + taxCents;

    await q("BEGIN");

    // optional: customerId
    let withCustomer = false;
    try { await q(`SELECT "customerId" FROM "Receipt" WHERE false`); withCustomer = true; } catch {}

    const setParts = [
      `"receiptNo" = COALESCE($1,"receiptNo")`,
      `"date"      = COALESCE($2::date,"date")`,
      `"currency"  = COALESCE($3,"currency")`,
      `"vatExempt" = COALESCE($4,"vatExempt")`,
      `"discountCents" = $5`,
      `"netCents"  = $6`,
      `"taxCents"  = $7`,
      `"grossCents"= $8`,
      `"updatedAt" = now()`
    ];
    const paramsArr = [
      (body.receiptNo ?? null),
      (body.date ?? null),
      (body.currency ?? null),
      (typeof body.vatExempt === "boolean" ? body.vatExempt : null),
      discountCents,
      netAfter,
      taxCents,
      grossCents
    ];

    if (withCustomer) {
      setParts.splice(3, 0, `"customerId" = $9`);
      paramsArr.splice(4, 0, (body.customerId ?? null));
    }

    const sql = `UPDATE "Receipt" SET ${setParts.join(", ")} WHERE "id"=$${paramsArr.length + 1}`;
    await q(sql, [...paramsArr, id]);

    // Items neu anlegen
    await q(`DELETE FROM "ReceiptItem" WHERE "receiptId"=$1`, [id]);
    for (const it of items) {
      const itemId = randomUUID();
      await q(
        `INSERT INTO "ReceiptItem"
           ("id","receiptId","productId","name","quantity","unitPriceCents","lineTotalCents","createdAt","updatedAt")
         VALUES
           ($1,$2,$3,$4,$5,$6,$7,now(),now())`,
        [
          itemId,
          id,
          it.productId || null,
          (it.name || "Position").trim(),
          toInt(it.quantity || 0),
          toInt(it.unitPriceCents || 0),
          toInt(it.quantity || 0) * toInt(it.unitPriceCents || 0),
        ]
      );
    }

    await q("COMMIT");
    return Response.json({ ok: true, data: { id } });
  } catch (e) {
    try { await q("ROLLBACK"); } catch {}
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
}
