// app/api/customers/[id]/route.js
import { initDb, q } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(_req, { params }) {
  try {
    const userId = await requireUser();
    await initDb();
    const { id } = params;
    const row = (await q(`SELECT * FROM "Customer" WHERE "id"=$1 AND "userId"=$2`, [id, userId])).rows[0];
    if (!row) return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden" }), { status:404 });
    return Response.json({ ok:true, data: row });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:e.message === "Unauthorized" ? 401 : 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const userId = await requireUser();
    await initDb();
    const { id } = params;
    const body = await request.json().catch(()=> ({}));

    // Normalisierung (unterstützt alte/new UI-Feldnamen)
    const name = (body.name || "").trim();
    if (!name) return new Response(JSON.stringify({ ok:false, error:"Name ist erforderlich." }), { status:400 });

    const email = body.email ?? null;
    const phone = body.phone ?? body.tel ?? null;

    const addressStreet  = body.addressStreet ?? body.street ?? null;
    const addressZip     = body.addressZip ?? body.zip ?? body.plz ?? null;
    const addressCity    = body.addressCity ?? body.city ?? null;
    const addressCountry = body.addressCountry ?? body.country ?? null;

    const note = body.note ?? body.notes ?? null;

    const res = await q(
      `UPDATE "Customer"
       SET "name"=$1,
           "email"=$2,
           "phone"=$3,
           "addressStreet"=$4,
           "addressZip"=$5,
           "addressCity"=$6,
           "addressCountry"=$7,
           "note"=$8,
           "updatedAt"=CURRENT_TIMESTAMP
       WHERE "id"=$9 AND "userId"=$10
       RETURNING *`,
      [name, email, phone, addressStreet, addressZip, addressCity, addressCountry, note, id, userId]
    );
    if (res.rowCount === 0) return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden" }), { status:404 });
    return Response.json({ ok:true, data: res.rows[0] });
  } catch (e) {
    if (String(e).includes("duplicate key")) {
      return new Response(JSON.stringify({ ok:false, error:"E-Mail ist bereits vergeben." }), { status:400 });
    }
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:e.message === "Unauthorized" ? 401 : 400 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const userId = await requireUser();
    await initDb();
    const { id } = params;
    const res = await q(`DELETE FROM "Customer" WHERE "id"=$1 AND "userId"=$2`, [id, userId]);
    if (res.rowCount === 0) return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden" }), { status:404 });
    return Response.json({ ok:true });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:e.message === "Unauthorized" ? 401 : 400 });
  }
}
