// app/api/finanzen/categories/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET(){
  try{
    const { rows } = await q(`SELECT "code","name","type","skr03","vatRateDefault" FROM "TaxCategory" ORDER BY "type","name"`);
    return NextResponse.json({ ok:true, data: rows });
  }catch(e){
    console.error(e);
    return NextResponse.json({ ok:false, data: [] });
  }
}

/** POST { code, name, type('income'|'expense'), skr03?, vatRateDefault? } */
export async function POST(req){
  try{
    const b = await req.json();
    if(!b?.code || !b?.name || !['income','expense'].includes(b?.type)) return NextResponse.json({ ok:false, error:"Ungültig." }, { status:400 });
    await q(`INSERT INTO "TaxCategory"("code","name","type","skr03","vatRateDefault") VALUES ($1,$2,$3,$4,$5) ON CONFLICT ("code") DO UPDATE SET "name"=EXCLUDED.name,"type"=EXCLUDED.type,"skr03"=EXCLUDED.skr03,"vatRateDefault"=EXCLUDED.vatRateDefault`, [b.code, b.name, b.type, b.skr03||null, b.vatRateDefault ?? null]);
    return NextResponse.json({ ok:true });
  }catch(e){
    console.error(e); return NextResponse.json({ ok:false, error:"Speichern fehlgeschlagen." }, { status:500 });
  }
}
