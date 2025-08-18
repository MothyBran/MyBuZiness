// app/api/receipts/route.js
import { initDb, q, uuid } from "@/lib/db";

/** Settings laden (Währung / Kleinunternehmer) */
async function loadSettings() {
  const row = (await q(`SELECT * FROM "Settings" ORDER BY "createdAt" ASC LIMIT 1`)).rows[0];
  return {
    currency: row?.currency || "EUR",
    kleinunternehmer: !!row?.kleinunternehmer,
  };
}

/** Positionen zu einem Satz Belege nachladen und in JS gruppieren */
async function attachItems(receipts) {
  if (!receipts.length) return receipts;
  const ids = receipts.map(r => r.id);
  const items = (await q(
    `SELECT * FROM "ReceiptItem" WHERE "receiptId" = ANY($1::uuid[]) ORDER BY "createdAt" ASC`,
    [ids]
  )).rows;

  const byId = new Map(receipts.map(r => [r.id, { ...r, items: [] }]));
  for (const it of items) {
    const r = byId.get(it.receiptId);
    if (r) r.items.push(it);
  }
  return Array.from(byId.values());
}

export async function GET(request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const qs = (searchParams.get("q") || "").trim().toLowerCase();

    const receipts = (await q(
      `SELECT * FROM "Receipt"
       ${qs ? `WHERE lower("receiptNo") LIKE $1 OR lower(COALESCE("note", '')) LIKE $1` : ""}
       ORDER BY "date" DESC, "createdAt" DESC`,
      qs ? [`%${qs}%`] : []
    )).rows;

    const withItems = await attachItems(receipts);
    return Response.json({ ok: true, data: withItems });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}

export async function POST(request) {
  try {
    await initDb();
    const body = await request.json().catch(() => ({}));
    const { date, discountCents = 0 } = body;
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "Mindestens eine Position ist erforderlich." }), { status: 400 });
    }

    const settings = await loadSettings();
    const vatExempt = settings.kleinunternehmer; // §19 → steuerfrei
    const currency = settings.currency;

    // Nummer ziehen
    const seq = (await q(`SELECT nextval('\"ReceiptNumberSeq\"') AS n`)).rows[0].n;
    const id = uuid();
    const receiptNo = String(seq);

    // Zeilensummen inkl. extraBaseCents
    let netCents = 0;
    const normalizedItems = items.map(it => {
      const qty = Number(it.quantity || 0);
      const unit = Number(it.unitPriceCents || 0);
      const extra = Number(it.extraBaseCents || 0);
      const lineTotalCents = qty * unit + extra;
      netCents += lineTotalCents;
      return {
        id: uuid(),
        receiptId: id,
        productId: it.productId || null,
        name: String(it.name || "").trim(),
        quantity: qty,
        unitPriceCents: unit,
        extraBaseCents: extra,
        lineTotalCents,
      };
    });

    // Rabatt abziehen (auf Gesamtnetto)
    const netAfterDiscount = Math.max(0, netCents - Number(discountCents || 0));
    const taxCents = vatExempt ? 0 : Math.round(netAfterDiscount * 0.19); // 19% falls NICHT §19
    const grossCents = netAfterDiscount + taxCents;

    // Insert Receipt
    await q(
      `INSERT INTO "Receipt" (
        "id","receiptNo","date","vatExempt","currency",
        "netCents","taxCents","grossCents","discountCents","createdAt","updatedAt"
      ) VALUES (
        $1,$2,COALESCE($3, CURRENT_DATE),$4,$5,
        $6,$7,$8,$9, now(), now()
      )`,
      [id, receiptNo, date || null, vatExempt, currency, netAfterDiscount, taxCents, grossCents, Number(discountCents || 0)]
    );

    // Insert Items
    for (const it of normalizedItems) {
      await q(
        `INSERT INTO "ReceiptItem" (
          "id","receiptId","productId","name","quantity",
          "unitPriceCents","extraBaseCents","lineTotalCents","createdAt","updatedAt"
        ) VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8, now(), now()
        )`,
        [
          it.id, it.receiptId, it.productId, it.name, it.quantity,
          it.unitPriceCents, it.extraBaseCents, it.lineTotalCents
        ]
      );
    }

    return Response.json({ ok: true, data: { id, receiptNo } }, { status: 201 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
}

