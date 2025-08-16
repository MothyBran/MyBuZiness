// app/api/receipts/route.js
import { initDb, q, uuid } from "@/lib/db";

export async function GET(request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const qs = (searchParams.get("q") || "").trim().toLowerCase();

    let rows;
    if (qs) {
      rows = (await q(
        `SELECT * FROM "Receipt"
         WHERE lower("receiptNo") LIKE $1 OR lower(COALESCE("note", '')) LIKE $1
         ORDER BY "date" DESC, "createdAt" DESC`,
        [`%${qs}%`]
      )).rows;
    } else {
      rows = (await q(`SELECT * FROM "Receipt" ORDER BY "date" DESC, "createdAt" DESC`)).rows;
    }
    return Response.json({ ok: true, data: rows });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}

export async function POST(request) {
  try {
    await initDb();
    const body = await request.json().catch(() => ({}));
    const { date, vatExempt = true, currency = "EUR", discountCents = 0 } = body;
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return new Response(JSON.stringify({ ok:false, error:"Mindestens eine Position ist erforderlich." }), { status:400 });

    const id = uuid();
    const seq = (await q(`SELECT nextval('\"ReceiptNumberSeq\"') AS n`)).rows[0].n;
    const receiptNo = String(seq);

    const netCents = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unitPriceCents || 0), 0);
    const netAfterDiscount = Math.max(0, netCents - Number(discountCents || 0));
    const taxCents = vatExempt ? 0 : Math.round(netAfterDiscount * 0.19); // Falls du mal Belege mit USt willst
    const grossCents = netAfterDiscount + taxCents;

    await q(
      `INSERT INTO "Receipt" ("id","receiptNo","date","vatExempt","currency","netCents","taxCents","grossCents","discountCents")
       VALUES ($1,$2,COALESCE($3, CURRENT_DATE),$4,$5,$6,$7,$8,$9)`,
      [id, receiptNo, date || null, !!vatExempt, currency, netAfterDiscount, taxCents, grossCents, Number(discountCents || 0)]
    );

    for (const it of items) {
      await q(
        `INSERT INTO "ReceiptItem" ("id","receiptId","productId","name","quantity","unitPriceCents","lineTotalCents")
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          uuid(),
          id,
          it.productId || null,
          it.name,
          Number(it.quantity || 0),
          Number(it.unitPriceCents || 0),
          Number(it.quantity || 0) * Number(it.unitPriceCents || 0)
        ]
      );
    }

    return Response.json({ ok: true, data: { id, receiptNo } }, { status: 201 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
}
