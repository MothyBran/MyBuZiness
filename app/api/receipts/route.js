import { initDb, q, uuid } from "@/lib/db";

function toInt(v, d=0){ const n=Number(v); return Number.isFinite(n)?Math.trunc(n):d; }
function calcTotals(items, vatExempt, taxRate = 19) {
  const net = items.reduce((s, it)=> s + toInt(it.unitPriceCents)*toInt(it.quantity,1), 0);
  const tax = vatExempt ? 0 : Math.round(net * (Number(taxRate)/100));
  const gross = net + tax;
  return { netCents: net, taxCents: tax, grossCents: gross };
}
function formatReceiptNo(seq){
  const y = new Date().getFullYear();
  return `RC-${y}-${String(seq).padStart(5,"0")}`;
}

export async function GET(request){
  try{
    await initDb();
    const { searchParams } = new URL(request.url);
    const qStr = (searchParams.get("q")||"").trim();

    let rows;
    if(qStr){
      rows = (await q(
        `SELECT * FROM "Receipt"
         WHERE "receiptNo" ILIKE $1
         ORDER BY "createdAt" DESC LIMIT 50`, [`%${qStr}%`]
      )).rows;
    } else {
      rows = (await q(
        `SELECT * FROM "Receipt" ORDER BY "createdAt" DESC LIMIT 50`
      )).rows;
    }
    return Response.json({ ok:true, data:rows });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500 });
  }
}

export async function POST(request){
  const client = await (await import("@/lib/db")).pool.connect();
  try{
    await initDb();
    const body = await request.json().catch(()=> ({}));
    const {
      items = [],                 // [{name, quantity, unitPriceCents}]
      vatExempt = true,           // §19 UStG: true = keine USt
      taxRate = 19,               // wird ignoriert wenn vatExempt=true
      currency = "EUR",
      note = "",
      date = null                 // optional YYYY-MM-DD
    } = body || {};

    const validItems = (Array.isArray(items)? items: [])
      .map(it => ({
        name: String(it.name||"").trim(),
        quantity: toInt(it.quantity,1),
        unitPriceCents: toInt(it.unitPriceCents,0)
      }))
      .filter(it => it.name && it.quantity>0);

    if(validItems.length===0){
      return new Response(JSON.stringify({ ok:false, error:"Mindestens eine Position erforderlich." }), { status:400 });
    }

    const totals = calcTotals(validItems, !!vatExempt, Number(taxRate));

    await client.query("BEGIN");
    const seq = (await client.query(`SELECT nextval('"ReceiptNumberSeq"') AS seq`)).rows[0].seq;
    const receiptNo = formatReceiptNo(seq);
    const id = uuid();

    const ins = await client.query(
      `INSERT INTO "Receipt"
       ("id","receiptNo","date","vatExempt","currency","netCents","taxCents","grossCents","note")
       VALUES ($1,$2,COALESCE($3,CURRENT_DATE),$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [id, receiptNo, date, !!vatExempt, currency, totals.netCents, totals.taxCents, totals.grossCents, note]
    );

    for(const it of validItems){
      const line = it.quantity * it.unitPriceCents;
      await client.query(
        `INSERT INTO "ReceiptItem"
         ("id","receiptId","name","quantity","unitPriceCents","lineTotalCents")
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [uuid(), id, it.name, it.quantity, it.unitPriceCents, line]
      );
    }

    await client.query("COMMIT");
    return Response.json({ ok:true, data:ins.rows[0] }, { status:201 });
  }catch(e){
    await client.query("ROLLBACK");
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:400 });
  }finally{
    client.release();
  }
}
