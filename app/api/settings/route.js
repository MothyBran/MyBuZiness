// /app/api/settings/route.js
import { NextResponse } from "next/server";
import { pool, initDb, ensureSchemaOnce } from "@/lib/db";

// App Router: niemals cachen, Node runtime
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Alle Spalten aus deiner "Settings"-Tabelle (Case-sensitiv!)
const SELECT_COLS = [
  "id","companyName","addressLine1","addressLine2","email","phone","iban","vatId",
  "currencyDefault","taxRateDefault","logoUrl","createdAt","updatedAt",
  "kleinunternehmer","showLogo","logoMime","primaryColor","accentColor","backgroundColor",
  "textColor","borderRadius","fontFamily","headerTitle","ownerName","address1","address2",
  "postalCode","city","website","bankAccount","currency","secondaryColor","proprietor",
  "bank","fontColor","reverseChargeDefault","ossEnabled","countryDefault",
  "shippingTaxFollowsMain","paymentTermsDays","invoiceNumberFormat","receiptNumberFormat",
  "accountsProfile","taxNumber","taxOffice",
];

// DB‑Row → API‑Objekt
function mapRow(row, includeLogoData = false) {
  const base = {
    id: row.id ?? null,
    companyName: row.companyname ?? null,
    addressLine1: row.addressline1 ?? null,
    addressLine2: row.addressline2 ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    iban: row.iban ?? null,
    vatId: row.vatid ?? null,
    currencyDefault: row.currencydefault ?? null,
    taxRateDefault: row.taxratedefault ?? null,
    logoUrl: row.logourl ?? null,
    createdAt: row.createdat?.toISOString?.() ?? row.createdat ?? null,
    updatedAt: row.updatedat?.toISOString?.() ?? row.updatedat ?? null,
    kleinunternehmer: row.kleinunternehmer ?? null,
    showLogo: row.showlogo ?? null,
    logoMime: row.logomime ?? null,
    primaryColor: row.primarycolor ?? null,
    accentColor: row.accentcolor ?? null,
    backgroundColor: row.backgroundcolor ?? null,
    textColor: row.textcolor ?? null,
    borderRadius: row.borderradius ?? null,
    fontFamily: row.fontfamily ?? null,
    headerTitle: row.headertitle ?? null,
    ownerName: row.ownername ?? null,
    address1: row.address1 ?? null,
    address2: row.address2 ?? null,
    postalCode: row.postalcode ?? null,
    city: row.city ?? null,
    website: row.website ?? null,
    bankAccount: row.bankaccount ?? null,
    currency: row.currency ?? null,
    secondaryColor: row.secondarycolor ?? null,
    proprietor: row.proprietor ?? null,
    bank: row.bank ?? null,
    fontColor: row.fontcolor ?? null,
    reverseChargeDefault: row.reversechargedefault ?? null,
    ossEnabled: row.ossenabled ?? null,
    countryDefault: row.countrydefault ?? null,
    shippingTaxFollowsMain: row.shippingtaxfollowsmain ?? null,
    paymentTermsDays: row.paymenttermsdays ?? null,
    invoiceNumberFormat: row.invoicenumberformat ?? null,
    receiptNumberFormat: row.receiptnumberformat ?? null,
    accountsProfile: row.accountsprofile ?? null,
    taxNumber: row.taxnumber ?? null,
    taxOffice: row.taxoffice ?? null,
  };

  if (includeLogoData) base.logoData = row.logodata ?? null;
  return base;
}

// GET /api/settings  (optional: ?withLogo=1 → logoDataBase64)
export async function GET(request) {
  try {
    await initDb();           // erzeugt Tabellen inkl. "Settings" (id='singleton')
    await ensureSchemaOnce(); // weitere Schema-Teile (z. B. Appointment)

    const { searchParams } = new URL(request.url);
    const withLogo = searchParams.get("withLogo") === "1";

    const logoPart = withLogo ? `, "logoData"` : "";
    const sql = `SELECT ${SELECT_COLS.map(c => `"${c}"`).join(", ")}${logoPart}
                 FROM "Settings"
                 WHERE "id" = 'singleton'
                 LIMIT 1;`;

    const { rows } = await pool.query(sql);

    // Fallback: Standard-Datensatz anlegen
    if (rows.length === 0) {
      const ins = await pool.query(
        `INSERT INTO "Settings"
          ("id","companyName","currencyDefault","taxRateDefault","createdAt","updatedAt")
         VALUES ('singleton','Mein Unternehmen','EUR',19,NOW(),NOW())
