import { initDb, q, uuid } from "@/lib/db";
import { renderNumber } from "@/lib/numbering";
import { requireUser } from "@/lib/auth";

export async function GET(request) {
  try {
    const userId = await requireUser();
    await initDb();
    const { searchParams } = new URL(request.url);
    const qs = (searchParams.get("q") || "").trim().toLowerCase();
    const no = (searchParams.get("no") || "").trim();

    const where = [`q."userId"=$1`];
    const params = [userId];
    if (qs) { params.push(`%${qs}%`); where.push(`(lower("orderNo") LIKE $${params.length})`); }
    if (no) { params.push(no); where.push(`"orderNo" = $${params.length}`); }

    const rows = (await q(
      `SELECT q.*, c."name" AS "customerName"
         FROM "Order" q JOIN "Customer" c ON c."id" = q."customerId"
        WHERE ${where.join(" AND ")}
        ORDER BY q."issueDate" DESC, q."createdAt" DESC`
      , params
    )).rows;

    return Response.json({ ok: true, data: rows }, { headers: { "cache-control": "no-store" }});
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(request) {
  try {
    const userId = await requireUser();
    await initDb();
    const b = await request.json().catch(()=>({}));
    const items = Array.isArray(b.items) ? b.items : [];
    if (!b.customerId) return Response.json({ ok:false, error:"customerId fehlt" }, { status:400 });
    if (!items.length) return Response.json({ ok:false, error:"Mindestens eine Position" }, { status:400 });

    // Settings für Nummernformat & Steuer
    const s = (await q(`SELECT * FROM "Settings" WHERE "userId"=$1 ORDER BY "createdAt" ASC LIMIT 1`, [userId])).rows[0] || {};
    const format = s.orderNumberFormat || "{YYYY}-Q{SEQ4}"; // optional: eigene Spalte
    // einfache Sequenz pro User? Oder global? Besser pro User.
    // Aber OrderNo Sequenz global vs user-scoped? Original war global (kein User Filter).
    // Hier filtern wir nach User für die Sequenz.
    const seq = (await q(`SELECT COALESCE(MAX(NULLIF(regexp_replace("orderNo",'\\D','','g'), '')::bigint),0)+1 AS seq FROM "Order" WHERE "userId"=$1`, [userId])).rows[0].seq;
    const orderNo = b.orderNo?.trim() || renderNumber(format, seq);

    const ku = !!s.kleinunternehmer;
    const taxRateDefault = Number(s.taxRateDefault ?? 19);
    const globalTaxRate = ku ? 0 : (Number.isFinite(taxRateDefault) ? taxRateDefault : 19);

    const id = uuid();
    let grossCentsBeforeDiscount = 0;
    let taxCentsTotal = 0;

    const prodIds = items.map(it => it.productId).filter(Boolean).map(String);
    let productMap = new Map();
    if (prodIds.length) {
      const prows = (await q(
        `SELECT "id"::text AS id, COALESCE("vatRate", 19) AS "vatRate"
         FROM "Product" WHERE "id"::text = ANY($1::text[]) AND "userId"=$2`,
        [prodIds, userId]
      )).rows;
      productMap = new Map(prows.map(p => [p.id, p]));
    }

    const prepared = items.map(i => {
      const qn = Number(i.quantity||0);
      const up = Number(i.unitPriceCents||0);
      const lineGross = qn*up;

      let itemVatRate = Number(i.vatRate);
      if (Number.isNaN(itemVatRate)) itemVatRate = globalTaxRate;

      if (i.productId && productMap.has(String(i.productId))) {
        const p = productMap.get(String(i.productId));
        if (Number.isNaN(Number(i.vatRate))) {
          itemVatRate = Number(p.vatRate);
        }
      }

      if (ku) itemVatRate = 0;

      grossCentsBeforeDiscount += lineGross;
      const itemTax = lineGross - (lineGross / (1 + (itemVatRate / 100)));
      taxCentsTotal += itemTax;

      return { ...i, quantity: qn, unitPriceCents: up, lineTotalCents: lineGross, vatRate: itemVatRate };
    });

    const discountCents = 0;
    const grossCents = Math.max(0, grossCentsBeforeDiscount - discountCents);
    let finalTaxCents = Math.round(taxCentsTotal);
    if (discountCents > 0 && grossCentsBeforeDiscount > 0) {
      const ratio = grossCents / grossCentsBeforeDiscount;
      finalTaxCents = Math.round(taxCentsTotal * ratio);
    }
    const netCents = grossCents - finalTaxCents;

    await q(`INSERT INTO "Order"("id","orderNo","customerId","issueDate","validUntil","currency","netCents","taxCents","grossCents","status","createdAt","updatedAt","userId")
             VALUES ($1,$2,$3,COALESCE($4,CURRENT_DATE),$5,$6,$7,$8,$9,'open',now(),now(),$10)`,
      [id, orderNo, b.customerId, b.issueDate || null, b.validUntil || null, b.currency || s.currency || "EUR", netCents, finalTaxCents, grossCents, userId]
    );
    for (const it of prepared) {
      await q(`INSERT INTO "OrderItem"("id","orderId","productId","name","quantity","unitPriceCents","lineTotalCents","vatRate","createdAt","updatedAt")
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now(),now())`,
        [uuid(), id, it.productId || null, it.name || "Position", it.quantity, it.unitPriceCents, it.lineTotalCents, it.vatRate]
      );
    }
    return Response.json({ ok:true, data:{ id, orderNo } }, { status:201 });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: e.message === "Unauthorized" ? 401 : 400 });
  }
}
