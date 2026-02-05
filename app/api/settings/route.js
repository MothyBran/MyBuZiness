// app/api/settings/route.js
import { initDb, q, uuid } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

/**
 * Lädt genau EINEN Settings‑Datensatz (den ersten), und
 * setzt sinnvolle Defaults inkl. taxRateDefault.
 */
async function fetchOne(userId) {
  const rows = (await q(
    `SELECT
       "id",
       COALESCE("companyName",'')       AS "companyName",
       COALESCE("ownerName",'')         AS "ownerName",
       COALESCE("address1",'')          AS "address1",
       COALESCE("address2",'')          AS "address2",
       COALESCE("postalCode",'')        AS "postalCode",
       COALESCE("city",'')              AS "city",
       COALESCE("phone",'')             AS "phone",
       COALESCE("email",'')             AS "email",
       COALESCE("website",'')           AS "website",
       COALESCE("bankAccount",'')       AS "bankAccount",
       COALESCE("vatId",'')             AS "vatId",
       COALESCE("kleinunternehmer", true) AS "kleinunternehmer",
       COALESCE("currency",'EUR')       AS "currency",
       COALESCE("logoUrl",'')           AS "logoUrl",
       COALESCE("primaryColor",'#06b6d4')   AS "primaryColor",
       COALESCE("secondaryColor",'#0ea5e9') AS "secondaryColor",
       COALESCE("fontFamily",'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif') AS "fontFamily",
       COALESCE("textColor",'#0f172a')  AS "textColor",
       /* NEU: Standard-Steuersatz, nur relevant wenn NICHT KU */
       COALESCE("taxRateDefault", 19)::int AS "taxRateDefault",
       "createdAt",
       "updatedAt"
     FROM "Settings"
     WHERE "userId" = $1
     ORDER BY "createdAt" ASC
     LIMIT 1`,
     [userId]
  )).rows;
  return rows[0] || null;
}

export async function GET() {
  try {
    const userId = await requireUser();
    await initDb();
    const row = await fetchOne(userId);
    const data = row ? { ...row, owner: row.ownerName ?? null } : {};
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}

export async function PUT(request) {
  try {
    const userId = await requireUser();
    await initDb();
    const body = await request.json().catch(() => ({}));

    // Akzeptiere weiterhin "owner" als Alias
    const ownerName = body.ownerName ?? body.owner ?? null;

    // NEU: taxRateDefault (sicher als Integer)
    let taxRateDefault = Number(body.taxRateDefault);
    if (!Number.isFinite(taxRateDefault)) taxRateDefault = 19;
    taxRateDefault = Math.max(0, Math.trunc(taxRateDefault)); // keine Nachkommastellen

    const payload = {
      companyName: body.companyName ?? null,
      ownerName,
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
      taxRateDefault, // NEU
    };

    const existing = await fetchOne(userId);

    if (!existing) {
      const id = uuid();
      await q(
        `INSERT INTO "Settings" (
           "id","companyName","ownerName","address1","address2","postalCode","city",
           "phone","email","website","bankAccount","vatId","kleinunternehmer","currency",
           "logoUrl","primaryColor","secondaryColor","fontFamily","textColor","taxRateDefault",
           "createdAt","updatedAt","userId"
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,
           $8,$9,$10,$11,$12,$13,$14,
           $15,$16,$17,$18,$19,$20,
           now(), now(), $21
         )`,
        [
          id,
          payload.companyName, payload.ownerName, payload.address1, payload.address2, payload.postalCode, payload.city,
          payload.phone, payload.email, payload.website, payload.bankAccount, payload.vatId, payload.kleinunternehmer, payload.currency,
          payload.logoUrl, payload.primaryColor, payload.secondaryColor, payload.fontFamily, payload.textColor, payload.taxRateDefault,
          userId
        ]
      );
    } else {
      await q(
        `UPDATE "Settings" SET
           "companyName"=$2, "ownerName"=$3, "address1"=$4, "address2"=$5, "postalCode"=$6, "city"=$7,
           "phone"=$8, "email"=$9, "website"=$10, "bankAccount"=$11, "vatId"=$12, "kleinunternehmer"=$13, "currency"=$14,
           "logoUrl"=$15, "primaryColor"=$16, "secondaryColor"=$17, "fontFamily"=$18, "textColor"=$19,
           "taxRateDefault"=$20,
           "updatedAt"=now()
         WHERE "id" = $1 AND "userId" = $21`,
        [
          existing.id,
          payload.companyName, payload.ownerName, payload.address1, payload.address2, payload.postalCode, payload.city,
          payload.phone, payload.email, payload.website, payload.bankAccount, payload.vatId, payload.kleinunternehmer, payload.currency,
          payload.logoUrl, payload.primaryColor, payload.secondaryColor, payload.fontFamily, payload.textColor,
          payload.taxRateDefault,
          userId
        ]
      );
    }

    const fresh = await fetchOne(userId);
    const data = fresh ? { ...fresh, owner: fresh.ownerName ?? null } : {};
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: e.message === "Unauthorized" ? 401 : 400 });
  }
}
