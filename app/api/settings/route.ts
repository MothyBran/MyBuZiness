// app/api/settings/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { buildUpdateQuery, query } from "@/server/db";

// GET /api/settings  → eine Settings‑Zeile (erste)
export async function GET() {
  const { rows } = await query(`SELECT * FROM "Settings" ORDER BY "createdAt" DESC LIMIT 1;`); // Settings.* inkl. Farben, Fonts, InfoStripe … 
  return NextResponse.json(rows[0] || null);
}

// PATCH /api/settings  → erste Settings‑Zeile aktualisieren
export async function PATCH(req: NextRequest) {
  const b = await req.json();
  // hole id der "aktuellen" Settings
  const { rows } = await query(`SELECT "id" FROM "Settings" ORDER BY "createdAt" DESC LIMIT 1;`);
  if (!rows[0]) return NextResponse.json({ error: "No settings row" }, { status: 404 });

  const ALLOWED = [
    "companyName","headerTitle","ownerName","website",
    "primaryColor","secondaryColor","accentColor","backgroundColor","textColor","fontColor",
    "borderRadius","fontFamily","logoUrl","showLogo",
    "currency","currencyDefault","city","phone","email","iban","vatId","taxNumber","taxOffice"
  ]; // Settings‑Spalten, die dein UI nutzt 

  const upd = buildUpdateQuery("Settings", "id", rows[0].id, b, ALLOWED);
  if (!upd) return NextResponse.json({ error: "No valid fields" }, { status: 400 });

  const updated = await query(upd.text, upd.values);
  return NextResponse.json(updated.rows[0]);
}
