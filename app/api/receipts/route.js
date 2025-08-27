// app/api/receipts/route.js
import { initDb, q } from "@/lib/db";

/** helpers */
const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

export async function GET(request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const limit = Math.max(0, Math.min(100, Number(searchParams.get("limit") || 50)));

    const rows = (await q(
      `SELECT
         "id",
         COALESCE("receiptNo",'')             AS "receiptNo",
         "date",
         COALESCE("netCents",0)::bigint       AS "netCents",
         COALESCE("taxCents",0)::bigint       AS "taxCents",
         COALESCE("grossCents",0)::bigint     AS "grossCents",
         COALESCE("discountCents",0)::bigint  AS "discountCents",
         COALESCE("currency",'EUR')           AS "currency",
         COALESCE("customerId", NULL)         AS "customerId",
         COALESCE("customerName",'')          AS "customerName",
         "createdAt","updatedAt"
       FROM "Receipt"
       ORDER BY "createdAt" DESC NULLS LAST, "date" DESC NULLS LAST, "id" DESC
       LIMIT $1`,
      [limit]
    )).rows;

    return Response.json({ ok:true, data: rows }, { headers: { "cache-control":"no-store" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500 });
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

    const receiptNo = (body.receiptNo || "").trim();
    const date = body.date || null;
    const vatExempt = !!body.vatExempt;
    const currency = body.currency || "EUR";
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

    // Optional: customerId verwenden, wenn Spalte vorhanden
    let withCustomer = false;
    try { await q(`SELECT "customerId" FROM "Receipt" WHERE false`); withCustomer = true; } catch {}

    const cols = [
      `"receiptNo"`,
      `"date"`,
      `"vatExempt"`,
      `"currency"`,
      `"netCents"`,
      `"taxCents"`,
      `"grossCents"`,
      `"discountCents"`,
      `"createdAt"`,
      `"updatedAt"`
    ];
    const placeholders = ["$1","COALESCE($2, CURRENT_DATE)","$3","$4","$5","$6","$7","$8","now()","now()"];
    const params = [receiptNo || null, date, vatExempt, currency, netAfter, taxCents, grossCents, discountCents];

    if (withCustomer) {
      cols.splice(5, 0, `"customerId"`);
      placeholders.splice(5, 0, "$9");
      params.push(body.customerId || null);
    }

    const insertSql = `INSERT INTO "Receipt" (${cols.join(",")}) VALUES (${placeholders.join(",")}) RETURNING "id","receiptNo"`;
    const head = (await q(insertSql, params)).rows[0];
    const id = head.id;

    for (const it of items) {
      await q(
        `INSERT INTO "ReceiptItem"
           ("id","receiptId","productId","name","quantity","unitPriceCents","lineTotalCents","createdAt","updatedAt")
         VALUES
           (gen_random_uuid(),$1,$2,$3,$4,$5,$6,now(),now())`,
        [
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
    return Response.json({ ok:true, data: { id, receiptNo: head.receiptNo } }, { status:201 });
  } catch (e) {
    try { await q("ROLLBACK"); } catch {}
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:400 });
  }
}
