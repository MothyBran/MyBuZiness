// app/api/export/finanzen/ustva/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";
export const dynamic = "force-dynamic";

/** GET ?month=YYYY-MM */
export async function GET(req){
  try{
    const u = new URL(req.url);
    const month = u.searchParams.get("month");
    if(!month || !/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ ok:false, error:"month=YYYY-MM erforderlich." }, { status:400 });

    const [y,m] = month.split("-").map(Number);
    const from = `${month}-01`;
    const to = `${y}-${String(m+1).padStart(2,"0")}-01`;

    const { rows } = await q(`
      SELECT
        COALESCE(SUM(CASE WHEN "kind"='income'  AND "vatRate"=19 THEN "netCents" END),0)::int AS u19_net,
        COALESCE(SUM(CASE WHEN "kind"='income'  AND "vatRate"=19 THEN "vatCents" END),0)::int AS u19_vat,
        COALESCE(SUM(CASE WHEN "kind"='income'  AND "vatRate"=7  THEN "netCents" END),0)::int AS u07_net,
        COALESCE(SUM(CASE WHEN "kind"='income'  AND "vatRate"=7  THEN "vatCents" END),0)::int AS u07_vat,
        COALESCE(SUM(CASE WHEN "kind"='expense' AND "vatRate"=19 THEN "vatCents" END),0)::int AS v19_vat,
        COALESCE(SUM(CASE WHEN "kind"='expense' AND "vatRate"=7  THEN "vatCents" END),0)::int AS v07_vat
      FROM "FinanceTransaction"
      WHERE "bookedOn">=$1 AND "bookedOn"<$2
    `,[from,to]);

    const r = rows[0] || {u19_net:0,u19_vat:0,u07_net:0,u07_vat:0,v19_vat:0,v07_vat:0};
    const zahllast = (r.u19_vat + r.u07_vat) - (r.v19_vat + r.v07_vat);

    const header = ["Monat","Umsatz(19%) Netto","USt 19%","Umsatz(7%) Netto","USt 7%","Vorsteuer 19%","Vorsteuer 7%","Zahllast"];
    const line = [month,
      (r.u19_net/100).toFixed(2).replace(".",","), (r.u19_vat/100).toFixed(2).replace(".",","),
      (r.u07_net/100).toFixed(2).replace(".",","), (r.u07_vat/100).toFixed(2).replace(".",","),
      (r.v19_vat/100).toFixed(2).replace(".",","), (r.v07_vat/100).toFixed(2).replace(".",","),
      (zahllast/100).toFixed(2).replace(".",",")
    ].join(";");

    const csv = header.join(";") + "\n" + line;
    return new NextResponse(csv, { status:200, headers:{
      "Content-Type":"text/csv; charset=utf-8",
      "Content-Disposition":`attachment; filename="ustva_${month}.csv"`
    }});
  }catch(e){
    console.error(e);
    return NextResponse.json({ ok:false, error:"Export fehlgeschlagen." }, { status:500 });
  }
}
