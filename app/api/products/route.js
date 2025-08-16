// app/api/products/route.js
import { initDb, q, uuid } from "@/lib/db";

export async function GET(request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const qStr = (searchParams.get("q") || "").trim();
    const kind = (searchParams.get("kind") || "").trim(); // optional filter: 'service'|'product'

    let rows;
    if (qStr || kind) {
      const params = [];
      let where = [];
      if (qStr) {
        params.push(`%${qStr.toLowerCase()}%`);
        where.push(`(lower("name") LIKE $${params.length} OR lower("sku") LIKE $${params.length} OR lower("description") LIKE $${params.length} OR lower("categoryCode") LIKE $${params.length})`);
      }
      if (kind) {
        params.push(kind);
        where.push(`"kind" = $${params.length}`);
      }
      rows = (await q(
        `SELECT * FROM "Product" ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY "createdAt" DESC`,
        params
      )).rows;
    } else {
      rows = (await q(`SELECT * FROM "Product" ORDER BY "createdAt" DESC`)).rows;
    }
    return Response.json({ ok: true, data: rows });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}

function toInt(v, d=0){ const n=Number(v); return Number.isFinite(n)?Math.trunc(n):d; }

export async function POST(request) {
  try {
    await initDb();
    const body = await request.json().catch(() => ({}));
    const name = (body.name || "").trim();
    if (!name) {
      return new Response(JSON.stringify({ ok: false, error: "Name ist erforderlich." }), { status: 400 });
    }

    const id = uuid();
    const sku = (body.sku || "").trim() || null;
    const priceCents = toInt(body.priceCents, 0);
    const currency = (body.currency || "EUR").trim();
    const description = (body.description || "").trim() || null;

    // Neue Felder:
    const kind = (body.kind === "product" ? "product" : "service"); // default: service
    const categoryCode = (body.categoryCode || "").trim() || null;
    const travelEnabled = !!body.travelEnabled;
    const travelRateCents = toInt(body.travelRateCents, 0);
    const travelUnit = (body.travelUnit || "km").trim();

    const res = await q(
      `INSERT INTO "Product"
       ("id","name","sku","priceCents","currency","description","kind","categoryCode","travelEnabled","travelRateCents","travelUnit")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [id, name, sku, priceCents, currency, description, kind, categoryCode, travelEnabled, travelRateCents, travelUnit]
    );

    return Response.json({ ok: true, data: res.rows[0] }, { status: 201 });
  } catch (e) {
    if (String(e).includes("duplicate key")) {
      return new Response(JSON.stringify({ ok: false, error: "SKU ist bereits vergeben." }), { status: 400 });
    }
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
}
