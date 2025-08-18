export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { initDb, q, uuid } from "@/lib/db";

/** Items serverseitig an Kopfzeilen hängen */
async function attachReceiptItems(rows) {
  if (!rows?.length) return rows;
  const ids = rows.map(r => r.id);
  const items = (await q(
    `SELECT * FROM "ReceiptItem"
     WHERE "receiptId" = ANY($1::uuid[])
     ORDER BY "id" ASC`,
    [ids]
  )).rows;

  const by = new Map(rows.map(r => [r.id, { ...r, items: [] }]));
  for (const it of items) {
    const host = by.get(it.receiptId);
    if (host) host.items.push(it);
  }
  return Array.from(by.values());
}

export async function GET(request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const qs = (searchParams.get("q") || "").trim().toLowerCase();

    const rows = (await q(
      `SELECT *
       FROM "Receipt"
       ${qs ? `WHERE lower("receiptNo") LIKE $1 OR lower(COALESCE("note", '')) LIKE $1` : ""}
       ORDER BY "date" DESC NULLS LAST, "id" DESC`,
      qs ? [`%${qs}%`] : []
    )).rows;

    const withItems = await attachReceiptItems(rows);

    return new Response(JSON.stringify({ ok:true, data: withItems }), {
      status: 200,
      headers: { "content-type":"application/json", "cache-control":"no-store" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500 });
  }
}

export async function POST(request) {
  try {
    await initDb();

    const body = await request.json().catch(()=>({}));
    const { date, discountCents = 0 } = body;
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return new Response(JSON.stringify({ ok:false, error:"Mindestens eine Position ist erforderlich." }), { status:400 });

    // Settings (Währung + §19)
    const settings = (await q(`SELECT * FROM "Settings" ORDER BY "createdAt" ASC NULLS LAST LIMIT 1`)).rows[0] || {};
    const vatExempt = !!settings.kleinunternehmer;
    const currency = settings.currency || "EUR";

    const id = uuid();
    const seq = (await q(`SELECT nextval('\"ReceiptNumberSeq\"') AS n`)).rows[0].n;
    const receiptNo = String(seq);

    // Summen berechnen
    let netCents = 0;
    const normItems = items.map(it => {
      const qty   = Number(it.quantity || 0);
      const unit  = Number(it.unitPriceCents || 0);
      const extra = Number(it.extraBaseCents || 0);
      const line  = qty * unit + extra;
      netCents += line;
      return { qty, unit, extra, line, name: String(it.name||"").trim(), productId: it.productId || null };
    });

    const netAfterDiscount = Math.max(0, netCents - Number(discountCents || 0));
    const taxCents = vatExempt ? 0 : Math.round(netAfterDiscount * 0.19);
    const grossCents = netAfterDiscount + taxCents;

    // Kopf speichern
    await q(
      `INSERT INTO "Receipt" ("id","receiptNo","date","vatExempt","currency","netCents","taxCents","grossCents","discountCents")
       VALUES ($1,$2,COALESCE($3, CURRENT_DATE),$4,$5,$6,$7,$8,$9)`,
      [id, receiptNo, date || null, vatExempt, currency, netAfterDiscount, taxCents, grossCents, Number(discountCents||0)]
    );

    // Items speichern
    for (const it of normItems) {
      await q(
        `INSERT INTO "ReceiptItem" ("id","receiptId","productId","name","quantity","unitPriceCents","extraBaseCents","lineTotalCents")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [uuid(), id, it.productId, it.name, it.qty, it.unit, it.extra, it.line]
      );
    }

    return new Response(JSON.stringify({ ok:true, data:{ id, receiptNo } }), { status:201 });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:400 });
  }
}
