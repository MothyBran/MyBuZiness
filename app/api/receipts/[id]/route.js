// app/api/receipts/[id]/route.js
import { initDb, q, uuid } from "@/lib/db";
import { NextResponse } from "next/server";

async function getOne(id) {
  const sql = `
    SELECT
      r.*,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', ri."id",
              'productId', ri."productId",
              'name', ri."name",
              'quantity', ri."quantity",
              'unitPriceCents', ri."unitPriceCents",
              'lineTotalCents', ri."lineTotalCents"
            ) ORDER BY ri."id"
          )
          FROM "ReceiptItem" ri
          WHERE ri."receiptId" = r."id"
        ),
        '[]'::json
      ) AS items
    FROM "Receipt" r
    WHERE r."id" = $1
  `;
  const row = (await q(sql, [id])).rows?.[0] || null;
  return row;
}

export async function GET(_req, { params }) {
  try {
    await initDb();
    const row = await getOne(params.id);
    if (!row) return NextResponse.json({ ok:false, error:"Not found" }, { status:404 });
    return NextResponse.json({ ok:true, data: row });
  } catch (e) {
    return NextResponse.json({ ok:false, error: String(e) }, { status:500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    await initDb();
    const id = params.id;
    await q(`BEGIN`);
    await q(`DELETE FROM "ReceiptItem" WHERE "receiptId" = $1`, [id]);
    const res = await q(`DELETE FROM "Receipt" WHERE "id" = $1`, [id]);
    await q(`COMMIT`);
    if (res.rowCount === 0) return NextResponse.json({ ok:false, error:"Not found" }, { status:404 });
    return NextResponse.json({ ok:true });
  } catch (e) {
    await q(`ROLLBACK`).catch(()=>{});
    return NextResponse.json({ ok:false, error: String(e) }, { status:500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await initDb();
    const id = params.id;
    const body = await req.json().catch(()=> ({}));

    // Erwartet Cent-Werte bereits als Cent!
    const {
      receiptNo = null,
      date,
      vatExempt = true,
      currency = "EUR",
      discountCents = 0,
      items = [],
    } = body;

    const itemsSafe = Array.isArray(items) ? items.map(it => ({
      productId: it.productId ?? null,
      name: String(it.name || "").trim(),
      quantity: Number(it.quantity || 0),
      unitPriceCents: Number(it.unitPriceCents || 0),
    })) : [];

    const netCents = itemsSafe.reduce((s, it) => s + it.quantity * it.unitPriceCents, 0);
    const discount = Number(discountCents || 0);
    const netAfterDiscount = Math.max(0, netCents - discount);
    const taxCents = vatExempt ? 0 : Math.round(netAfterDiscount * 0.19);
    const grossCents = netAfterDiscount + taxCents;

    await q(`BEGIN`);
    const upd = await q(
      `UPDATE "Receipt"
       SET "receiptNo" = $2,
           "date" = COALESCE($3, "date"),
           "vatExempt" = $4,
           "currency" = $5,
           "netCents" = $6,
           "taxCents" = $7,
           "grossCents" = $8,
           "discountCents" = $9
       WHERE "id" = $1`,
      [id, receiptNo, date || null, !!vatExempt, currency, netAfterDiscount, taxCents, grossCents, discount]
    );
    if (upd.rowCount === 0) {
      await q(`ROLLBACK`);
      return NextResponse.json({ ok:false, error:"Not found" }, { status:404 });
    }

    // Items ersetzen
    await q(`DELETE FROM "ReceiptItem" WHERE "receiptId" = $1`, [id]);
    for (const it of itemsSafe) {
      await q(
        `INSERT INTO "ReceiptItem"
         ("id","receiptId","productId","name","quantity","unitPriceCents","lineTotalCents")
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [uuid(), id, it.productId, it.name, it.quantity, it.unitPriceCents, it.quantity * it.unitPriceCents]
      );
    }
    await q(`COMMIT`);

    const row = await getOne(id);
    return NextResponse.json({ ok:true, data: row });
  } catch (e) {
    await q(`ROLLBACK`).catch(()=>{});
    return NextResponse.json({ ok:false, error: String(e) }, { status:500 });
  }
}
