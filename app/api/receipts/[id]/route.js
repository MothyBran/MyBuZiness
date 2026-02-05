// app/api/receipts/[id]/route.js
import { initDb, q } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { randomUUID } from "crypto";

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

/** Kopf + Items laden */
export async function GET(_req, { params }) {
  try {
    const userId = await requireUser();
    await initDb();
    const id = params.id;

    const head = (await q(
      `SELECT
         "id",
         COALESCE("receiptNo",'')               AS "receiptNo",
         "date",
         COALESCE("currency",'EUR')             AS "currency",
         COALESCE("netCents",0)::bigint         AS "netCents",
         COALESCE("taxCents",0)::bigint         AS "taxCents",
         COALESCE("grossCents",0)::bigint       AS "grossCents",
         COALESCE("discountCents",0)::bigint    AS "discountCents",
         COALESCE("note",'')                    AS "note",
         COALESCE("vatExempt",false)            AS "vatExempt",
         "createdAt","updatedAt"
       FROM "Receipt"
       WHERE "id"=$1 AND "userId"=$2
       LIMIT 1`,
      [id, userId]
    )).rows[0];

    if (!head) {
      return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden" }), { status:404 });
    }

    const items = (await q(
      `SELECT
         "id","receiptId",
         COALESCE("productId",NULL)             AS "productId",
         COALESCE("name",'')                    AS "name",
         COALESCE("quantity",0)                 AS "quantity",
         COALESCE("unitPriceCents",0)::bigint   AS "unitPriceCents",
         COALESCE("lineTotalCents",0)::bigint   AS "lineTotalCents",
         "createdAt","updatedAt"
       FROM "ReceiptItem"
       WHERE "receiptId"=$1
       ORDER BY "createdAt" ASC, "id" ASC`,
      [id]
    )).rows;

    return Response.json({ ok:true, data: { ...head, items } }, { headers: { "cache-control":"no-store" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}

/** Löschen */
export async function DELETE(_req, { params }) {
  try {
    const userId = await requireUser();
    await initDb();
    const id = params.id;
    // rely on CASCADE for items
    const res = await q(`DELETE FROM "Receipt" WHERE "id"=$1 AND "userId"=$2`, [id, userId]);
    if (res.rowCount === 0) {
      return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden" }), { status:404 });
    }
    return Response.json({ ok:true });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: e.message === "Unauthorized" ? 401 : 400 });
  }
}

/**
 * Bearbeiten (PUT)
 */
export async function PUT(req, { params }) {
  try {
    const userId = await requireUser();
    await initDb();
    const id = params.id;
    const body = await req.json().catch(()=> ({}));

    // Vorhandene Kopf-/Items holen (für Defaults & Summen) & Ownership Check
    const head = (await q(
      `SELECT "vatExempt","currency","discountCents"
       FROM "Receipt" WHERE "id"=$1 AND "userId"=$2 LIMIT 1`,
      [id, userId]
    )).rows[0];
    if (!head) {
      return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden" }), { status:404 });
    }

    const existingItems = (await q(
      `SELECT COALESCE("quantity",0) AS "quantity",
              COALESCE("unitPriceCents",0)::bigint AS "unitPriceCents"
       FROM "ReceiptItem" WHERE "receiptId"=$1`,
      [id]
    )).rows;

    // Neue Items (falls übergeben), sonst vorhandene Items für Summenberechnung nutzen
    const replaceItems = Array.isArray(body.items) && body.items.length > 0;
    const itemsForTotals = replaceItems
      ? body.items.map(it => ({
          quantity: toInt(it.quantity || 0),
          unitPriceCents: toInt(it.unitPriceCents || 0),
        }))
      : existingItems.map(it => ({
          quantity: toInt(it.quantity || 0),
          unitPriceCents: toInt(it.unitPriceCents || 0),
        }));

    // Summen neu rechnen
    const discountCents = toInt(body.discountCents ?? head.discountCents ?? 0);
    const vatExempt     = typeof body.vatExempt === "boolean" ? body.vatExempt : !!head.vatExempt;
    const currency      = body.currency ?? head.currency ?? "EUR";

    let net = 0;
    for (const it of itemsForTotals) {
      net += toInt(it.quantity || 0) * toInt(it.unitPriceCents || 0);
    }
    const netAfter = Math.max(0, net - discountCents);
    const taxRate  = vatExempt ? 0 : 19;
    const taxCents = Math.round(netAfter * (taxRate/100));
    const grossCents = netAfter + taxCents;

    await q("BEGIN");

    // Kopf aktualisieren
    await q(
      `UPDATE "Receipt" SET
         "receiptNo"     = COALESCE($1,"receiptNo"),
         "date"          = COALESCE($2::date,"date"),
         "currency"      = $3,
         "vatExempt"     = $4,
         "discountCents" = $5,
         "netCents"      = $6,
         "taxCents"      = $7,
         "grossCents"    = $8,
         "note"          = COALESCE($9,"note"),
         "updatedAt"     = now()
       WHERE "id"=$10 AND "userId"=$11`,
      [
        body.receiptNo ?? null,
        body.date ?? null,
        currency,
        vatExempt,
        discountCents,
        netAfter,
        taxCents,
        grossCents,
        body.note ?? null,
        id,
        userId
      ]
    );

    // Positionen ggf. ersetzen
    if (replaceItems) {
      await q(`DELETE FROM "ReceiptItem" WHERE "receiptId"=$1`, [id]);
      for (const it of body.items) {
        const itemId = randomUUID();
        const qty  = toInt(it.quantity || 0);
        const unit = toInt(it.unitPriceCents || 0);
        const line = qty * unit;
        await q(
          `INSERT INTO "ReceiptItem"
             ("id","receiptId","productId","name","quantity","unitPriceCents","lineTotalCents","createdAt","updatedAt")
           VALUES
             ($1,$2,$3,$4,$5,$6,$7, now(), now())`,
          [
            itemId,
            id,
            it.productId || null,
            (it.name || "Position").trim(),
            qty, unit, line
          ]
        );
      }
    }

    await q("COMMIT");
    return Response.json({ ok:true, data:{ id } });
  } catch (e) {
    try { await q("ROLLBACK"); } catch {}
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: e.message === "Unauthorized" ? 401 : 400 });
  }
}
