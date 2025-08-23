// app/api/customers/route.js
import { q, ensureSchemaOnce } from "@/lib/db";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function GET() {
  await ensureSchemaOnce();
  try {
    const res = await q(
      `SELECT id, name, email, note, phone,
              "addressStreet", "addressZip", "addressCity", "addressCountry",
              "createdAt", "updatedAt"
       FROM "Customer"
       ORDER BY "createdAt" DESC NULLS LAST, name ASC`
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
    // In deiner DB ist Customer.id = text → wir können UUID-String verwenden
    const id = body?.id || crypto.randomUUID();

    const res = await q(
      `INSERT INTO "Customer"
        (id, name, email, note, phone,
         "addressStreet", "addressZip", "addressCity", "addressCountry",
         "createdAt", "updatedAt")
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
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

    return json({ ok: true, id: res.rows[0].id }, 201);
  } catch (e) {
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}
