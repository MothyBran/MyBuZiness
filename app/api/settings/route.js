import { initDb, q } from "@/lib/db";

export async function GET() {
  try {
    await initDb();
    const row = (await q(`SELECT * FROM "Settings" WHERE "id"='singleton'`)).rows[0];
    return Response.json({ ok: true, data: row || null });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await initDb();
    const body = await request.json().catch(() => ({}));
    const fields = [
      "companyName","addressLine1","addressLine2","email","phone",
      "iban","vatId","currencyDefault","taxRateDefault","logoUrl"
    ];
    const vals = fields.map(k => body[k] ?? null);

    const res = await q(
      `UPDATE "Settings"
       SET "companyName"=$1,"addressLine1"=$2,"addressLine2"=$3,"email"=$4,"phone"=$5,
           "iban"=$6,"vatId"=$7,"currencyDefault"=$8,"taxRateDefault"=$9,"logoUrl"=$10,
           "updatedAt"=CURRENT_TIMESTAMP
       WHERE "id"='singleton'
       RETURNING *`,
       vals
    );

    return Response.json({ ok: true, data: res.rows[0] });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
}
