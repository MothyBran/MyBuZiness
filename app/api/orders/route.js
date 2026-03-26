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

    await q(`INSERT INTO "Order"("id","orderNo","customerId","issueDate","validUntil","currency","netCents","taxCents","grossCents","status","createdAt","updatedAt","userId")
             VALUES ($1,$2,$3,COALESCE($4,CURRENT_DATE),$5,$6,$7,$8,$9,'open',now(),now(),$10)`,
      [id, orderNo, b.customerId, b.issueDate || null, b.validUntil || null, b.currency || s.currency || "EUR", net, tax, gross, userId]
    );
    for (const it of prepared) {
      await q(`INSERT INTO "OrderItem"("id","orderId","productId","name","quantity","unitPriceCents","lineTotalCents","createdAt","updatedAt")
               VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now())`,
        [uuid(), id, it.productId || null, it.name || "Position", it.quantity, it.unitPriceCents, it.lineTotalCents]
      );
    }
    return Response.json({ ok:true, data:{ id, orderNo } }, { status:201 });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: e.message === "Unauthorized" ? 401 : 400 });
  }
}
