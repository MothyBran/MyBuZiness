// app/api/settings/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { query } from "@/server/db";

/**
 * Wir liefern IMMER { data: Settings }, auch bei Fallbacks.
 * Falls Tabelle fehlt, legen wir on-the-fly einen Default an.
 */

const ensureTableSQL = `
CREATE TABLE IF NOT EXISTS "Settings" (
  "id" TEXT PRIMARY KEY,
  "companyName" TEXT,
  "headerTitle" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "iban" TEXT,
  "vatId" TEXT,
  "currencyDefault" TEXT NOT NULL DEFAULT 'EUR',
  "primaryColor" TEXT DEFAULT '#111827',
  "secondaryColor" TEXT DEFAULT '#0ea5e9',
  "accentColor" TEXT DEFAULT '#22c55e',
  "backgroundColor" TEXT DEFAULT '#0b1220',
  "textColor" TEXT DEFAULT '#e5e7eb',
  "borderRadius" INTEGER NOT NULL DEFAULT 12,
  "fontFamily" TEXT DEFAULT 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial',
  "logoUrl" TEXT,
  "showLogo" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "Settings" ("id","companyName","headerTitle","currencyDefault")
SELECT 'singleton','Mein Unternehmen','MyBuZiness','EUR'
WHERE NOT EXISTS (SELECT 1 FROM "Settings" WHERE "id"='singleton');
`;

const selectSQL = `SELECT * FROM "Settings" WHERE "id"='singleton' LIMIT 1;`;
const updateAllowed = new Set([
  "companyName","headerTitle","email","phone","iban","vatId",
  "currency","currencyDefault",
  "primaryColor","secondaryColor","accentColor","backgroundColor","textColor",
  "borderRadius","fontFamily","logoUrl","showLogo"
]);

export async function GET() {
  try {
    await query(ensureTableSQL);
    const { rows } = await query(selectSQL);
    const data = rows?.[0] ?? {};
    return NextResponse.json({ data });
  } catch (err: any) {
    // Fallback: niemals 500 an FE – immer eine sinnvolle Default-Konfiguration liefern
    const data = {
      companyName: "Mein Unternehmen",
      headerTitle: "MyBuZiness",
      currencyDefault: "EUR",
      primaryColor: "#111827",
      secondaryColor: "#0ea5e9",
      accentColor: "#22c55e",
      backgroundColor: "#0b1220",
      textColor: "#e5e7eb",
      borderRadius: 12,
      fontFamily:
        "Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial"
    };
    return NextResponse.json({ data, warning: String(err?.message ?? err) }, { status: 200 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    await query(ensureTableSQL);

    // Nur erlaubte Felder updaten
    const keys = Object.keys(body).filter((k) => updateAllowed.has(k));
    if (keys.length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }
    const sets = keys.map((k, i) => `"${k}" = $${i + 1}`).join(", ");
    const values = keys.map((k) => body[k]);
    const sql = `UPDATE "Settings" SET ${sets}, "updatedAt"=NOW() WHERE "id"='singleton' RETURNING *;`;

    const { rows } = await query(sql, values);
    const data = rows?.[0] ?? {};
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
