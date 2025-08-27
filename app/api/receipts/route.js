// app/api/receipts/route.js
import { initDb, q } from "@/lib/db"; // ggf. anpassen: "@/db" oder relativ importieren
import { randomUUID } from "crypto";

/* helpers */
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

    return Response.json({ ok: true, data: rows }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}

export async function POST(request) {
  try {
    await initDb();
    const body = await request.json().catch(() => ({}));
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "Mindestens eine Position ist erforderlich." }), { status: 400 });
    }

    const id = randomUUID(); // <— wir erzeugen die Kopf-ID selbst
    const receiptNo = (body.receiptNo || "").trim() || null;
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
    const taxCents = Math.round(netAfter * (taxRate / 100));
    const grossCents = netAfter + taxCents;

    await q("BEGIN");

    // Prüfen, ob es die Spalte "customerId" gibt (optional)
    let withCustomer = false;
    try { await q(`SELECT "customerId" FROM "Receipt" WHERE false`); withCustomer = true; } catch {}

    // Insert Receipt (mit eigener ID)
    const cols = [
      `"id"`,
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
    const vals = [
      "$1",           // id
      "$2",           // receiptNo
      "COALESCE($3::date, CURRENT_DATE)",
      "$4",           // vatExempt
      "$5",           // currency
      "$6",           // netCents (nach Rabatt)
      "$7",           // taxCents
      "$8",           // grossCents
      "$9",           // discountCents
      "now()",
      "now()"
    ];
    const params = [
      id, receiptNo, date, vatExempt, currency,
      netAfter, taxCents, grossCents, discountCents
    ];

    if (withCustomer) {
      cols.splice(5, 0, `"customerId"`);
      vals.splice(5, 0, "$10");
      params.push(body.customerId || null);
    }

    const insertSql = `INSERT INTO "Receipt" (${cols.join(",")}) VALUES (${vals.join(",")}) RETURNING "id","receiptNo"`;
    const head = (await q(insertSql, params)).rows[0];

    // Insert Items – ebenfalls mit eigener ID
    for (const it of items) {
      const itemId = randomUUID();
      const qty = toInt(it.quantity || 0);
      const unit = toInt(it.unitPriceCents || 0);
      const line = qty * unit;

      await q(
        `INSERT INTO "ReceiptItem"
           ("id","receiptId","productId","name","quantity","unitPriceCents","lineTotalCents","createdAt","updatedAt")
         VALUES
           ($1,$2,$3,$4,$5,$6,$7,now(),now())`,
        [
          itemId,
          id, // <— unser oben erzeugtes Beleg-ID
          it.productId || null,
          (it.name || "Position").trim(),
          qty,
          unit,
          line,
        ]
      );
    }

    await q("COMMIT");
    return Response.json({ ok: true, data: { id: head.id, receiptNo: head.receiptNo } }, { status: 201 });
  } catch (e) {
    try { await q("ROLLBACK"); } catch {}
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
}
