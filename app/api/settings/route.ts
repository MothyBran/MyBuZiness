// app/api/settings/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextResponse } from "next/server";

// HINWEIS: Dein DB-Helper liegt bei dir unter lib/db.js
// Der Import funktioniert auch aus TS, wenn du dort "export function query(...)" hast.
import { query } from "@/lib/db";

const SELECT_ONE = `SELECT * FROM "Settings" LIMIT 1;`;

// Nur erlaubte Felder patchen (Passe bei Bedarf an deine Spalten an)
const ALLOWED = new Set([
  "companyName", "headerTitle", "email", "phone", "iban", "vatId",
  "currency", "currencyDefault",
  "primaryColor", "secondaryColor", "accentColor",
  "backgroundColor", "textColor",
  "borderRadius", "fontFamily",
  "logoUrl", "showLogo"
]);

const DEFAULTS = {
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

export async function GET() {
  try {
    const { rows } = await query(SELECT_ONE);
    // Wenn Tabelle leer, Defaults zurückgeben – aber niemals 500
    const data = rows?.[0] ?? DEFAULTS;
    return NextResponse.json({ data });
  } catch (err: any) {
    // KEIN 500 zum Frontend – sonst lädt das Layout nie.
    return NextResponse.json(
      { data: DEFAULTS, warning: String(err?.message ?? err) },
      { status: 200 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const keys = Object.keys(body).filter((k) => ALLOWED.has(k));
    if (keys.length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    // Sicherstellen, dass es genau 1 Settings‑Datensatz gibt:
    const { rows } = await query(SELECT_ONE);
    if (!rows?.[0]) {
      // lege einen Dummy an, falls leer (id optional, je nach Schema)
      await query(`INSERT INTO "Settings" ("companyName","headerTitle","currencyDefault") VALUES ($1,$2,$3);`, [
        DEFAULTS.companyName,
        DEFAULTS.headerTitle,
        DEFAULTS.currencyDefault
      ]);
    }

    const sets = keys.map((k, i) => `"${k}" = $${i + 1}`).join(", ");
    const values = keys.map((k) => body[k]);
    const sql = `UPDATE "Settings" SET ${sets}, "updatedAt" = NOW()
                 WHERE id = (SELECT id FROM "Settings" LIMIT 1)
                 RETURNING *;`;

    const upd = await query(sql, values);
    return NextResponse.json({ data: upd.rows?.[0] ?? {} });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
