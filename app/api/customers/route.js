// app/api/customers/route.js
import { initDb, q, uuid } from "@/lib/db";

export async function GET(request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const qStr = (searchParams.get("q") || "").trim();

    let rows;
    if (qStr) {
      rows = (await q(
        `SELECT * FROM "Customer"
         WHERE lower("name") LIKE $1 OR lower("email") LIKE $1 OR lower("note") LIKE $1
         ORDER BY "createdAt" DESC`,
        [`%${qStr.toLowerCase()}%`]
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
    const email = (body.email || "").trim() || null;
    const note = (body.note || "").trim() || null;
    if (!name) {
      return new Response(JSON.stringify({ ok: false, error: "Name ist erforderlich." }), { status: 400 });
    }

    const id = uuid();
    const res = await q(
      `INSERT INTO "Customer" ("id","name","email","note")
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [id, name, email, note]
    );
    return Response.json({ ok: true, data: res.rows[0] }, { status: 201 });
  } catch (e) {
    // unique violation?
    if (String(e).includes("duplicate key")) {
      return new Response(JSON.stringify({ ok: false, error: "E-Mail ist bereits vergeben." }), { status: 400 });
    }
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
}
