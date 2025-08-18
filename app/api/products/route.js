// app/api/products/route.js
import { initDb, q, uuid } from "@/lib/db";

export async function GET() {
  try {
    await initDb();
    const rows = (await q(
      `SELECT
         "id","name","sku","description","categoryCode","kind",
         COALESCE("priceCents",0)          AS "priceCents",
         COALESCE("hourlyRateCents",0)     AS "hourlyRateCents",
         COALESCE("travelBaseCents",0)     AS "travelBaseCents",
         COALESCE("travelPerKmCents",0)    AS "travelPerKmCents",
         "createdAt","updatedAt"
       FROM "Product"
       ORDER BY "createdAt" DESC`
    )).rows;
    return Response.json({ ok: true, data: rows });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 500 });
  }
}

export async function POST(request) {
  try {
    await initDb();
    const body = await request.json().catch(()=> ({}));

    const id = uuid();
    const name = (body.name || "").trim();
    if (!name) return new Response(JSON.stringify({ ok:false, error:"Name/Bezeichnung ist erforderlich." }), { status: 400 });

    const kind = (body.kind || "product"); // "product" | "service" | "travel"
    const priceCents        = Number(body.priceCents || 0);        // Produktpreis ODER Grundpreis (service fallback)
    const hourlyRateCents   = Number(body.hourlyRateCents || 0);   // Dienstleistung €/Std. (optional)
    const travelBaseCents   = Number(body.travelBaseCents || 0);   // Grundpreis Fahrtkosten
    const travelPerKmCents  = Number(body.travelPerKmCents || 0);  // €/km

    await q(
      `INSERT INTO "Product"(
         "id","name","sku","description","categoryCode","kind",
         "priceCents","hourlyRateCents","travelBaseCents","travelPerKmCents",
         "createdAt","updatedAt"
       ) VALUES (
         $1,$2,$3,$4,$5,$6,
         $7,$8,$9,$10,
         now(),now()
       )`,
      [
        id, name, body.sku || null, body.description || null, body.categoryCode || null, kind,
        priceCents, hourlyRateCents, travelBaseCents, travelPerKmCents
      ]
    );

    const row = (await q(`SELECT * FROM "Product" WHERE "id"=$1`, [id])).rows[0];
    return Response.json({ ok:true, data: row }, { status: 201 });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 400 });
  }
}

