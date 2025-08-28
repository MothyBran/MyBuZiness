// app/api/finanzen/summary/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

function periodSQL(days){
  return `
    SELECT
      COALESCE(SUM(CASE WHEN "kind"='income'  THEN "grossCents" END),0)::int AS income,
      COALESCE(SUM(CASE WHEN "kind"='expense' THEN "grossCents" END),0)::int AS expense
    FROM "FinanceTransaction"
    WHERE "bookedOn" >= (CURRENT_DATE - INTERVAL '${days} days')
  `;
}

export async function GET(){
  try{
    const [today, last7, last30, mtd, settings] = await Promise.all([
      q(periodSQL(0)), q(periodSQL(7)), q(periodSQL(30)),
      q(`SELECT
            COALESCE(SUM(CASE WHEN "kind"='income'  THEN "grossCents" END),0)::int AS income,
            COALESCE(SUM(CASE WHEN "kind"='expense' THEN "grossCents" END),0)::int AS expense
         FROM "FinanceTransaction"
         WHERE date_trunc('month',"bookedOn") = date_trunc('month', CURRENT_DATE)`),
      q(`SELECT "kleinunternehmer" FROM "Settings" WHERE "id"='singleton'`).catch(()=>({ rows:[{kleinunternehmer:true}] }))
    ]);

    const klein = settings.rows?.[0]?.kleinunternehmer ?? true;

    // USt-Aufschlüsselung (aktueller Monat)
    let u = { u19_net:0, u19_vat:0, u07_net:0, u07_vat:0, v19_vat:0, v07_vat:0, zahllast:0 };
    if(!klein){
      const ust = await q(`
        SELECT
          COALESCE(SUM(CASE WHEN "kind"='income'  AND "vatRate"=19 THEN "netCents" END),0)::int AS u19_net,
          COALESCE(SUM(CASE WHEN "kind"='income'  AND "vatRate"=19 THEN "vatCents" END),0)::int AS u19_vat,
          COALESCE(SUM(CASE WHEN "kind"='income'  AND "vatRate"=7  THEN "netCents" END),0)::int AS u07_net,
          COALESCE(SUM(CASE WHEN "kind"='income'  AND "vatRate"=7  THEN "vatCents" END),0)::int AS u07_vat,
          COALESCE(SUM(CASE WHEN "kind"='expense' AND "vatRate"=19 THEN "vatCents" END),0)::int AS v19_vat,
          COALESCE(SUM(CASE WHEN "kind"='expense' AND "vatRate"=7  THEN "vatCents" END),0)::int AS v07_vat
        FROM "FinanceTransaction"
        WHERE date_trunc('month',"bookedOn") = date_trunc('month', CURRENT_DATE)
      `);
      u = ust.rows[0];
      u.zahllast = (u.u19_vat + u.u07_vat) - (u.v19_vat + u.v07_vat);
    }

    // EÜR (Jahr)
    const euer = await q(`
      SELECT
        COALESCE(SUM(CASE WHEN "kind"='income'  THEN "netCents" END),0)::int AS incomeNet,
        COALESCE(SUM(CASE WHEN "kind"='expense' THEN "netCents" END),0)::int AS expenseNet
      FROM "FinanceTransaction"
      WHERE EXTRACT(YEAR FROM "bookedOn") = EXTRACT(YEAR FROM CURRENT_DATE)
    `);

    return NextResponse.json({
      ok:true,
      settings: { kleinunternehmer: !!klein },
      periods: {
        today:   { incomeCents: today.rows[0]?.income || 0,   expenseCents: today.rows[0]?.expense || 0 },
        last7:   { incomeCents: last7.rows[0]?.income || 0,   expenseCents: last7.rows[0]?.expense || 0 },
        last30:  { incomeCents: last30.rows[0]?.income || 0,  expenseCents: last30.rows[0]?.expense || 0 },
        mtd:     { incomeCents: mtd.rows[0]?.income || 0,     expenseCents: mtd.rows[0]?.expense || 0 },
      },
      ust: { mtd: u },
      euer: { year: euer.rows[0] || { incomeNet:0, expenseNet:0 } }
    });
  }catch(e){
    console.error(e);
    return NextResponse.json({ ok:false, error:"Summary fehlgeschlagen." }, { status:500 });
  }
}
