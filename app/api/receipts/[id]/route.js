// app/api/receipts/[id]/route.js
import { initDb, q, pool, uuid } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

/** Kopf + Items laden */
export async function GET(_req, { params }) {
  try {
    const userId = await requireUser();
    await initDb();
    const { id } = await params;

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
         "givenCents", "changeCents", "paymentMethod",
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
         COALESCE("baseCents",0)::bigint        AS "baseCents",
         COALESCE("lineTotalCents",0)::bigint   AS "lineTotalCents",
         COALESCE("taxRate",19)                 AS "taxRate",
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
  const client = await pool.connect();
  try {
    const userId = await requireUser();
    await initDb();
    const { id } = await params;

    await client.query("BEGIN");

    // Lösche etwaige verknüpfte Transaktionen in der Finanzen-Auswertung
    await client.query(`DELETE FROM "FinanceTransaction" WHERE "receiptId"=$1 AND "userId"=$2`, [id, userId]);

    // rely on CASCADE for items
    const res = await client.query(`DELETE FROM "Receipt" WHERE "id"=$1 AND "userId"=$2`, [id, userId]);
    if (res.rowCount === 0) {
      await client.query("ROLLBACK");
      return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden" }), { status:404 });
    }

    await client.query("COMMIT");
    return Response.json({ ok:true });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: e.message === "Unauthorized" ? 401 : 400 });
  } finally {
    client.release();
  }
}

/**
 * Bearbeiten (PUT)
 */
export async function PUT(req, { params }) {
  const client = await pool.connect();
  try {
    const userId = await requireUser();
    await initDb();
    const { id } = await params;
    const body = await req.json().catch(()=> ({}));

    await client.query("BEGIN");

    // Vorhandene Kopf-/Items holen (für Defaults & Summen) & Ownership Check
    const head = (await client.query(
      `SELECT "vatExempt","currency","discountCents"
       FROM "Receipt" WHERE "id"=$1 AND "userId"=$2 LIMIT 1`,
      [id, userId]
    )).rows[0];
    if (!head) {
      await client.query("ROLLBACK");
      return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden" }), { status:404 });
    }

    const existingItems = (await client.query(
      `SELECT COALESCE("quantity",0) AS "quantity",
              COALESCE("unitPriceCents",0)::bigint AS "unitPriceCents",
              COALESCE("baseCents",0)::bigint AS "baseCents"
       FROM "ReceiptItem" WHERE "receiptId"=$1`,
      [id]
    )).rows;

    // Neue Items (falls übergeben), sonst vorhandene Items für Summenberechnung nutzen
    const replaceItems = Array.isArray(body.items) && body.items.length > 0;
    const itemsForTotals = replaceItems
      ? body.items.map(it => ({
          quantity: Number(it.quantity || 0),
          unitPriceCents: toInt(it.unitPriceCents || 0),
          baseCents: toInt(it.baseCents || 0),
          taxRate: it.taxRate !== undefined ? Number(it.taxRate) : 19,
        }))
      : existingItems.map(it => ({
          quantity: Number(it.quantity || 0),
          unitPriceCents: toInt(it.unitPriceCents || 0),
          baseCents: toInt(it.baseCents || 0),
          taxRate: it.taxRate !== undefined ? Number(it.taxRate) : 19,
        }));

    // Summen neu rechnen
    const discountCents = toInt(body.discountCents ?? head.discountCents ?? 0);
    const vatExempt     = typeof body.vatExempt === "boolean" ? body.vatExempt : !!head.vatExempt;
    const currency      = body.currency ?? head.currency ?? "EUR";
    const givenCents    = body.givenCents != null ? toInt(body.givenCents) : null;
    const changeCents   = body.changeCents != null ? toInt(body.changeCents) : null;
    const paymentMethod = body.paymentMethod || null;

    let totalGross = 0;
    let totalTax = 0;
    for (const it of itemsForTotals) {
      let itemGross = Math.round(Number(it.quantity || 0) * toInt(it.unitPriceCents || 0)) + toInt(it.baseCents || 0);
      totalGross += itemGross;

      let itemTaxRate = it.taxRate !== undefined ? Number(it.taxRate) : 19;
      if (vatExempt) itemTaxRate = 0;

      const itemNet = Math.round(itemGross / (1 + (itemTaxRate / 100)));
      const itemTax = itemGross - itemNet;
      totalTax += itemTax;
    }

    const grossAfterDiscount = Math.max(0, totalGross - discountCents);
    const taxCents = totalGross > 0 ? Math.round(totalTax * (grossAfterDiscount / totalGross)) : 0;
    const grossCents = grossAfterDiscount;
    const netAfter = grossCents - taxCents;

    // Kopf aktualisieren
    await client.query(
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
         "givenCents"    = COALESCE($10,"givenCents"),
         "changeCents"   = COALESCE($11,"changeCents"),
         "paymentMethod" = COALESCE($12,"paymentMethod"),
         "updatedAt"     = now()
       WHERE "id"=$13 AND "userId"=$14`,
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
        givenCents,
        changeCents,
        paymentMethod,
        id,
        userId
      ]
    );

    // Positionen ggf. ersetzen
    if (replaceItems) {
      await client.query(`DELETE FROM "ReceiptItem" WHERE "receiptId"=$1`, [id]);
      const flat = [];
      const rows = [];
      for (let i = 0; i < body.items.length; i++) {
        const it = body.items[i];
        const itemId = uuid();
        const qty  = Number(it.quantity || 0);
        const unit = toInt(it.unitPriceCents || 0);
        const base = toInt(it.baseCents || 0);
        const line = Math.round(qty * unit) + base;
        const taxRate = it.taxRate !== undefined ? Number(it.taxRate) : 19;

        const offset = i * 9;
        rows.push(`($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${offset + 5},$${offset + 6},$${offset + 7},$${offset + 8},$${offset + 9},now(),now())`);
        flat.push(itemId, id, it.productId || null, (it.name || "Position").trim(), qty, unit, base, line, taxRate);
      }

      if (rows.length > 0) {
          await client.query(
            `INSERT INTO "ReceiptItem"
               ("id","receiptId","productId","name","quantity","unitPriceCents","baseCents","lineTotalCents","taxRate","createdAt","updatedAt")
             VALUES ${rows.join(",")}`,
            flat
          );
      }
    }

    await client.query("COMMIT");
    return Response.json({ ok:true, data:{ id } });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    if (e.code === '23505' && e.constraint === 'Receipt_receiptNo_userId_key') {
      return new Response(JSON.stringify({ ok:false, error:"Diese Beleg-Nr. wird bereits verwendet. Bitte wähle eine andere." }), { status: 400 });
    }
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: e.message === "Unauthorized" ? 401 : 400 });
  } finally {
    client.release();
  }
}
