// app/api/customers/[id]/route.js
import { initDb, q } from "@/lib/db";

export async function GET(_req, { params }) {
  try {
    await initDb();
    const { id } = params;
    const row = (await q(`SELECT * FROM "Customer" WHERE "id"=$1`, [id])).rows[0];
    if (!row) return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden" }), { status:404 });
    return Response.json({ ok:true, data: row });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await initDb();
    const { id } = params;
    const body = await request.json().catch(()=> ({}));
    const name = (body.name || "").trim();
    if (!name) return new Response(JSON.stringify({ ok:false, error:"Name ist erforderlich." }), { status:400 });

    const email = (body.email || null);
    const note = (body.note || null);

    const res = await q(
      `UPDATE "Customer"
       SET "name"=$1, "email"=$2, "note"=$3, "updatedAt"=CURRENT_TIMESTAMP
       WHERE "id"=$4
       RETURNING *`,
      [name, email, note, id]
    );
    if (res.rowCount === 0) return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden" }), { status:404 });
    return Response.json({ ok:true, data: res.rows[0] });
  } catch (e) {
    if (String(e).includes("duplicate key")) {
      return new Response(JSON.stringify({ ok:false, error:"E-Mail ist bereits vergeben." }), { status:400 });
    }
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:400 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    await initDb();
    const { id } = params;
    const res = await q(`DELETE FROM "Customer" WHERE "id"=$1`, [id]);
    if (res.rowCount === 0) return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden" }), { status:404 });
    return Response.json({ ok:true });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:400 });
  }
}
