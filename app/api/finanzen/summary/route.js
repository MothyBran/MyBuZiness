// app/api/finanzen/summary/route.js
import { NextResponse } from "next/server";
import { q, initDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/* ---------- Perioden-Bounds ---------- */
function periodBounds(kind) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const start = new Date(today);
  const end = new Date(today);
  end.setDate(end.getDate() + 1); // exklusiv

  if (kind === "last7") {
    start.setDate(today.getDate() - 7);
  } else if (kind === "last30") {
    start.setDate(today.getDate() - 30);
  } else if (kind === "mtd") {
    start.setDate(1);
  } else if (kind === "today") {
    // bleibt
  } else {
    start.setFullYear(1970, 0, 1);
  }
  const toYMD = (d) => d.toISOString().slice(0,10);
  return { from: toYMD(start), to: toYMD(end) };
}

/* ---------- Summen FinanceTransaction (Periode) ---------- */
async function sumFinanceTx(userId, from, to) {
  const sql = `
    SELECT
      COALESCE(SUM(CASE WHEN "kind"='income'  THEN "grossCents" END),0)::int AS inc_gross,
      COALESCE(SUM(CASE WHEN "kind"='expense' THEN "grossCents" END),0)::int AS exp_gross,
      COALESCE(SUM(CASE WHEN "kind"='income'  THEN "netCents"   END),0)::int AS inc_net,
      COALESCE(SUM(CASE WHEN "kind"='expense' THEN "netCents"   END),0)::int AS exp_net
    FROM "FinanceTransaction"
    WHERE "userId"=$1 AND "bookedOn" >= $2 AND "bookedOn" < $3
  `;
  const { rows } = await q(sql, [userId, from, to]);
  return rows[0] || { inc_gross:0, exp_gross:0, inc_net:0, exp_net:0 };
}

/* ---------- Summen Receipts (Periode) ---------- */
async function sumReceipts(userId, from, to) {
  const sql = `
    SELECT
      COALESCE(SUM("grossCents"),0)::int AS rec_gross,
      COALESCE(SUM("netCents"),0)::int   AS rec_net
    FROM "Receipt"
    WHERE "userId"=$1 AND "date" >= $2 AND "date" < $3
  `;
  try {
    const { rows } = await q(sql, [userId, from, to]);
    return rows[0] || { rec_gross:0, rec_net:0 };
  } catch {
    return { rec_gross:0, rec_net:0 };
  }
}

/* ---------- Summen bezahlte/abgeschlossene Invoices (Periode) ---------- */
async function sumPaidInvoices(userId, from, to) {
  const sql = `
    SELECT
      COALESCE(SUM("grossCents"),0)::int AS inv_gross,
      COALESCE(SUM("netCents"),0)::int   AS inv_net
    FROM "Invoice"
    WHERE "userId"=$1 AND (
      ("paidAt" IS NOT NULL AND "paidAt"::date >= $2 AND "paidAt"::date < $3)
      OR
      ("paidAt" IS NULL AND "status" IN ('paid','done') AND "issueDate" >= $2 AND "issueDate" < $3)
    )
  `;
  try {
    const { rows } = await q(sql, [userId, from, to]);
    return rows[0] || { inv_gross:0, inv_net:0 };
  } catch {
    return { inv_gross:0, inv_net:0 };
  }
}

/* ---------- Settings ---------- */
async function getSettings(userId) {
  try {
    const { rows } = await q(`SELECT "kleinunternehmer" FROM "Settings" WHERE "userId"=$1 LIMIT 1`, [userId]);
    return { kleinunternehmer: !!rows?.[0]?.kleinunternehmer };
  } catch {
    return { kleinunternehmer: true };
  }
}

/* ---------- USt (nur FinanceTx, weil vatRate dort gepflegt) ---------- */
async function ustMtdFromFinanceTx(userId) {
  const sql = `
    SELECT
      COALESCE(SUM(CASE WHEN "kind"='income'  AND "vatRate"=19 THEN "netCents" END),0)::int AS u19_net,
      COALESCE(SUM(CASE WHEN "kind"='income'  AND "vatRate"=19 THEN "vatCents" END),0)::int AS u19_vat,
      COALESCE(SUM(CASE WHEN "kind"='income'  AND "vatRate"=7  THEN "netCents" END),0)::int AS u07_net,
      COALESCE(SUM(CASE WHEN "kind"='income'  AND "vatRate"=7  THEN "vatCents" END),0)::int AS u07_vat,
      COALESCE(SUM(CASE WHEN "kind"='expense' AND "vatRate"=19 THEN "vatCents" END),0)::int AS v19_vat,
      COALESCE(SUM(CASE WHEN "kind"='expense' AND "vatRate"=7  THEN "vatCents" END),0)::int AS v07_vat
    FROM "FinanceTransaction"
    WHERE "userId"=$1 AND date_trunc('month',"bookedOn") = date_trunc('month', CURRENT_DATE)
  `;
  const { rows } = await q(sql, [userId]);
  const r = rows[0] || { u19_net:0,u19_vat:0,u07_net:0,u07_vat:0,v19_vat:0,v07_vat:0 };
  return { ...r, zahllast: (r.u19_vat + r.u07_vat) - (r.v19_vat + r.v07_vat) };
}

