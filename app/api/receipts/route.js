// app/api/receipts/route.js
import { initDb, q, uuid } from "@/lib/db";

export async function GET(request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const qs = (searchParams.get("q") || "").trim().toLowerCase();

    // Grundliste der Belege – Sortierung tolerant gegen NULL
    const receipts = (await q(
      `SELECT "id","receiptNo","date","grossCents","netCents","taxCents","discountCents",
              COALESCE("currency",'EUR') AS "currency",
              "createdAt","updatedAt"
       FROM "Receipt"
       ${qs ? `WHERE lower(COALESCE("receiptNo",'')) LIKE $1 OR lower(COALESCE("note",'')) LIKE $1` : ""}
       ORDER BY "createdAt" DESC NULLS LAST, "date" DESC NULLS LAST, "id" DESC`,
      qs ? [`%${qs}%`] : []
    )).rows;

    if (receipts.length === 0) {
      return new Response(JSON.stringify({ ok: true, data: [] }), {
        status: 200,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      });
    }

    const ids = receipts.map(r => r.id);

    // Positionen anhängen – UUID-Array sauber gecastet
    const items = (await q(
      `SELECT "id","receiptId","productId","name",
              COALESCE("quantity",0) AS "quantity",
              COALESCE("unitPriceCents",0) AS "unitPriceCents",
              COALESCE("lineTotalCents",0) AS "lineTotalCents",
              COALESCE("createdAt", now()) AS "createdAt"
       FROM "ReceiptItem"
       WHERE "receiptId" = ANY($1::uuid[])
       ORDER BY "createdAt" ASC NULLS LAST, "id" ASC`,
      [ids]
    )).rows;

    const byId = new Map(receipts.map(r => [r.id, { ...r, items: [] }]));
    for (const it of items) {
      const host = byId.get(it.receiptId);
      if (host) host.items.push(it);
    }

    return new Response(JSON.stringify({ ok: true, data: Array.from(byId.values()) }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
}

export async function POST(request) {
  try {
    await initDb();
    const body = await request.json().catch(() => ({}));
    const { date, vatExempt = true, currency = "EUR", discountCents = 0 } = body;
    const items = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return new Response(JSON.stringify({ ok:false, error:"Mindestens eine Position ist erforderlich." }), { status:400 });
    }

    const id = uuid();
    const seq = (await q(`SELECT nextval('"ReceiptNumberSeq"') AS n`)).rows[0].n;
    const receiptNo = String(seq);

    const netCents = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unitPriceCents || 0), 0);
    const netAfterDiscount = Math.max(0, netCents - Number(discountCents || 0));
    const taxCents = vatExempt ? 0 : Math.round(netAfterDiscount * 0.19);
    const grossCents = netAfterDiscount + taxCents;

    await q(
      `INSERT INTO "Receipt" ("id","receiptNo","date","vatExempt","currency","netCents","taxCents","grossCents","discountCents","createdAt","updatedAt")
       VALUES ($1,$2,COALESCE($3, CURRENT_DATE),$4,$5,$6,$7,$8,$9,now(),now())`,
      [id, receiptNo, date || null, !!vatExempt, currency, netAfterDiscount, taxCents, grossCents, Number(discountCents || 0)]
    );

    for (const it of items) {
      await q(
        `INSERT INTO "ReceiptItem" ("id","receiptId","productId","name","quantity","unitPriceCents","lineTotalCents","createdAt","updatedAt")
         VALUES ($1,$2::uuid,$3::uuid,$4,$5,$6,$7,now(),now())`,
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
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400, headers: { "content-type": "application/json" }
    });
  }
}
