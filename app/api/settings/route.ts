// app/api/settings/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { query } from "@/lib/db"; // wichtig: dein db-Helper aus lib/db.js

// Nur erlaubte Felder updaten
const updateAllowed = new Set([
  "companyName","addressLine1","addressLine2","email","phone","iban","vatId",
  "currency","currencyDefault","taxRateDefault","logoUrl","kleinunternehmer","showLogo",
  "primaryColor","secondaryColor","accentColor","backgroundColor","textColor","fontColor",
  "borderRadius","fontFamily","headerTitle","ownerName","address1","address2","postalCode",
  "city","website","bankAccount","proprietor","bank","reverseChargeDefault","ossEnabled",
  "countryDefault","shippingTaxFollowsMain","paymentTermsDays","invoiceNumberFormat",
  "receiptNumberFormat","accountsProfile","taxNumber","taxOffice"
]);

// GET Settings (immer nur ein Eintrag)
export async function GET() {
  try {
    const { rows } = await query(`SELECT * FROM "Settings" LIMIT 1;`);
    const data = rows?.[0] ?? {};
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Settings fetch failed", details: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}

// PATCH Settings
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const keys = Object.keys(body).filter((k) => updateAllowed.has(k));
    if (keys.length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    const sets = keys.map((k, i) => `"${k}" = $${i + 1}`).join(", ");
    const values = keys.map((k) => body[k]);

    const sql = `UPDATE "Settings" SET ${sets}, "updatedAt"=NOW() WHERE id = (
                   SELECT id FROM "Settings" LIMIT 1
                 ) RETURNING *;`;

    const { rows } = await query(sql, values);
    const data = rows?.[0] ?? {};
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Settings update failed", details: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
