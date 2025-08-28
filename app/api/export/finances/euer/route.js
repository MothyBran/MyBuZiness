// app/api/export/finanzen/euer/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";
export const dynamic = "force-dynamic";

/** GET ?year=2025 */
export async function GET(req){
  try{
    const u = new URL(req.url);
    const year = Number(u.searchParams.get("year"));
    if(!Number.isFinite(year)) return NextResponse.json({ ok:false, error:"year erforderlich." }, { status:400 });

    const { rows } = await q(`
      SELECT date_trunc('month',"bookedOn") AS m,
        COALESCE(SUM(CASE WHEN "kind"='income'  THEN "netCents" END),0)::int AS inc_net,
        COALESCE(SUM(CASE WHEN "kind"='expense' THEN "netCents" END),0)::int AS exp_net
      FROM "FinanceTransaction"
      WHERE EXTRACT(YEAR FROM "bookedOn")=$1
      GROUP BY 1 ORDER BY 1
    `,[year]);

    const header = ["Monat","Einnahmen netto (€)","Ausgaben netto (€)","Ergebnis (€)"];
    const lines = [header.join(";")];
    for(const r of rows){
      const y = r.m.getUTCFullYear(); const m = String(r.m.getUTCMonth()+1).padStart(2,"0");
      const inc = r.inc_net/100, exp = r.exp_net/100;
      lines.push([`${y}-${m}`, inc.toFixed(2).replace(".",","), exp.toFixed(2).replace(".",","), (inc-exp).toFixed(2).replace(".",",")].join(";"));
    }
    const csv = lines.join("\n");
    return new NextResponse(csv, { status:200, headers:{
      "Content-Type":"text/csv; charset=utf-8",
      "Content-Disposition":`attachment; filename="euer_${year}.csv"`
    }});
  }catch(e){
    console.error(e);
    return NextResponse.json({ ok:false, error:"Export fehlgeschlagen." }, { status:500 });
  }
}
