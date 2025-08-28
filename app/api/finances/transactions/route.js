// app/api/finanzen/transactions/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Schema einmalig sicherstellen (ohne db.js anfassen) */
async function ensureFinanceSchema(){
  await q(`CREATE TABLE IF NOT EXISTS "FinanceTransaction" (
    "id" TEXT PRIMARY KEY,
    "kind" TEXT NOT NULL CHECK ("kind" IN ('income','expense','transfer')),
    "bookedOn" DATE NOT NULL DEFAULT CURRENT_DATE,
    "categoryCode" TEXT,
    "categoryName" TEXT,
    "paymentMethod" TEXT,
    "counterpartyName" TEXT,
    "counterpartyVatId" TEXT,
    "reference" TEXT,
    "invoiceId" TEXT,
    "receiptId" TEXT,
    "documentId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "vatRate" NUMERIC(5,2),
    "netCents" INTEGER NOT NULL DEFAULT 0,
    "vatCents" INTEGER NOT NULL DEFAULT 0,
    "grossCents" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`);

  await q(`CREATE TABLE IF NOT EXISTS "TaxCategory" (
    "code" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL CHECK ("type" IN ('income','expense')),
    "skr03" TEXT,
    "vatRateDefault" NUMERIC(5,2)
  );`);

  await q(`CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`);

  // rudimentäre Defaults (nur falls leer)
  await q(`
    INSERT INTO "TaxCategory"("code","name","type","skr03","vatRateDefault")
    SELECT x.code,x.name,x.type,x.skr03,x.vr FROM (VALUES
      ('INC_STD','Betriebseinnahmen 19%', 'income','8400','19'),
      ('INC_RED','Betriebseinnahmen 7%',  'income','8300','7'),
      ('INC_0'  ,'Einnahmen steuerfrei', 'income','8336','0'),
      ('EXP_MAT','Büro/Material 19%',    'expense','4930','19'),
      ('EXP_SERV','Fremdleistungen 19%','expense','4900','19'),
      ('EXP_TRAV','Reisekosten 7%',      'expense','4660','7'),
      ('EXP_0','Ausgabe steuerfrei',     'expense','4936','0')
    ) AS x(code,name,type,skr03,vr)
    WHERE NOT EXISTS (SELECT 1 FROM "TaxCategory" LIMIT 1);
  `);
}

function uuid(){
  return (globalThis.crypto?.randomUUID?.() ?? require("crypto").randomUUID());
}

/** GET ?year=2025&limit=1000  (optional: from,to,search,kind) */
export async function GET(req){
  try{
    await ensureFinanceSchema();
    const u = new URL(req.url);
    const year = u.searchParams.get("year");
    const from = u.searchParams.get("from");
    const to = u.searchParams.get("to");
    const kind = u.searchParams.get("kind");
    const search = u.searchParams.get("search");
    const limit = Math.min(Number(u.searchParams.get("limit") || 1000), 5000);

    const wh = [];
    const ps = [];
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
    return NextResponse.json({ ok:false, error:"Laden fehlgeschlagen." }, { status:500 });
  }
}

/** POST { kind, grossCents, vatRate?, bookedOn?, categoryCode?, note?, paymentMethod?, reference?, invoiceId?, receiptId?, documentId? } */
export async function POST(req){
  try{
    await ensureFinanceSchema();
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
       "currency","vatRate","netCents","vatCents","grossCents","note")
      VALUES ($1,$2,COALESCE($3,CURRENT_DATE),$4,$5,$6,$7,$8,$9,$10,'EUR',$11,$12,$13,$14,$15)
      RETURNING *;
    `, [id, kind, bookedOn, categoryCode, categoryName, paymentMethod, reference, invoiceId, receiptId, documentId, vr, net, vat, grossCents, note]);

    return NextResponse.json({ ok:true, row: ins.rows[0] }, { status:201 });
  }catch(e){
    console.error(e);
    return NextResponse.json({ ok:false, error:"Speichern fehlgeschlagen." }, { status:500 });
  }
}
