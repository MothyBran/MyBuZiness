// app/api/appointments/route.js
import { q, ensureSchemaOnce } from "@/lib/db";

// Helfer
const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function GET() {
  await ensureSchemaOnce();
  try {
    const res = await q(
      'SELECT id, kind, title, date, "startAt", "endAt", "customerId", "customerName", note, status, "createdAt", "updatedAt" FROM "Appointment" ORDER BY "date" DESC, "startAt" ASC'
    );
    return json({ ok: true, items: res.rows });
  } catch (e) {
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}

export async function POST(req) {
  await ensureSchemaOnce();
  try {
    const body = await req.json();

    // id ist uuid in DB -> serverseitig generieren, wenn nicht geliefert
    const id = body?.id || crypto.randomUUID();

    const fields = {
      id,
      kind: body?.kind ?? null,
      title: body?.title ?? null,
      date: body?.date ?? null,
      startAt: body?.startAt ?? null,
      endAt: body?.endAt ?? null,
      customerId: body?.customerId ?? null,
      customerName: body?.customerName ?? null,
      note: body?.note ?? null,
      status: body?.status ?? "open",
    };

    const res = await q(
      `INSERT INTO "Appointment"
       (id, kind, title, date, "startAt", "endAt", "customerId", "customerName", note, status, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW(), NOW())
       RETURNING id`,
      [
        fields.id,
        fields.kind,
        fields.title,
        fields.date,
        fields.startAt,
        fields.endAt,
        fields.customerId,
        fields.customerName,
        fields.note,
        fields.status,
      ]
    );

    return json({ ok: true, id: res.rows[0].id }, 201);
  } catch (e) {
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}
