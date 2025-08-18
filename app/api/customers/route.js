// app/api/customers/route.js
import { initDb, q, uuid } from "@/lib/db";

export async function GET(request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const qs = (searchParams.get("q") || "").trim().toLowerCase();

    let rows;
    if (qs) {
      rows = (await q(
        `SELECT * FROM "Customer"
         WHERE lower("name") LIKE $1 OR lower("email") LIKE $1 OR lower(COALESCE("phone", '')) LIKE $1
         ORDER BY "createdAt" DESC`,
        [`%${qs}%`]
      )).rows;
    } else {
      rows = (await q(`SELECT * FROM "Customer" ORDER BY "createdAt" DESC`)).rows;
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
    if (!name) return new Response(JSON.stringify({ ok:false, error:"Name ist erforderlich." }), { status:400 });

    const id = uuid();
    const email = body.email || null;
    const phone = body.phone || null;
    const addressStreet = body.addressStreet || null;
    const addressZip = body.addressZip || null;
    const addressCity = body.addressCity || null;
    const addressCountry = body.addressCountry || null;
    const note = body.note || null;

    const res = await q(
      `INSERT INTO "Customer"
       ("id","name","email","phone","addressStreet","addressZip","addressCity","addressCountry","note")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, name, email, phone, addressStreet, addressZip, addressCity, addressCountry, note]
    );

    return Response.json({ ok: true, data: res.rows[0] }, { status: 201 });
  } catch (e) {
    if (String(e).includes("duplicate key")) {
      return new Response(JSON.stringify({ ok:false, error:"E-Mail ist bereits vergeben." }), { status:400 });
    }
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:400 });
  }
}
