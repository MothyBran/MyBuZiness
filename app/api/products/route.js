// app/api/products/route.js
import { initDb, q, uuid } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await requireUser();
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
       WHERE "userId"=$1
       ORDER BY "createdAt" DESC`,
      [userId]
    )).rows;
    return Response.json({ ok: true, data: rows });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(request) {
  try {
    const userId = await requireUser();
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
         "createdAt","updatedAt","userId"
       ) VALUES (
         $1,$2,$3,$4,$5,$6,
         $7,$8,$9,$10,
         now(),now(),$11
       )`,
      [
        id, name, body.sku || null, body.description || null, body.categoryCode || null, kind,
        priceCents, hourlyRateCents, travelBaseCents, travelPerKmCents, userId
      ]
    );

    const row = (await q(`SELECT * FROM "Product" WHERE "id"=$1 AND "userId"=$2`, [id, userId])).rows[0];
    return Response.json({ ok:true, data: row }, { status: 201 });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: e.message === "Unauthorized" ? 401 : 400 });
  }
}
