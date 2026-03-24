// app/api/finances/tax/route.js
import { NextResponse } from "next/server";
import { q, uuid, initDb } from "@/lib/db";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Vereinfachte Einkommensteuerberechnung nach Grundtarif (grob für DE)
function calculateIncomeTaxEstimate(taxableIncome, year) {
  // Grundfreibetrag (GFB) je nach Jahr
  let gfb = 11604; // 2024
  if (year === 2023) gfb = 10908;
  if (year === 2022) gfb = 10347;
  if (year >= 2025) gfb = 12084; // geschätzt/geplant

  if (taxableIncome <= gfb) return 0;

  // Grobe pauschale Schätzung für den Rest (Progressionszone bis Spitzensteuersatz)
  // Dies ist keine exakte Berechnung nach § 32a EStG, sondern eine Schätzung für die Rücklage!
  const incomeAboveGfb = taxableIncome - gfb;

  // Einfache Staffelung als Näherung
  let tax = 0;
  if (incomeAboveGfb <= 15000) {
    tax = incomeAboveGfb * 0.20; // ca. 20% in der ersten Zone
  } else if (incomeAboveGfb <= 45000) {
    tax = (15000 * 0.20) + ((incomeAboveGfb - 15000) * 0.30);
  } else {
    tax = (15000 * 0.20) + (30000 * 0.30) + ((incomeAboveGfb - 45000) * 0.42);
  }

  return Math.round(tax);
}

// Ermittelt Einnahmen/Ausgaben pro Jahr
async function getEuerYear(year, userId) {
  const from = `${year}-01-01`;
  const to = `${year + 1}-01-01`;

  // FinanceTransaction
  const txRes = await q(`
    SELECT
      COALESCE(SUM(CASE WHEN "kind"='income'  THEN "netCents" END),0)::int AS inc_net,
      COALESCE(SUM(CASE WHEN "kind"='expense' THEN "netCents" END),0)::int AS exp_net
    FROM "FinanceTransaction"
    WHERE "bookedOn" >= $1 AND "bookedOn" < $2 AND "userId"=$3
  `, [from, to, userId]);

  // Receipts (nur Einnahmen als Quittung - optional, falls Ausgaben auch Belege haben, ist es schon in FinanceTx)
  const recRes = await q(`
    SELECT COALESCE(SUM("netCents"),0)::int AS rec_net
    FROM "Receipt"
    WHERE "date" >= $1 AND "date" < $2 AND "userId"=$3
  `, [from, to, userId]);

  // Invoices
  const invRes = await q(`
    SELECT COALESCE(SUM("netCents"),0)::int AS inv_net
    FROM "Invoice"
    WHERE (
      ("paidAt" IS NOT NULL AND "paidAt"::date >= $1 AND "paidAt"::date < $2)
      OR
      ("paidAt" IS NULL AND "status" IN ('paid','done') AND "issueDate" >= $1 AND "issueDate" < $2)
    ) AND "status" != 'canceled' AND "status" != 'storniert'
    AND "userId"=$3
  `, [from, to, userId]);

  const tx = txRes.rows[0] || {inc_net:0, exp_net:0};
  const rec = recRes.rows[0] || {rec_net:0};
  const inv = invRes.rows[0] || {inv_net:0};

  const incomeNetCents = (tx.inc_net || 0) + (rec.rec_net || 0) + (inv.inv_net || 0);
  const expenseNetCents = (tx.exp_net || 0);

  return { incomeNetCents, expenseNetCents, profitCents: incomeNetCents - expenseNetCents };
}

