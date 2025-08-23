// /app/api/settings/route.js
import { NextResponse } from "next/server";
import { pool, initDb, ensureSchemaOnce } from "@/lib/db";

// App Router: Caching aus / in PROD immer dynamisch
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

  if (includeLogoData) {
    // row.logodata kann Buffer oder Uint8Array sein
    base.logoData = row.logodata ?? null;
  }

  return base;
}

const SELECT_COLS = [
  "id","companyName","addressLine1","addressLine2","email","phone","iban","vatId",
  "currencyDefault","taxRateDefault","logoUrl","createdAt","updatedAt",
  "kleinunternehmer","showLogo","logoMime","primaryColor","accentColor","backgroundColor",
  "textColor","borderRadius","fontFamily","headerTitle","ownerName","address1","address2",
  "postalCode","city","website","bankAccount","
