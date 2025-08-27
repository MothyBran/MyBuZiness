// app/api/receipts/route.js
import { initDb, q, uuid } from "@/lib/db";

/** Integer-Helfer */
const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

export async function GET(request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(500, Number(searchParams.get("limit") || 100)));
    const qstr  = (searchParams.get("q")  || "").trim().toLowerCase();
    const no    = (searchParams.get("no") || "").trim();

    const where = [];
    const params = [];
    if (qstr) {
      params.push(`%${qstr}%`);
      // Suche in receiptNo ODER note – gemeinsamer Parameter, bewusst gleich
      where.push(`(lower(COALESCE("receiptNo",'')) LIKE $${params.length} OR lower(COALESCE("note",'')) LIKE $${params.length})`);
    }
    if (no)   { params.push(no); where.push(`"receiptNo" = $${params.length}`); }

    const sql = `
      SELECT
        "id",
        COALESCE("receiptNo",'')               AS "receiptNo",
        "date",
        COALESCE("currency",'EUR')             AS "currency",
        COALESCE("netCents",0)::bigint         AS "netCents",
        COALESCE("taxCents",0)::bigint         AS "taxCents",
        COALESCE("grossCents",0)::bigint       AS "grossCents",
        COALESCE("discountCents",0)::bigint    AS "discountCents",
        COALESCE("note",'')                    AS "note",
        "createdAt","updatedAt"
      FROM "Receipt"
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY "createdAt" DESC NULLS LAST, "date" DESC NULLS LAST, "id" DESC
      LIMIT ${limit};
    `;

    const rows = (await q(sql, params)).rows;
    return new Response(JSON.stringify({ ok:true, data: rows }), {
      status: 200, headers: { "content-type":"application/json", "cache-control":"no-store" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error: String(e) }), {
      status: 500, headers: { "content-type":"application/json" }
    });
  }
}

export async function POST(request) {
  try {
    await initDb();
    const body = await request.json().catch(()=> ({}));
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return new Response(JSON.stringify({ ok:false, error:"Mindestens eine Position ist erforderlich." }), { status:400 });
    }

    // Kopf
    const id = uuid();
    const receiptNo = (body.receiptNo || "").trim() || null;        // Nummer kann vom Frontend kommen (BN-jjmm-000)
    const date = body.date || null;
    const currency = body.currency || "EUR";
    const vatExempt = !!body.vatExempt;
    const discountCents = toInt(body.discountCents || 0);

    // Summen
    let net = 0;
    for (const it of items) {
      net += toInt(it.quantity || 0) * toInt(it.unitPriceCents || 0);
    }
    const netAfter = Math.max(0, net - discountCents);
    const taxRate = vatExempt ? 0 : 19;
    const taxCents = Math.round(netAfter * (taxRate/100));
    const grossCents = netAfter + taxCents;

    await q("BEGIN");
    await q(`
      INSERT INTO "Receipt"
        ("id","receiptNo","date","vatExempt","currency","netCents","taxCents","grossCents","discountCents","createdAt","updatedAt","note")
      VALUES
        ($1,$2,COALESCE($3::date, CURRENT_DATE),$4,$5,$6,$7,$8,$9, now(), now(), COALESCE($10,''))`,
      [id, receiptNo, date, vatExempt, currency, netAfter, taxCents, grossCents, discountCents, body.note || ""]
    );

    for (const it of items) {
      const itemId = uuid();
      const qty = toInt(it.quantity || 0);
      const unit = toInt(it.unitPriceCents || 0);
      const line = qty * unit;
      await q(
        `INSERT INTO "ReceiptItem"
           ("id","receiptId","productId","name","quantity","unitPriceCents","lineTotalCents","createdAt","updatedAt")
         VALUES
           ($1,$2,$3,$4,$5,$6,$7, now(), now())`,
        [itemId, id, it.productId || null, (it.name || "Position").trim(), qty, unit, line]
      );
    }
    await q("COMMIT");

    return new Response(JSON.stringify({ ok:true, data:{ id, receiptNo } }), {
      status: 201, headers: { "content-type":"application/json" }
    });
  } catch (e) {
    try { await q("ROLLBACK"); } catch {}
    return new Response(JSON.stringify({ ok:false, error: String(e) }), {
      status: 400, headers: { "content-type":"application/json" }
    });
  }
}
