// app/api/customers/route.js
import { initDb, q, uuid } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(request) {
  try {
    const userId = await requireUser();
    await initDb();
    const { searchParams } = new URL(request.url);
    const qs = (searchParams.get("q") || "").trim().toLowerCase();

    let rows;
    if (qs) {
      rows = (await q(
        `SELECT * FROM "Customer"
         WHERE "userId" = $2
            AND (lower("name") LIKE $1
            OR lower("email") LIKE $1
            OR lower(COALESCE("phone", '')) LIKE $1
            OR lower(COALESCE("addressCity", '')) LIKE $1)
         ORDER BY "createdAt" DESC`,
        [`%${qs}%`, userId]
      )).rows;
    } else {
      rows = (await q(`SELECT * FROM "Customer" WHERE "userId" = $1 ORDER BY "createdAt" DESC`, [userId])).rows;
    }
    return Response.json({ ok: true, data: rows });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(request) {
  try {
    const userId = await requireUser();
    await initDb();
    const body = await request.json().catch(() => ({}));

    // Eingaben robust normalisieren (unterstützt alte/new UI-Feldnamen)
    const name = (body.name || "").trim();
    if (!name) return new Response(JSON.stringify({ ok:false, error:"Name ist erforderlich." }), { status:400 });

    const id = uuid();
    const email = body.email ?? null;
    const phone = body.phone ?? body.tel ?? null;

    const addressStreet  = body.addressStreet ?? body.street ?? null;
    const addressZip     = body.addressZip ?? body.zip ?? body.plz ?? null;
    const addressCity    = body.addressCity ?? body.city ?? null;
    const addressCountry = body.addressCountry ?? body.country ?? null;

    const note = body.note ?? body.notes ?? null;

    const res = await q(
      `INSERT INTO "Customer"
       ("id","name","email","phone","addressStreet","addressZip","addressCity","addressCountry","note","createdAt","updatedAt","userId")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,$10)
       RETURNING *`,
      [id, name, email, phone, addressStreet, addressZip, addressCity, addressCountry, note, userId]
    );

    return Response.json({ ok: true, data: res.rows[0] }, { status: 201 });
  } catch (e) {
    if (String(e).includes("duplicate key")) {
      return new Response(JSON.stringify({ ok:false, error:"E-Mail ist bereits vergeben." }), { status:400 });
    }
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:e.message === "Unauthorized" ? 401 : 400 });
  }
}
