// app/api/settings/route.js
import { initDb, q, uuid } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireUser, getUser } from "@/lib/auth";

/**
 * Lädt genau EINEN Settings‑Datensatz (den ersten), und
 * setzt sinnvolle Defaults inkl. taxRateDefault.
 */
async function fetchOne(userId) {
  const rows = (await q(
    `SELECT
       "id",
       COALESCE("companyName",'')       AS "companyName",
       COALESCE("slogan",'')            AS "slogan",
       COALESCE("ownerName",'')         AS "ownerName",
       COALESCE("address1",'')          AS "address1",
       COALESCE("address2",'')          AS "address2",
       COALESCE("postalCode",'')        AS "postalCode",
       COALESCE("city",'')              AS "city",
       COALESCE("phone",'')             AS "phone",
       COALESCE("email",'')             AS "email",
       COALESCE("website",'')           AS "website",
       COALESCE("bankAccount",'')       AS "bankAccount",
       COALESCE("bankInstitution",'')   AS "bankInstitution",
       COALESCE("bankRecipient",'')     AS "bankRecipient",
       COALESCE("bankIban",'')          AS "bankIban",
       COALESCE("bankBic",'')           AS "bankBic",
       COALESCE("vatId",'')             AS "vatId",
       COALESCE("kleinunternehmer", true) AS "kleinunternehmer",
       COALESCE("currency",'EUR')       AS "currency",
       COALESCE("logoUrl",'')           AS "logoUrl",
       COALESCE("primaryColor",'#06b6d4')   AS "primaryColor",
       COALESCE("secondaryColor",'#0ea5e9') AS "secondaryColor",
       /* NEU: Standard-Steuersatz, nur relevant wenn NICHT KU */
       COALESCE("taxRateDefault", 19)::int AS "taxRateDefault",
       "dashboardConfig",
       "receiptNoteDefault",
       "appointmentSettings",
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
    const user = await getUser();
    if (!user) throw new Error("Unauthorized");
    if (user.role === 'employee') {
       return NextResponse.json({ ok: false, error: "Mitarbeiter dürfen keine Einstellungen ändern." }, { status: 403 });
    }
    const userId = user.ownerId || user.id;

    await initDb();
    const body = await request.json().catch(() => ({}));
    const existing = await fetchOne(userId);

    // Akzeptiere weiterhin "owner" als Alias
    const ownerName = body.ownerName ?? body.owner ?? (existing ? existing.ownerName : null);

    // NEU: taxRateDefault (sicher als Integer)
    let taxRateDefault = body.taxRateDefault !== undefined ? Number(body.taxRateDefault) : (existing ? existing.taxRateDefault : 19);
    if (!Number.isFinite(taxRateDefault)) taxRateDefault = 19;
    taxRateDefault = Math.max(0, Math.trunc(taxRateDefault)); // keine Nachkommastellen

    const payload = {
      companyName: body.companyName !== undefined ? body.companyName : (existing ? existing.companyName : null),
      slogan: body.slogan !== undefined ? body.slogan : (existing ? existing.slogan : null),
      ownerName,
      address1: body.address1 !== undefined ? body.address1 : (existing ? existing.address1 : null),
      address2: body.address2 !== undefined ? body.address2 : (existing ? existing.address2 : null),
      postalCode: body.postalCode !== undefined ? body.postalCode : (existing ? existing.postalCode : null),
      city: body.city !== undefined ? body.city : (existing ? existing.city : null),
      phone: body.phone !== undefined ? body.phone : (existing ? existing.phone : null),
      email: body.email !== undefined ? body.email : (existing ? existing.email : null),
      website: body.website !== undefined ? body.website : (existing ? existing.website : null),
      bankAccount: body.bankAccount !== undefined ? body.bankAccount : (existing ? existing.bankAccount : null),
      bankInstitution: body.bankInstitution !== undefined ? body.bankInstitution : (existing ? existing.bankInstitution : null),
      bankRecipient: body.bankRecipient !== undefined ? body.bankRecipient : (existing ? existing.bankRecipient : null),
      bankIban: body.bankIban !== undefined ? body.bankIban : (existing ? existing.bankIban : null),
      bankBic: body.bankBic !== undefined ? body.bankBic : (existing ? existing.bankBic : null),
      vatId: body.vatId !== undefined ? body.vatId : (existing ? existing.vatId : null),
      kleinunternehmer: body.kleinunternehmer !== undefined ? !!body.kleinunternehmer : (existing ? !!existing.kleinunternehmer : true),
      currency: body.currency !== undefined ? body.currency : (existing ? existing.currency : "EUR"),
      logoUrl: body.logoUrl !== undefined ? body.logoUrl : (existing ? existing.logoUrl : null),
      primaryColor: body.primaryColor !== undefined ? body.primaryColor : (existing ? existing.primaryColor : "#06b6d4"),
      secondaryColor: body.secondaryColor !== undefined ? body.secondaryColor : (existing ? existing.secondaryColor : "#0ea5e9"),
      taxRateDefault,
      dashboardConfig: body.dashboardConfig !== undefined ? body.dashboardConfig : (existing ? existing.dashboardConfig : {}),
      receiptNoteDefault: body.receiptNoteDefault !== undefined ? body.receiptNoteDefault : (existing ? existing.receiptNoteDefault : "Vielen Dank, ich freue mich auf deinen nächsten Besuch!"),
      appointmentSettings: body.appointmentSettings !== undefined ? body.appointmentSettings : (existing ? existing.appointmentSettings : { workdays: [1,2,3,4,5], start: "08:00", end: "18:00" }),
    };


    if (!existing) {
      const id = uuid();
      await q(
        `INSERT INTO "Settings" (
           "id","companyName","slogan","ownerName","address1","address2","postalCode","city",
           "phone","email","website","bankAccount","bankInstitution","bankRecipient","bankIban","bankBic","vatId","kleinunternehmer","currency",
           "logoUrl","primaryColor","secondaryColor","taxRateDefault",
           "dashboardConfig","receiptNoteDefault","appointmentSettings",
           "createdAt","updatedAt","userId"
         ) VALUES (
           $1,$2,$24,$3,$4,$5,$6,$7,
           $8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,
           $25,$26,$27,
           now(), now(), $23
         )`,
        [
          id,
          payload.companyName, payload.ownerName, payload.address1, payload.address2, payload.postalCode, payload.city,
          payload.phone, payload.email, payload.website, payload.bankAccount, payload.bankInstitution, payload.bankRecipient, payload.bankIban, payload.bankBic, payload.vatId, payload.kleinunternehmer, payload.currency,
          payload.logoUrl, payload.primaryColor, payload.secondaryColor, payload.taxRateDefault,
          userId, payload.slogan,
          JSON.stringify(payload.dashboardConfig), payload.receiptNoteDefault, JSON.stringify(payload.appointmentSettings)
        ]
      );
    } else {
      await q(
        `UPDATE "Settings" SET
           "companyName"=$2, "slogan"=$24, "ownerName"=$3, "address1"=$4, "address2"=$5, "postalCode"=$6, "city"=$7,
           "phone"=$8, "email"=$9, "website"=$10, "bankAccount"=$11, "bankInstitution"=$12, "bankRecipient"=$13, "bankIban"=$14, "bankBic"=$15, "vatId"=$16, "kleinunternehmer"=$17, "currency"=$18,
           "logoUrl"=$19, "primaryColor"=$20, "secondaryColor"=$21,
           "taxRateDefault"=$22,
           "dashboardConfig"=$25, "receiptNoteDefault"=$26, "appointmentSettings"=$27,
           "updatedAt"=now()
         WHERE "id" = $1 AND "userId" = $23`,
        [
          existing.id,
          payload.companyName, payload.ownerName, payload.address1, payload.address2, payload.postalCode, payload.city,
          payload.phone, payload.email, payload.website, payload.bankAccount, payload.bankInstitution, payload.bankRecipient, payload.bankIban, payload.bankBic, payload.vatId, payload.kleinunternehmer, payload.currency,
          payload.logoUrl, payload.primaryColor, payload.secondaryColor,
          payload.taxRateDefault,
          userId, payload.slogan,
          JSON.stringify(payload.dashboardConfig), payload.receiptNoteDefault, JSON.stringify(payload.appointmentSettings)
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
