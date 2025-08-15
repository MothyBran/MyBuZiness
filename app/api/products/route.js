// app/api/products/route.js
import { initDb, q, uuid } from "@/lib/db";

export async function GET(request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const qStr = (searchParams.get("q") || "").trim();

    let rows;
    if (qStr) {
      rows = (await q(
        `SELECT * FROM "Product"
         WHERE lower("name") LIKE $1 OR lower("sku") LIKE $1 OR lower("description") LIKE $1
         ORDER BY "createdAt" DESC`,
        [`%${qStr.toLowerCase()}%`]
      )).rows;
    } else {
      rows = (await q(`SELECT * FROM "Product" ORDER BY "createdAt" DESC`)).rows;
    }

    return Response.json({ ok: true, data: rows });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}

export async function POST(request) {
  try {
    await initDb();
    const body = await request.json().catch(() => ({}));
    const name = (body.name || "").trim();
    if (!name) {
      return new Response(JSON.stringify({ ok: false, error: "Name ist erforderlich." }), { status: 400 });
    }
    const sku = (body.sku || "").trim() || null;
    const currency = (body.currency || "EUR").trim();
    const priceCents = Number.isFinite(body.priceCents) ? body.priceCents : 0;
    const description = (body.description || "").trim() || null;

    const id = uuid();
    const res = await q(
      `INSERT INTO "Product" ("id","name","sku","priceCents","currency","description")
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [id, name, sku, priceCents, currency, description]
    );
    return Response.json({ ok: true, data: res.rows[0] }, { status: 201 });
  } catch (e) {
    if (String(e).includes("duplicate key")) {
      return new Response(JSON.stringify({ ok: false, error: "SKU ist bereits vergeben." }), { status: 400 });
    }
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
}
