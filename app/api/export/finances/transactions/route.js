// app/api/export/finanzen/transactions/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";
export const dynamic = "force-dynamic";

/** GET ?year=2025 (optional from,to) */
export async function GET(req){
  try{
    const u = new URL(req.url);
    const year = u.searchParams.get("year");
    const from = u.searchParams.get("from");
    const to = u.searchParams.get("to");
    const wh=[]; const ps=[];
    if(year){ ps.push(`${year}-01-01`); wh.push(`"bookedOn">=$${ps.length}`); ps.push(`${year}-12-31`); wh.push(`"bookedOn"<=$${ps.length}`); }
    if(from){ ps.push(from); wh.push(`"bookedOn">=$${ps.length}`); }
    if(to){ ps.push(to); wh.push(`"bookedOn"<=$${ps.length}`); }
    const where = wh.length? `WHERE ${wh.join(" AND ")}`:"";
    const { rows } = await q(`SELECT * FROM "FinanceTransaction" ${where} ORDER BY "bookedOn","createdAt"`, ps);

    const header = [
      "ID","Datum","Art","Kategorie","SKR03","MwSt","Netto(€)","USt/VSt(€)","Brutto(€)","Zahlungsart",
      "Referenz","Gegenpartei","USt-ID","RechnungID","BelegID","DokumentID","Währung","Notiz"
    ];
    const lines = [header.join(";")];
    for(const r of rows){
      const cat = await q(`SELECT "skr03" FROM "TaxCategory" WHERE "code"=$1`, [r.categoryCode]).then(x=>x.rows?.[0]?.skr03||"").catch(()=> "");
      const x = [
        r.id, r.bookedOn, r.kind, (r.categoryName||r.categoryCode||""),
        cat,
        (r.vatRate==null? "" : String(Number(r.vatRate)).replace(".",",")),
        (r.netCents/100).toFixed(2).replace(".",","), (r.vatCents/100).toFixed(2).replace(".",","), (r.grossCents/100).toFixed(2).replace(".",","),
        r.paymentMethod||"", r.reference||"", r.counterpartyName||"", r.counterpartyVatId||"",
        r.invoiceId||"", r.receiptId||"", r.documentId||"", r.currency||"EUR",
        (r.note||"").replace(/;/g,",")
      ];
      lines.push(x.join(";"));
    }
    const csv = lines.join("\n");
    return new NextResponse(csv, { status:200, headers:{
      "Content-Type":"text/csv; charset=utf-8",
      "Content-Disposition":`attachment; filename="finanzen_transaktionen_${year||"alle"}.csv"`
    }});
  }catch(e){
    console.error(e);
    return NextResponse.json({ ok:false, error:"Export fehlgeschlagen." }, { status:500 });
  }
}
