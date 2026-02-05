// app/api/finanzen/transactions/route.js
import { NextResponse } from "next/server";
import { initDb, q, uuid } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** GET ?year=2025&limit=1000  (optional: from,to,search,kind) */
export async function GET(req){
  try{
    const userId = await requireUser();
    await initDb();
    const u = new URL(req.url);
    const year = u.searchParams.get("year");
    const from = u.searchParams.get("from");
    const to = u.searchParams.get("to");
    const kind = u.searchParams.get("kind");
    const search = u.searchParams.get("search");
    const limit = Math.min(Number(u.searchParams.get("limit") || 1000), 5000);

    const wh = [`"userId"=$1`];
    const ps = [userId];
    if(year){ ps.push(`${year}-01-01`); wh.push(`"bookedOn" >= $${ps.length}`); ps.push(`${year}-12-31`); wh.push(`"bookedOn" <= $${ps.length}`); }
    if(from){ ps.push(from); wh.push(`"bookedOn" >= $${ps.length}`); }
    if(to){ ps.push(to); wh.push(`"bookedOn" <= $${ps.length}`); }
    if(kind){ ps.push(kind); wh.push(`"kind" = $${ps.length}`); }
    if(search){
      ps.push(`%${search}%`);
      wh.push(`(coalesce("note",'') ILIKE $${ps.length} OR coalesce("reference",'') ILIKE $${ps.length} OR coalesce("categoryName",'') ILIKE $${ps.length})`);
    }
    const where = wh.length ? `WHERE ${wh.join(" AND ")}` : "";
    const sql = `SELECT * FROM "FinanceTransaction" ${where} ORDER BY "bookedOn" DESC, "createdAt" DESC LIMIT ${limit}`;
    const { rows } = await q(sql, ps);
    return NextResponse.json({ ok:true, rows });
  }catch(e){
    console.error(e);
    return NextResponse.json({ ok:false, error:"Laden fehlgeschlagen." }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}

/** POST { kind, grossCents, vatRate?, bookedOn?, categoryCode?, note?, paymentMethod?, reference?, invoiceId?, receiptId?, documentId? } */
export async function POST(req){
  try{
    const userId = await requireUser();
    await initDb();
    const body = await req.json().catch(()=> ({}));
    const { kind, grossCents, vatRate=null, bookedOn=null, categoryCode=null, note=null,
            paymentMethod=null, reference=null, invoiceId=null, receiptId=null, documentId=null } = body;

    if(!["income","expense","transfer"].includes(kind)) return NextResponse.json({ ok:false, error:"Ungültige Art." }, { status:400 });
    if(!Number.isInteger(grossCents) || grossCents<=0) return NextResponse.json({ ok:false, error:"grossCents fehlt/ungültig." }, { status:400 });

    // Netto/Steuer berechnen (für transfer 0% MwSt)
    const vr = kind==="transfer" || vatRate===null ? null : Number(vatRate);
    let net = grossCents, vat = 0;
    if(vr!==null && Number.isFinite(vr) && vr>0){
      net = Math.round(grossCents / (1 + vr/100));
      vat = grossCents - net;
    }

    // Kategorie-Auflösung
    let categoryName = null;
    if(categoryCode){
      const c = await q(`SELECT "name" FROM "TaxCategory" WHERE "code"=$1`, [categoryCode]).then(r=>r.rows?.[0]).catch(()=>null);
      categoryName = c?.name || null;
    }

    const id = uuid();
    const ins = await q(`
      INSERT INTO "FinanceTransaction"
      ("id","kind","bookedOn","categoryCode","categoryName","paymentMethod","reference","invoiceId","receiptId","documentId",
       "currency","vatRate","netCents","vatCents","grossCents","note","userId")
      VALUES ($1,$2,COALESCE($3,CURRENT_DATE),$4,$5,$6,$7,$8,$9,$10,'EUR',$11,$12,$13,$14,$15,$16)
      RETURNING *;
    `, [id, kind, bookedOn, categoryCode, categoryName, paymentMethod, reference, invoiceId, receiptId, documentId, vr, net, vat, grossCents, note, userId]);

    return NextResponse.json({ ok:true, row: ins.rows[0] }, { status:201 });
  }catch(e){
    console.error(e);
    return NextResponse.json({ ok:false, error:"Speichern fehlgeschlagen." }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}
