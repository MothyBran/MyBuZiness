// app/api/receipts/route.js
import { initDb, q, uuid, pool } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/** Integer-Helfer */
const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

export async function GET(request) {
  try {
    const userId = await requireUser();
    await initDb();
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(500, Number(searchParams.get("limit") || 100)));
    const qstr  = (searchParams.get("q")  || "").trim().toLowerCase();
    const no    = (searchParams.get("no") || "").trim();

    const where = [`"userId"=$1`];
    const params = [userId];
    if (qstr) {
      params.push(`%${qstr}%`);
      // Suche in receiptNo ODER note – gemeinsamer Parameter, bewusst gleich
      where.push(`(lower(COALESCE("receiptNo",'')) LIKE $${params.length} OR lower(COALESCE("note",'')) LIKE $${params.length})`);
    }
    if (no)   { params.push(no); where.push(`"receiptNo" = $${params.length}`); }

    const sql = `
      SELECT
        "id",
        COALESCE("receiptNo",'')               AS "receiptNo",
        "date",
        COALESCE("currency",'EUR')             AS "currency",
        COALESCE("netCents",0)::bigint         AS "netCents",
        COALESCE("taxCents",0)::bigint         AS "taxCents",
        COALESCE("grossCents",0)::bigint       AS "grossCents",
        COALESCE("discountCents",0)::bigint    AS "discountCents",
        COALESCE("note",'')                    AS "note",
        "givenCents", "changeCents", "paymentMethod",
        "createdAt","updatedAt"
      FROM "Receipt"
      WHERE ${where.join(" AND ")}
      ORDER BY "createdAt" DESC NULLS LAST, "date" DESC NULLS LAST, "id" DESC
      LIMIT ${limit};
    `;

    const rows = (await q(sql, params)).rows;
    return new Response(JSON.stringify({ ok:true, data: rows }), {
      status: 200, headers: { "content-type":"application/json", "cache-control":"no-store" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error: String(e) }), {
      status: e.message === "Unauthorized" ? 401 : 500, headers: { "content-type":"application/json" }
    });
  }
}

export async function POST(request) {
  const client = await pool.connect();
  try {
    const userId = await requireUser();
    await initDb();
    const body = await request.json().catch(()=> ({}));
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return new Response(JSON.stringify({ ok:false, error:"Mindestens eine Position ist erforderlich." }), { status:400 });
    }

    // Kopf
    const id = uuid();
    let receiptNo = (body.receiptNo || "").trim() || null;        // Nummer kann vom Frontend kommen (BN-jjmm-000)
    const date = body.date || null;
    const currency = body.currency || "EUR";
    const vatExempt = !!body.vatExempt;
    const discountCents = toInt(body.discountCents || 0);
    const givenCents = body.givenCents != null ? toInt(body.givenCents) : null;
    const changeCents = body.changeCents != null ? toInt(body.changeCents) : null;
    const paymentMethod = body.paymentMethod || null;

    // Summen
    let totalGross = 0;
    let totalTax = 0;
    const prepared = [];
    for (const it of items) {
      const qty = toInt(it.quantity || 0);
      const unit = toInt(it.unitPriceCents || 0);
      const base = toInt(it.baseCents || 0);
      const line = (qty * unit) + base;
      totalGross += line;

      let itemTaxRate = it.taxRate !== undefined ? Number(it.taxRate) : 19;
      if (vatExempt) itemTaxRate = 0;

      const itemNet = Math.round(line / (1 + (itemTaxRate / 100)));
      const itemTax = line - itemNet;
      totalTax += itemTax;

      prepared.push({
          ...it,
          quantity: qty,
          unitPriceCents: unit,
          baseCents: base,
          lineTotalCents: line,
          taxRate: itemTaxRate
      });
    }

    const grossAfterDiscount = Math.max(0, totalGross - discountCents);
    const taxCents = totalGross > 0 ? Math.round(totalTax * (grossAfterDiscount / totalGross)) : 0;
    const grossCents = grossAfterDiscount;
    const netAfter = grossCents - taxCents;

    await client.query("BEGIN");

    if (!receiptNo) {
      // Auto-generate receipt number if not provided: BN-YYMM-XXX
      const now = date ? new Date(date) : new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const prefix = `BN-${yy}${mm}-`;

      const last = await client.query(
        `SELECT COALESCE(MAX(
            NULLIF(substring("receiptNo" from '\\d+$'), '')::bigint
          ), 0)::bigint AS last
         FROM "Receipt"
         WHERE "userId" = $1 AND "receiptNo" LIKE $2`,
        [userId, `${prefix}%`]
      );
      const nextNum = Number(last.rows[0]?.last || 0) + 1;
      receiptNo = `${prefix}${String(nextNum).padStart(3, "0")}`;
    }

    await client.query(`
      INSERT INTO "Receipt"
        ("id","receiptNo","date","vatExempt","currency","netCents","taxCents","grossCents","discountCents","createdAt","updatedAt","note","userId","givenCents","changeCents","paymentMethod")
      VALUES
        ($1,$2,COALESCE($3::date, CURRENT_DATE),$4,$5,$6,$7,$8,$9, now(), now(), COALESCE($10,''), $11, $12, $13, $14)`,
      [id, receiptNo, date, vatExempt, currency, netAfter, taxCents, grossCents, discountCents, body.note || "", userId, givenCents, changeCents, paymentMethod]
    );

    if (prepared.length > 0) {
      const flat = [];
      const rows = [];
      for (let i = 0; i < prepared.length; i++) {
        const it = prepared[i];
        const offset = i * 9;
        rows.push(`($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${offset + 5},$${offset + 6},$${offset + 7},$${offset + 8},$${offset + 9},now(),now())`);
        flat.push(uuid(), id, it.productId || null, (it.name || "Position").trim(), it.quantity, it.unitPriceCents, it.baseCents, it.lineTotalCents, it.taxRate);
      }
      await client.query(
        `INSERT INTO "ReceiptItem"
          ("id","receiptId","productId","name","quantity","unitPriceCents","baseCents","lineTotalCents","taxRate","createdAt","updatedAt")
         VALUES ${rows.join(",")}`,
        flat
      );
    }

    await client.query("COMMIT");

    return new Response(JSON.stringify({ ok:true, data:{ id, receiptNo } }), {
      status: 201, headers: { "content-type":"application/json" }
    });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    if (e.code === '23505' && e.constraint === 'Receipt_receiptNo_userId_key') {
      return new Response(JSON.stringify({ ok:false, error: "Diese Beleg-Nr. wird bereits verwendet. Bitte wähle eine andere." }), {
        status: 400, headers: { "content-type":"application/json" }
      });
    }
    return new Response(JSON.stringify({ ok:false, error: String(e) }), {
      status: e.message === "Unauthorized" ? 401 : 400, headers: { "content-type":"application/json" }
    });
  } finally {
    client.release();
  }
}
