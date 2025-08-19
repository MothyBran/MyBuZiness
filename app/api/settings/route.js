// app/api/settings/route.js
import { initDb, q, uuid } from "@/lib/db";
import { NextResponse } from "next/server";

async function fetchOne() {
  const rows = (await q(
    `SELECT
       "id",
       COALESCE("companyName",'') AS "companyName",
       COALESCE("ownerName",'') AS "ownerName",
       COALESCE("address1",'') AS "address1",
       COALESCE("address2",'') AS "address2",
       COALESCE("postalCode",'') AS "postalCode",
       COALESCE("city",'') AS "city",
       COALESCE("phone",'') AS "phone",
       COALESCE("email",'') AS "email",
       COALESCE("website",'') AS "website",
       COALESCE("bankAccount",'') AS "bankAccount",
       COALESCE("vatId",'') AS "vatId",
       COALESCE("taxNumber",'') AS "taxNumber",
       COALESCE("taxOffice",'') AS "taxOffice",
       COALESCE("kleinunternehmer", true) AS "kleinunternehmer",
       COALESCE("taxRateDefault", 19)::numeric AS "taxRateDefault",
       COALESCE("taxRateReduced", 7)::numeric AS "taxRateReduced",
       COALESCE("reverseChargeDefault", false) AS "reverseChargeDefault",
       COALESCE("ossEnabled", false) AS "ossEnabled",
       COALESCE("countryDefault", 'DE') AS "countryDefault",
       COALESCE("shippingTaxFollowsMain", true) AS "shippingTaxFollowsMain",
       COALESCE("paymentTermsDays", 14)::int AS "paymentTermsDays",
       COALESCE("invoiceNumberFormat", '{YYYY}-{SEQ5}') AS "invoiceNumberFormat",
       COALESCE("receiptNumberFormat", '{YYYY}.{SEQ4}') AS "receiptNumberFormat",
       COALESCE("accountsProfile", 'SKR03') AS "accountsProfile",
       COALESCE("currency",'EUR') AS "currency",
       COALESCE("logoUrl",'') AS "logoUrl",
       COALESCE("primaryColor",'#06b6d4') AS "primaryColor",
       COALESCE("secondaryColor",'#0ea5e9') AS "secondaryColor",
       COALESCE("fontFamily",'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif') AS "fontFamily",
       COALESCE("textColor",'#0f172a') AS "textColor",
       "createdAt","updatedAt"
     FROM "Settings"
     ORDER BY "createdAt" ASC
     LIMIT 1`
  )).rows;
  return rows[0] || null;
}

