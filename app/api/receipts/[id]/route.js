// app/api/receipts/[id]/route.js
import { initDb, q } from "@/lib/db";

export async function GET(_req, { params }) {
  try {
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
         "createdAt","updatedAt"
       FROM "Receipt" WHERE "id"=$1 LIMIT 1`,
      [id]
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
       FROM "ReceiptItem" WHERE "receiptId"=$1
       ORDER BY "createdAt" ASC, "id" ASC`,
      [id]
    )).rows;

    return new Response(JSON.stringify({ ok:true, data: { ...head, items } }), {
      status: 200, headers: { "content-type":"application/json", "cache-control":"no-store" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error: String(e) }), {
      status: 500, headers: { "content-type":"application/json" }
    });
  }
}
