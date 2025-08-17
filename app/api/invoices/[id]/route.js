// app/api/invoices/[id]/route.js
import { initDb, q, uuid } from "@/lib/db";
import { NextResponse } from "next/server";

async function getOne(id) {
  const sql = `
    SELECT
      i.*,
      c."name" AS "customerName",
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', ii."id",
              'productId', ii."productId",
              'name', ii."name",
              'description', ii."description",
              'quantity', ii."quantity",
              'unitPriceCents', ii."unitPriceCents",
              'lineTotalCents', ii."lineTotalCents"
            ) ORDER BY ii."id"
          )
          FROM "InvoiceItem" ii
          WHERE ii."invoiceId" = i."id"
        ),
        '[]'::json
      ) AS items
    FROM "Invoice" i
    JOIN "Customer" c ON c."id" = i."customerId"
    WHERE i."id" = $1
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
    await q(`DELETE FROM "InvoiceItem" WHERE "invoiceId" = $1`, [id]);
    const res = await q(`DELETE FROM "Invoice" WHERE "id" = $1`, [id]);
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

    const {
      invoiceNo = null,
      customerId,
      issueDate,
      dueDate,
      currency = "EUR",
      taxRate = 19,
      items = [],
    } = body;

    if (!customerId) return NextResponse.json({ ok:false, error:"customerId fehlt." }, { status:400 });

    const itemsSafe = Array.isArray(items) ? items.map(it => ({
      productId: it.productId ?? null,
      name: String(it.name || "").trim(),
      description: it.description || null,
      quantity: Number(it.quantity || 0),
      unitPriceCents: Number(it.unitPriceCents || 0),
    })) : [];

    const netCents = itemsSafe.reduce((s, it) => s + it.quantity * it.unitPriceCents, 0);
    const taxCents = Math.round(netCents * (Number(taxRate || 0) / 100));
    const grossCents = netCents + taxCents;

    await q(`BEGIN`);
    const upd = await q(
      `UPDATE "Invoice"
       SET "invoiceNo" = $2,
           "customerId" = $3,
           "issueDate" = COALESCE($4, "issueDate"),
           "dueDate" = $5,
           "currency" = $6,
           "netCents" = $7,
           "taxCents" = $8,
           "grossCents" = $9,
           "taxRate" = $10
       WHERE "id" = $1`,
      [id, invoiceNo, customerId, issueDate || null, dueDate || null, currency, netCents, taxCents, grossCents, Number(taxRate || 0)]
    );
    if (upd.rowCount === 0) {
      await q(`ROLLBACK`);
      return NextResponse.json({ ok:false, error:"Not found" }, { status:404 });
    }

    await q(`DELETE FROM "InvoiceItem" WHERE "invoiceId" = $1`, [id]);
    for (const it of itemsSafe) {
      await q(
        `INSERT INTO "InvoiceItem"
         ("id","invoiceId","productId","name","description","quantity","unitPriceCents","lineTotalCents")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [uuid(), id, it.productId, it.name, it.description, it.quantity, it.unitPriceCents, it.quantity * it.unitPriceCents]
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
