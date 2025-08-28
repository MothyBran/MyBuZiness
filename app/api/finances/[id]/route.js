// app/api/finanzen/transactions/[id]/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req, { params }){
  try{
    const id = params.id;
    const body = await req.json();
    const fields = [];
    const ps = [];
    let i=0;
    const set = (col,val)=>{ i++; fields.push(`"${col}"=$${i}`); ps.push(val); };
    const allowed = ["kind","bookedOn","categoryCode","categoryName","paymentMethod","counterpartyName","counterpartyVatId","reference","invoiceId","receiptId","documentId","currency","vatRate","netCents","vatCents","grossCents","note"];
    for(const k of allowed){ if(k in body) set(k, body[k]); }
    if(!fields.length) return NextResponse.json({ ok:false, error:"Keine Änderungen." }, { status:400 });
    ps.push(id);
    const sql = `UPDATE "FinanceTransaction" SET ${fields.join(",")}, "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$${ps.length} RETURNING *`;
    const { rows } = await q(sql, ps);
    return NextResponse.json({ ok:true, row: rows[0] });
  }catch(e){
    console.error(e);
    return NextResponse.json({ ok:false, error:"Aktualisierung fehlgeschlagen." }, { status:500 });
  }
}

export async function DELETE(_req, { params }){
  try{
    const id = params.id;
    await q(`DELETE FROM "FinanceTransaction" WHERE "id"=$1`, [id]);
    return NextResponse.json({ ok:true });
  }catch(e){
    console.error(e);
    return NextResponse.json({ ok:false, error:"Löschen fehlgeschlagen." }, { status:500 });
  }
}
