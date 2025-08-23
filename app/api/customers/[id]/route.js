// app/api/customers/[id]/route.js
import { q, ensureSchemaOnce } from "@/lib/db";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function GET(_req, { params }) {
  await ensureSchemaOnce();
  try {
    const { id } = params;
    const res = await q(
      `SELECT id, name, email, note, phone,
              "addressStreet", "addressZip", "addressCity", "addressCountry",
              "createdAt", "updatedAt"
       FROM "Customer"
       WHERE id = $1
       LIMIT 1`,
      [id]
    );
    if (res.rowCount === 0) return json({ ok: false, error: "Not found" }, 404);
    return json({ ok: true, item: res.rows[0] });
  } catch (e) {
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}

export async function PUT(req, { params }) {
  await ensureSchemaOnce();
  try {
    const { id } = params;
    const body = await req.json();

    const res = await q(
      `UPDATE "Customer"
         SET name = $2,
             email = $3,
             note = $4,
             phone = $5,
             "addressStreet" = $6,
             "addressZip" = $7,
             "addressCity" = $8,
             "addressCountry" = $9,
             "updatedAt" = NOW()
       WHERE id = $1
       RETURNING id`,
      [
        id,
        body?.name ?? null,
        body?.email ?? null,
        body?.note ?? null,
        body?.phone ?? null,
        body?.addressStreet ?? null,
        body?.addressZip ?? null,
        body?.addressCity ?? null,
        body?.addressCountry ?? null,
      ]
    );

    if (res.rowCount === 0) return json({ ok: false, error: "Not found" }, 404);
    return json({ ok: true, id: res.rows[0].id });
  } catch (e) {
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}

export async function DELETE(_req, { params }) {
  await ensureSchemaOnce();
  try {
    const { id } = params;
    const res = await q('DELETE FROM "Customer" WHERE id = $1', [id]);
    if (res.rowCount === 0) return json({ ok: false, error: "Not found" }, 404);
    return json({ ok: true, deleted: id });
  } catch (e) {
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}
