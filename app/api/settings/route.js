// app/api/settings/route.js
import { initDb, q, uuid } from "@/lib/db";
import { NextResponse } from "next/server";

// Wir halten genau eine Settings-Zeile (singleton)
async function fetchOne() {
  const rows = (await q(`SELECT * FROM "Settings" ORDER BY "createdAt" ASC LIMIT 1`)).rows;
  return rows[0] || null;
}

export async function GET() {
  try {
    await initDb();
    const row = await fetchOne();
    return NextResponse.json({ ok: true, data: row || {} });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await initDb();
    const body = await request.json().catch(() => ({}));

    const payload = {
      companyName: body.companyName ?? null,
      ownerName: body.ownerName ?? null,
      address1: body.address1 ?? null,
      address2: body.address2 ?? null,
      postalCode: body.postalCode ?? null,
      city: body.city ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      website: body.website ?? null,
      bankAccount: body.bankAccount ?? null,
      vatId: body.vatId ?? null,
      kleinunternehmer: !!body.kleinunternehmer,
      currency: body.currency ?? "EUR",
      logoUrl: body.logoUrl ?? null,
      primaryColor: body.primaryColor ?? "#06b6d4",
      secondaryColor: body.secondaryColor ?? "#0ea5e9",
      fontFamily: body.fontFamily ?? "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      textColor: body.textColor ?? "#0f172a",
    };

    const existing = await fetchOne();
    if (!existing) {
      const id = uuid();
      await q(
        `INSERT INTO "Settings" (
          "id","companyName","ownerName","address1","address2","postalCode","city",
          "phone","email","website","bankAccount","vatId","kleinunternehmer","currency",
          "logoUrl","primaryColor","secondaryColor","fontFamily","textColor","createdAt","updatedAt"
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,
          $8,$9,$10,$11,$12,$13,$14,
          $15,$16,$17,$18,$19, now(), now()
        )`,
        [
          id,
          payload.companyName, payload.ownerName, payload.address1, payload.address2, payload.postalCode, payload.city,
          payload.phone, payload.email, payload.website, payload.bankAccount, payload.vatId, payload.kleinunternehmer, payload.currency,
          payload.logoUrl, payload.primaryColor, payload.secondaryColor, payload.fontFamily, payload.textColor
        ]
      );
    } else {
      await q(
        `UPDATE "Settings" SET
          "companyName"=$2, "ownerName"=$3, "address1"=$4, "address2"=$5, "postalCode"=$6, "city"=$7,
          "phone"=$8, "email"=$9, "website"=$10, "bankAccount"=$11, "vatId"=$12, "kleinunternehmer"=$13, "currency"=$14,
          "logoUrl"=$15, "primaryColor"=$16, "secondaryColor"=$17, "fontFamily"=$18, "textColor"=$19, "updatedAt"=now()
         WHERE "id" = $1`,
        [
          existing.id,
          payload.companyName, payload.ownerName, payload.address1, payload.address2, payload.postalCode, payload.city,
          payload.phone, payload.email, payload.website, payload.bankAccount, payload.vatId, payload.kleinunternehmer, payload.currency,
          payload.logoUrl, payload.primaryColor, payload.secondaryColor, payload.fontFamily, payload.textColor
        ]
      );
    }

    const fresh = await fetchOne();
    return NextResponse.json({ ok: true, data: fresh });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 400 });
  }
}
