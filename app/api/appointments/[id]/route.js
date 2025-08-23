// app/api/appointments/[id]/route.js
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
      'SELECT id, kind, title, date, "startAt", "endAt", "customerId", "customerName", note, status, "createdAt", "updatedAt" FROM "Appointment" WHERE id = $1 LIMIT 1',
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
      `UPDATE "Appointment"
         SET kind = $2,
             title = $3,
             date = $4,
             "startAt" = $5,
             "endAt" = $6,
             "customerId" = $7,
             "customerName" = $8,
             note = $9,
             status = $10,
             "updatedAt" = NOW()
       WHERE id = $1
       RETURNING id`,
      [
        id,
        body?.kind ?? null,
        body?.title ?? null,
        body?.date ?? null,
        body?.startAt ?? null,
        body?.endAt ?? null,
        body?.customerId ?? null,
        body?.customerName ?? null,
        body?.note ?? null,
        body?.status ?? "open",
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
    const res = await q('DELETE FROM "Appointment" WHERE id = $1', [id]);
    if (res.rowCount === 0) return json({ ok: false, error: "Not found" }, 404);
    return json({ ok: true, deleted: id });
  } catch (e) {
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}