export async function GET(req) {
  try {
    const auth = await getUser();
    if (!auth) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const uId = auth.ownerId || auth.id;

    await initDb();

    const { searchParams } = new URL(req.url);
    const yearStr = searchParams.get("year");
    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();

    // 1. Hole Steuer-Settings/Werte für das Jahr aus der neuen Tabelle
    let taxYearData = {
      year,
      gewerbesteuerHebesatz: 400,
      estVorauszahlungCents: 0,
      gewstVorauszahlungCents: 0,
      ustVorauszahlungCents: 0,
      tatsaechlicheEstCents: null,
      tatsaechlicheGewstCents: null,
      tatsaechlicheUstCents: null
    };

    const { rows } = await q(`SELECT * FROM "TaxYear" WHERE "year" = $1 AND "userId" = $2`, [year, uId]);
    if (rows.length > 0) {
      taxYearData = { ...rows[0] };
    }

    // 2. Hole EÜR Gewinn/Verlust für das Jahr
    const euer = await getEuerYear(year, uId);
    const profitEur = euer.profitCents / 100;

    // 3. Berechne Schätzungen
    let estimatedGewStCents = 0;
    let estimatedEStCents = 0;

    if (profitEur > 0) {
      // Gewerbesteuer Schätzung (Freibetrag 24.500 € für Einzelunternehmen)
      const gewstFreibetrag = 24500;
      let gewerbeErtrag = profitEur - gewstFreibetrag;
      if (gewerbeErtrag < 0) gewerbeErtrag = 0;

      // Steuermessbetrag = 3,5% vom Gewerbeertrag
      const steuermessbetrag = gewerbeErtrag * 0.035;

      // Gewerbesteuer = Steuermessbetrag * (Hebesatz / 100)
      const gewst = steuermessbetrag * (taxYearData.gewerbesteuerHebesatz / 100);
      estimatedGewStCents = Math.round(gewst * 100);

      // Einkommensteuer Schätzung
      // Anrechnung der GewSt auf ESt: das 3,8-fache des Steuermessbetrags (bis max zur tats. GewSt)
      const anrechnungGewSt = Math.min(steuermessbetrag * 3.8, gewst);

      // Rohe Einkommensteuerschätzung
      const rohEst = calculateIncomeTaxEstimate(profitEur, year);

      // Abzug der GewSt-Anrechnung
      let est = rohEst - anrechnungGewSt;
      if (est < 0) est = 0;

      estimatedEStCents = Math.round(est * 100);
    }

    return NextResponse.json({
      ok: true,
      data: taxYearData,
      euer,
      estimates: {
        gewstCents: estimatedGewStCents,
        estCents: estimatedEStCents
      }
    });

  } catch (error) {
    console.error("Tax API GET error:", error);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await getUser();
    if (!auth) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const uId = auth.ownerId || auth.id;

    await initDb();

    const body = await req.json();
    const {
      year,
      gewerbesteuerHebesatz,
      estVorauszahlungCents,
      gewstVorauszahlungCents,
      ustVorauszahlungCents,
      tatsaechlicheEstCents,
      tatsaechlicheGewstCents,
      tatsaechlicheUstCents
    } = body;

    if (!year) {
      return NextResponse.json({ ok: false, error: "Year is required" }, { status: 400 });
    }

    // Check if exists
    const { rows } = await q(`SELECT id FROM "TaxYear" WHERE "year" = $1 AND "userId" = $2`, [year, uId]);

    if (rows.length > 0) {
      // Update
      await q(`
        UPDATE "TaxYear" SET
          "gewerbesteuerHebesatz" = $1,
          "estVorauszahlungCents" = $2,
          "gewstVorauszahlungCents" = $3,
          "ustVorauszahlungCents" = $4,
          "tatsaechlicheEstCents" = $5,
          "tatsaechlicheGewstCents" = $6,
          "tatsaechlicheUstCents" = $7,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "year" = $8 AND "userId" = $9
      `, [
        gewerbesteuerHebesatz ?? 400,
        estVorauszahlungCents ?? 0,
        gewstVorauszahlungCents ?? 0,
        ustVorauszahlungCents ?? 0,
        tatsaechlicheEstCents,
        tatsaechlicheGewstCents,
        tatsaechlicheUstCents,
        year,
        uId
      ]);
    } else {
      // Insert
      const newId = uuid();
      await q(`
        INSERT INTO "TaxYear" (
          "id", "year", "userId",
          "gewerbesteuerHebesatz",
          "estVorauszahlungCents",
          "gewstVorauszahlungCents",
          "ustVorauszahlungCents",
          "tatsaechlicheEstCents",
          "tatsaechlicheGewstCents",
          "tatsaechlicheUstCents"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        newId, year, uId,
        gewerbesteuerHebesatz ?? 400,
        estVorauszahlungCents ?? 0,
        gewstVorauszahlungCents ?? 0,
        ustVorauszahlungCents ?? 0,
        tatsaechlicheEstCents,
        tatsaechlicheGewstCents,
        tatsaechlicheUstCents
      ]);
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Tax API POST error:", error);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
