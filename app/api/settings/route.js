// app/api/settings/route.js
import { initDb, q } from "@/lib/db";

// Alle Felder, die wir speichern (ohne die BYTEA-Felder)
const FIELDS = [
  "companyName","addressLine1","addressLine2","email","phone",
  "iban","vatId","currencyDefault","taxRateDefault","logoUrl",
  "kleinunternehmer","showLogo","primaryColor","accentColor",
  "backgroundColor","textColor","borderRadius","fontFamily","headerTitle"
];

// Sorgt dafür, dass Tabelle + Spalten existieren (idempotent)
async function ensureSettingsShape() {
  await initDb();

  // Tabelle sicherstellen
  await q(`
    CREATE TABLE IF NOT EXISTS "Settings" (
      "id" TEXT PRIMARY KEY,
      "companyName" TEXT,
      "addressLine1" TEXT,
      "addressLine2" TEXT,
      "email" TEXT,
      "phone" TEXT,
      "iban" TEXT,
      "vatId" TEXT,
      "currencyDefault" TEXT NOT NULL DEFAULT 'EUR',
      "taxRateDefault" NUMERIC(5,2) NOT NULL DEFAULT 19,
      "logoUrl" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO "Settings" ("id","companyName","currencyDefault","taxRateDefault")
    SELECT 'singleton', 'Mein Unternehmen', 'EUR', 19
    WHERE NOT EXISTS (SELECT 1 FROM "Settings" WHERE "id"='singleton');
  `);

  // Spalten sicher nachziehen (falls Deployment/Branch hinterherhinkt)
  await q(`
    ALTER TABLE "Settings"
      ADD COLUMN IF NOT EXISTS "kleinunternehmer" BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "showLogo" BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "logoMime" TEXT,
      ADD COLUMN IF NOT EXISTS "logoData" BYTEA,
      ADD COLUMN IF NOT EXISTS "primaryColor" TEXT DEFAULT '#111111',
      ADD COLUMN IF NOT EXISTS "accentColor" TEXT DEFAULT '#2563eb',
      ADD COLUMN IF NOT EXISTS "backgroundColor" TEXT DEFAULT '#fafafa',
      ADD COLUMN IF NOT EXISTS "textColor" TEXT DEFAULT '#111111',
      ADD COLUMN IF NOT EXISTS "borderRadius" INTEGER NOT NULL DEFAULT 12,
      ADD COLUMN IF NOT EXISTS "fontFamily" TEXT DEFAULT 'system-ui, sans-serif',
      ADD COLUMN IF NOT EXISTS "headerTitle" TEXT DEFAULT 'MyBuZiness';
  `);
}

export async function GET() {
  try {
    await ensureSettingsShape();
    const row = (await q(`SELECT * FROM "Settings" WHERE "id"='singleton'`)).rows[0];
    return Response.json({ ok: true, data: row || null });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await ensureSettingsShape();
    const body = await request.json().catch(() => ({}));

    // Sanitize/normalize
    const patch = {};
    for (const k of FIELDS) patch[k] = body[k] ?? null;

    const vals = [
      patch.companyName, patch.addressLine1, patch.addressLine2, patch.email, patch.phone,
      patch.iban, patch.vatId, patch.currencyDefault, patch.taxRateDefault, patch.logoUrl,
      !!patch.kleinunternehmer, !!patch.showLogo, patch.primaryColor, patch.accentColor,
      patch.backgroundColor, patch.textColor,
      Number.isFinite(patch.borderRadius) ? patch.borderRadius : Number(patch.borderRadius) || 12,
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
