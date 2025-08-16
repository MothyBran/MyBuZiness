// app/api/settings/route.js
import { initDb, q } from "@/lib/db";

const FIELDS = [
  "companyName","addressLine1","addressLine2","email","phone",
  "iban","vatId","currencyDefault","taxRateDefault","logoUrl",
  "kleinunternehmer","showLogo","primaryColor","accentColor",
  "backgroundColor","textColor","borderRadius","fontFamily","headerTitle"
];

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
    // Sanitize/normalize
    const patch = {};
    for (const k of FIELDS) patch[k] = body[k] ?? null;

    // Wenn Kleinunternehmer aktiv, kann taxRateDefault 0 sein (wir erzwingen nichts, nur speichern)
    const vals = [
      patch.companyName, patch.addressLine1, patch.addressLine2, patch.email, patch.phone,
      patch.iban, patch.vatId, patch.currencyDefault, patch.taxRateDefault, patch.logoUrl,
      !!patch.kleinunternehmer, !!patch.showLogo, patch.primaryColor, patch.accentColor,
      patch.backgroundColor, patch.textColor, Number.isFinite(patch.borderRadius) ? patch.borderRadius : 12,
      patch.fontFamily, patch.headerTitle
    ];

    const res = await q(
      `UPDATE "Settings"
       SET "companyName"=$1,"addressLine1"=$2,"addressLine2"=$3,"email"=$4,"phone"=$5,
           "iban"=$6,"vatId"=$7,"currencyDefault"=$8,"taxRateDefault"=$9,"logoUrl"=$10,
           "kleinunternehmer"=$11,"showLogo"=$12,"primaryColor"=$13,"accentColor"=$14,
           "backgroundColor"=$15,"textColor"=$16,"borderRadius"=$17,"fontFamily"=$18,"headerTitle"=$19,
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
