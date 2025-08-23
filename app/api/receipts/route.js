// app/api/receipts/route.js
import { initDb, q, uuid } from "@/lib/db";
import { renderNumber, nextDigitSequence } from "@/lib/numbering";

/** Integer-Helfer */
const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

export async function GET(request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const qs = (searchParams.get("q") || "").trim().toLowerCase();
    const no = (searchParams.get("no") || "").trim();

    const where = [];
    const params = [];
    if (qs) { params.push(`%${qs}%`); where.push(`(lower(COALESCE("receiptNo",'')) LIKE $${params.length} OR lower(COALESCE("note",'')) LIKE $${params.length})`); }
    if (no) { params.push(no); where.push(`"receiptNo" = $${params.length}`); }

    const receipts = (await q(
      `SELECT
         "id",
         COALESCE("receiptNo", '')                 AS "receiptNo",
         "date",
         COALESCE("netCents", 0)::bigint           AS "netCents",
         COALESCE("taxCents", 0)::bigint           AS "taxCents",
         COALESCE("grossCents", 0)::bigint         AS "grossCents",
         COALESCE("discountCents", 0)::bigint      AS "discountCents",
         COALESCE("currency", 'EUR')               AS "currency",
         "createdAt","updatedAt"
       FROM "Receipt"
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY "createdAt" DESC NULLS LAST, "date" DESC NULLS LAST, "id" DESC`,
      params
    )).rows;

    if (receipts.length === 0) {
      return new Response(JSON.stringify({ ok: true, data: [] }), {
        status: 200,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      });
    }

    // Positionen laden (IDs als TEXT behandeln)
    const ids = receipts.map(r => String(r.id));
    const items = (await q(
      `SELECT
         "id","receiptId",
         COALESCE("productId", NULL)               AS "productId",
         COALESCE("name", '')                      AS "name",
         COALESCE("quantity", 0)                   AS "quantity",
         COALESCE("unitPriceCents", 0)::bigint     AS "unitPriceCents",
         COALESCE("lineTotalCents", 0)::bigint     AS "lineTotalCents",
         COALESCE("createdAt", now())              AS "createdAt"
       FROM "ReceiptItem"
       WHERE "receiptId"::text = ANY($1::text[])
       ORDER BY "createdAt" ASC NULLS LAST, "id" ASC`,
      [ids]
    )).rows;

    const byId = new Map(receipts.map(r => [r.id, { ...r, items: [] }]));
    for (const it of items) {
      const host = byId.get(it.receiptId);
      if (host) host.items.push(it);
    }

    return new Response(JSON.stringify({ ok: true, data: Array.from(byId.values()) }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
}

export async function POST(request) {
  try {
    await initDb();
    const body = await request.json().catch(() => ({}));
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return new Response(JSON.stringify({ ok:false, error:"Mindestens eine Position ist erforderlich." }), { status:400 });
    }

    // Settings laden (KU, Währung, Format)
    const settings = (await q(`SELECT * FROM "Settings" ORDER BY "createdAt" ASC LIMIT 1`)).rows[0] || {};
    const vatExempt = !!settings.kleinunternehmer;
    const currency = body.currency || settings.currency || "EUR";
    const format = settings.receiptNumberFormat || "{YYYY}.{SEQ4}";

    // Belegnummer: manuell oder über Format + Sequence
    let receiptNo = (body.receiptNo || "").trim();
    if (!receiptNo) {
      const seq = await nextDigitSequence(q, `"Receipt"`, `"receiptNo"`);
      receiptNo = renderNumber(format, seq, body.date ? new Date(body.date) : new Date());
    }

    const id = uuid();

    // Produkte (für Grundpreise) holen
    const prodIds = items.map(it => it.productId).filter(Boolean).map(String);
    let prodMap = new Map();
    if (prodIds.length) {
      const rows = (await q(
        `SELECT "id"::text AS id,
                COALESCE("name",'') AS name,
                COALESCE("kind",'product') AS kind,
                COALESCE("priceCents",0)::bigint AS "priceCents",
                COALESCE("hourlyRateCents",0)::bigint AS "hourlyRateCents",
                COALESCE("travelBaseCents",0)::bigint AS "travelBaseCents",
                COALESCE("travelPerKmCents",0)::bigint AS "travelPerKmCents"
           FROM "Product"
          WHERE "id"::text = ANY($1::text[])`,
        [prodIds]
      )).rows;
      prodMap = new Map(rows.map(p => [p.id, p]));
    }

    // Items + Summen
    const prepared = [];
    let net = 0;

    for (const raw of items) {
      const qty  = toInt(raw.quantity || 0);
      let unit   = toInt(raw.unitPriceCents || 0);
      let base   = 0;
      let name   = (raw.name || "").trim();
      const pid  = raw.productId || null;

      if (pid && prodMap.has(String(pid))) {
        const p = prodMap.get(String(pid));
        name = p.name || name;
        if (p.kind === "service") {
          base = toInt(p.priceCents || 0);
          const hr = toInt(p.hourlyRateCents || 0);
          unit = hr > 0 ? hr : toInt(p.priceCents || 0);
        } else if (p.kind === "travel") {
          base = toInt(p.travelBaseCents || 0);
          unit = toInt(p.travelPerKmCents || 0);
        } else {
          base = 0;
          unit = toInt(p.priceCents || 0);
        }
      }

      const line = base + qty * unit;
      net += line;

      prepared.push({
        productId: pid,
        name: name || "Position",
        quantity: qty,
        unitPriceCents: unit,
        lineTotalCents: line
      });
    }

    const discountCents = toInt(body.discountCents || 0);
    const netAfterDiscount = Math.max(0, net - discountCents);
    const taxRate = vatExempt ? 0 : Number(settings.taxRateDefault ?? 19);
    const taxCents = Math.round(netAfterDiscount * (taxRate / 100));
    const grossCents = netAfterDiscount + taxCents;

    await q(
      `INSERT INTO "Receipt"
         ("id","receiptNo","date","vatExempt","currency","netCents","taxCents","grossCents","discountCents","createdAt","updatedAt")
       VALUES
         ($1,$2,COALESCE($3, CURRENT_DATE),$4,$5,$6,$7,$8,$9,now(),now())`,
      [id, receiptNo, body.date || null, vatExempt, currency, netAfterDiscount, taxCents, grossCents, discountCents]
    );

    for (const it of prepared) {
      await q(
        `INSERT INTO "ReceiptItem"
           ("id","receiptId","productId","name","quantity","unitPriceCents","lineTotalCents","createdAt","updatedAt")
         VALUES
           ($1,$2,$3,$4,$5,$6,$7,now(),now())`,
        [uuid(), id, it.productId, it.name, it.quantity, it.unitPriceCents, it.lineTotalCents]
      );
    }

    return Response.json({ ok: true, data: { id, receiptNo } }, { status: 201 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400, headers: { "content-type": "application/json" }
    });
  }
}