/* ---------- EÜR (laufendes Jahr) inkl. Receipts+Invoices auf Einnahmenseite ---------- */
async function euerYearWithDocs(userId) {
  const y = new Date().getFullYear();
  const from = `${y}-01-01`, to = `${y+1}-01-01`;

  const [tx, rec, inv] = await Promise.all([
    q(`
      SELECT
        COALESCE(SUM(CASE WHEN "kind"='income'  THEN "netCents" END),0)::int AS inc_net,
        COALESCE(SUM(CASE WHEN "kind"='expense' THEN "netCents" END),0)::int AS exp_net
      FROM "FinanceTransaction"
      WHERE "userId"=$1 AND "bookedOn" >= $2 AND "bookedOn" < $3
    `,[userId, from,to]).then(r=>r.rows[0]||{inc_net:0,exp_net:0}),
    sumReceipts(userId, from, to),
    sumPaidInvoices(userId, from, to)
  ]);

  const incomeNet = (tx.inc_net || 0) + (rec.rec_net || 0) + (inv.inv_net || 0);
  const expenseNet = (tx.exp_net || 0);
  return { incomeNet, expenseNet };
}

export async function GET() {
  try {
    const userId = await requireUser();
    await initDb();
    const settings = await getSettings(userId);

    // Perioden, die die Kacheln nutzen
    const P = {
      today:  periodBounds("today"),
      last7:  periodBounds("last7"),
      last30: periodBounds("last30"),
      mtd:    periodBounds("mtd"),
    };

    // Hilfsbuilder: Einnahmen = FinanceTx(income) + Receipts + paid Invoices; Ausgaben = FinanceTx(expense)
    async function buildPeriod({ from, to }) {
      const [tx, rec, inv] = await Promise.all([
        sumFinanceTx(userId, from, to),
        sumReceipts(userId, from, to),
        sumPaidInvoices(userId, from, to),
      ]);
      const incomeCents = (tx.inc_gross || 0) + (rec.rec_gross || 0) + (inv.inv_gross || 0);
      const expenseCents = (tx.exp_gross || 0);
      return {
        incomeCents,
        expenseCents,
        adds: { receiptsGross: rec.rec_gross || 0, invoicesGross: inv.inv_gross || 0 }
      };
    }

    const [pToday, p7, p30, pMtd] = await Promise.all([
      buildPeriod(P.today), buildPeriod(P.last7), buildPeriod(P.last30), buildPeriod(P.mtd)
    ]);

    // Zusätze für das Tabellenjahr (für Hinweiszeile unter der Liste)
    const year = new Date().getFullYear();
    const yearFrom = `${year}-01-01`, yearTo = `${year+1}-01-01`;
    const [yearRec, yearInv] = await Promise.all([
      sumReceipts(userId, yearFrom, yearTo),
      sumPaidInvoices(userId, yearFrom, yearTo),
    ]);
    const additions = {
      year: {
        year,
        receiptsGross: yearRec.rec_gross || 0,
        invoicesGross: yearInv.inv_gross || 0,
        receiptsNet: yearRec.rec_net || 0,
        invoicesNet: yearInv.inv_net || 0
      }
    };

    // USt (nur FinanceTx)
    const ust_mtd = settings.kleinunternehmer ? null : await ustMtdFromFinanceTx(userId);

    // EÜR (Jahr)
    const euer = await euerYearWithDocs(userId);

    return NextResponse.json({
      ok: true,
      settings,
      periods: {
        today:  { incomeCents: pToday.incomeCents,  expenseCents: pToday.expenseCents },
        last7:  { incomeCents: p7.incomeCents,      expenseCents: p7.expenseCents },
        last30: { incomeCents: p30.incomeCents,     expenseCents: p30.expenseCents },
        mtd:    { incomeCents: pMtd.incomeCents,    expenseCents: pMtd.expenseCents },
      },
      adds: {
        today:  pToday.adds,
        last7:  p7.adds,
        last30: p30.adds,
        mtd:    pMtd.adds,
        ...additions
      },
      ust: { mtd: ust_mtd || { u19_net:0,u19_vat:0,u07_net:0,u07_vat:0,v19_vat:0,v07_vat:0,zahllast:0 } },
      euer: { year: euer }
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok:false, error:"Summary fehlgeschlagen." }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}
