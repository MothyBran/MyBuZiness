// /app/api/orders/route.js
import { ensureSchemaOnce, q, uuid } from "@/lib/db";
import { nextNumber } from "@/lib/numbering";

export async function GET(request) {
  await ensureSchemaOnce();
  const { searchParams } = new URL(request.url);
  const qs = (searchParams.get("q") || "").trim().toLowerCase();
  const no = (searchParams.get("no") || "").trim();

  const where = [];
  const params = [];
  if (qs) { params.push(`%${qs}%`); where.push(`(lower("orderNo") LIKE $${params.length})`); }
  if (no) { params.push(no); where.push(`"orderNo" = $${params.length}`); }

  const rows = (await q(
    `SELECT q.*, c."name" AS "customerName"
       FROM "Order" q JOIN "Customer" c ON c."id" = q."customerId"
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY q."orderDate" DESC NULLS LAST, q."createdAt" DESC NULLS LAST`,
    params
  )).rows;

  return Response.json({ ok: true, data: rows }, { headers: { "cache-control": "no-store" }});
}

export async function POST(request) {
  await ensureSchemaOnce();
  const b = await request.json().catch(()=>({}));
  const items = Array.isArray(b.items) ? b.items : [];
  if (!b.customerId) return Response.json({ ok:false, error:"customerId fehlt" }, { status:400 });
  if (!items.length) return Response.json({ ok:false, error:"Mindestens eine Position" }, { status:400 });

  // Settings
  const s = (await q(`SELECT * FROM "Settings" ORDER BY "createdAt" ASC LIMIT 1`)).rows[0] || {};
  const currency = b.currency || s.currency || s.currencyDefault || "EUR";

  // Nummer
  let orderNo = (b.orderNo || "").trim();
  if (!orderNo) {
    const fmt = s.orderNumberFormat || "ORD-{yyyy}-{0000}";
    const { no } = await nextNumber("order", fmt, { period: "yyyy" });
    orderNo = no;
  }

  const id = uuid();
  let net = 0;
  const prepared = items.map(i => {
    const qn = Number(i.quantity||0);
    const up = Number(i.unitPriceCents||0);
    const line = qn*up;
    net += line;
    return { ...i, quantity: qn, unitPriceCents: up, lineTotalCents: line };
  });

  const ku = !!s.kleinunternehmer;
  const taxRate = ku ? 0 : Number(s.taxRateDefault ?? 19);
  const tax = Math.round(net * (taxRate/100));
  const gross = net + tax;

  await q(`INSERT INTO "Order"("id","orderNo","customerId","orderDate","currency","netCents","taxCents","grossCents","status","createdAt","updatedAt")
           VALUES ($1,$2,$3,COALESCE($4,CURRENT_DATE),$5,$6,$7,$8,'open',now(),now())`,
    [id, orderNo, b.customerId, b.orderDate || null, currency, net, tax, gross]
  );

  for (const it of prepared) {
    await q(`INSERT INTO "OrderItem"("id","orderId","productId","name","quantity","unitPriceCents","lineTotalCents","createdAt","updatedAt")
             VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now())`,
      [uuid(), id, it.productId || null, it.name || "Position", it.quantity, it.unitPriceCents, it.lineTotalCents]
    );
  }
  return Response.json({ ok:true, data:{ id, orderNo } }, { status:201 });
}