export async function GET() {
  try {
    await initDb();
    const row = await fetchOne();
    const data = row ? { ...row, owner: row.ownerName ?? null } : {};
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await initDb();
    const b = await request.json().catch(() => ({}));
    const ownerName = b.ownerName ?? b.owner ?? null;

    // Normalisierungen (Zahlen/Booleans)
    const toNum = (v, d) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };
    const payload = {
      companyName: b.companyName ?? null,
      ownerName,
      address1: b.address1 ?? null,
      address2: b.address2 ?? null,
      postalCode: b.postalCode ?? null,
      city: b.city ?? null,
      phone: b.phone ?? null,
      email: b.email ?? null,
      website: b.website ?? null,
      bankAccount: b.bankAccount ?? null,
      vatId: b.vatId ?? null,
      taxNumber: b.taxNumber ?? null,
      taxOffice: b.taxOffice ?? null,
      kleinunternehmer: !!b.kleinunternehmer,
      taxRateDefault: toNum(b.taxRateDefault, 19),
      taxRateReduced: toNum(b.taxRateReduced, 7),
      reverseChargeDefault: !!b.reverseChargeDefault,
      ossEnabled: !!b.ossEnabled,
      countryDefault: b.countryDefault ?? "DE",
      shippingTaxFollowsMain: b.shippingTaxFollowsMain ?? true,
      paymentTermsDays: Math.max(0, Math.trunc(toNum(b.paymentTermsDays, 14))),
      invoiceNumberFormat: b.invoiceNumberFormat ?? "{YYYY}-{SEQ5}",
      receiptNumberFormat: b.receiptNumberFormat ?? "{YYYY}.{SEQ4}",
      accountsProfile: b.accountsProfile ?? "SKR03",
      currency: b.currency ?? "EUR",
      logoUrl: b.logoUrl ?? null,
      primaryColor: b.primaryColor ?? "#06b6d4",
      secondaryColor: b.secondaryColor ?? "#0ea5e9",
      fontFamily: b.fontFamily ?? "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      textColor: b.textColor ?? "#0f172a",
    };

    const existing = await fetchOne();
    if (!existing) {
      const id = uuid();
      await q(
        `INSERT INTO "Settings" (
           "id","companyName","ownerName","address1","address2","postalCode","city",
           "phone","email","website","bankAccount","vatId","taxNumber","taxOffice",
           "kleinunternehmer","taxRateDefault","taxRateReduced","reverseChargeDefault",
           "ossEnabled","countryDefault","shippingTaxFollowsMain","paymentTermsDays",
           "invoiceNumberFormat","receiptNumberFormat","accountsProfile",
           "currency","logoUrl","primaryColor","secondaryColor","fontFamily","textColor",
           "createdAt","updatedAt"
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,
           $8,$9,$10,$11,$12,$13,$14,
           $15,$16,$17,$18,
           $19,$20,$21,$22,
           $23,$24,$25,
           $26,$27,$28,$29,$30,$31,
           now(), now()
         )`,
        [
          id,
          payload.companyName, payload.ownerName, payload.address1, payload.address2, payload.postalCode, payload.city,
          payload.phone, payload.email, payload.website, payload.bankAccount, payload.vatId, payload.taxNumber, payload.taxOffice,
          payload.kleinunternehmer, payload.taxRateDefault, payload.taxRateReduced, payload.reverseChargeDefault,
          payload.ossEnabled, payload.countryDefault, payload.shippingTaxFollowsMain, payload.paymentTermsDays,
          payload.invoiceNumberFormat, payload.receiptNumberFormat, payload.accountsProfile,
          payload.currency, payload.logoUrl, payload.primaryColor, payload.secondaryColor, payload.fontFamily, payload.textColor
        ]
      );
    } else {
      await q(
        `UPDATE "Settings" SET
           "companyName"=$2, "ownerName"=$3, "address1"=$4, "address2"=$5, "postalCode"=$6, "city"=$7,
           "phone"=$8, "email"=$9, "website"=$10, "bankAccount"=$11, "vatId"=$12, "taxNumber"=$13, "taxOffice"=$14,
           "kleinunternehmer"=$15, "taxRateDefault"=$16, "taxRateReduced"=$17, "reverseChargeDefault"=$18,
           "ossEnabled"=$19, "countryDefault"=$20, "shippingTaxFollowsMain"=$21, "paymentTermsDays"=$22,
           "invoiceNumberFormat"=$23, "receiptNumberFormat"=$24, "accountsProfile"=$25,
           "currency"=$26, "logoUrl"=$27, "primaryColor"=$28, "secondaryColor"=$29, "fontFamily"=$30, "textColor"=$31,
           "updatedAt"=now()
         WHERE "id" = $1`,
        [
          existing.id,
          payload.companyName, payload.ownerName, payload.address1, payload.address2, payload.postalCode, payload.city,
          payload.phone, payload.email, payload.website, payload.bankAccount, payload.vatId, payload.taxNumber, payload.taxOffice,
          payload.kleinunternehmer, payload.taxRateDefault, payload.taxRateReduced, payload.reverseChargeDefault,
          payload.ossEnabled, payload.countryDefault, payload.shippingTaxFollowsMain, payload.paymentTermsDays,
          payload.invoiceNumberFormat, payload.receiptNumberFormat, payload.accountsProfile,
          payload.currency, payload.logoUrl, payload.primaryColor, payload.secondaryColor, payload.fontFamily, payload.textColor
        ]
      );
    }

    const fresh = await fetchOne();
    const data = fresh ? { ...fresh, owner: fresh.ownerName ?? null } : {};
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 400 });
  }
}
