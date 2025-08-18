// app/api/invoices/route.js
export const dynamic = "force-dynamic";
import { initDb, q, uuid } from "@/lib/db";

/** Settings laden (Währung / Kleinunternehmer) */
async function loadSettings() {
  const row = (await q(`SELECT * FROM "Settings" ORDER BY "createdAt" ASC LIMIT 1`)).rows[0];
  return {
    currency: row?.currency || "EUR",
    kleinunternehmer: !!row?.kleinunternehmer,
  };
}

/** Items an Liste von Rechnungen anhängen */
async function attachItems(invoices) {
  if (!invoices.length) return invoices;
  const ids = invoices.map(r => r.id);
  const items = (await q(
    `SELECT * FROM "InvoiceItem"
     WHERE "invoiceId" = ANY($1::uuid[])
     ORDER BY "createdAt" ASC NULLS LAST, "id" ASC`,
    [ids]
  )).rows;
  const byId = new Map(invoices.map(r => [r.id, { ...r, items: [] }]));
  for (const it of items) {
    const host = byId.get(it.invoiceId);
    if (host) host.items.push(it);
  }
  return Array.from(byId.values());
}

export async function GET(request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const qs = (searchParams.get("q") || "").trim().toLowerCase();

    const rows = (await q(
      `SELECT i.*, c."name" AS "customerName"
       FROM "Invoice" i
       LEFT JOIN "Customer" c ON c."id" = i."customerId"
       ${qs ? `WHERE lower(i."invoiceNo") LIKE $1 OR lower(COALESCE(c."name", '')) LIKE $1` : ""}
       ORDER BY i."createdAt" DESC NULLS LAST, i."issueDate" DESC NULLS LAST, i."id" DESC`,
      qs ? [`%${qs}%`] : []
    )).rows;

    const withItems = await attachItems(rows);
    return new Response(JSON.stringify({ ok: true, data: withItems }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}

export async function POST(request) {
  try {
    await initDb();
    const body = await request.json().catch(() => ({}));
    const { customerId, issueDate, dueDate } = body;
    let taxRate = Number(body.taxRate ?? 19);
    const items = Array.isArray(body.items) ? body.items : [];

    if (!customerId) {
      return new Response(JSON.stringify({ ok:false, error:"customerId fehlt." }), { status:400 });
    }
    if (items.length === 0) {
      return new Response(JSON.stringify({ ok:false, error:"Mindestens eine Position ist erforderlich." }), { status:400 });
    }

    const settings = await loadSettings();
    const currency = settings.currency;

    // §19 UStG: Steuer 0%
    if (settings.kleinunternehmer) taxRate = 0;

    // Rechnungsnummer
    const seq = (await q(`SELECT nextval('\"InvoiceNumberSeq\"') AS n`)).rows[0].n;
    const id = uuid();
    const invoiceNo = String(seq);

    // Zeilensummen
    let netCents = 0;
    const normalized = items.map(it => {
      const qty = Number(it.quantity || 0);
      const unit = Number(it.unitPriceCents || 0);
      const extra = Number(it.extraBaseCents || 0);
      const lineTotalCents = qty * unit + extra;
      netCents += lineTotalCents;
      return {
        id: uuid(),
        invoiceId: id,
        productId: it.productId || null,
        name: String(it.name || "").trim(),
        description: it.description || null,
        quantity: qty,
        unitPriceCents: unit,
        extraBaseCents: extra,
        lineTotalCents,
      };
    });

    const taxCents = Math.round(netCents * (Number(taxRate) / 100));
    const grossCents = netCents + taxCents;

    await q(
      `INSERT INTO "Invoice" (
        "id","invoiceNo","customerId","issueDate","dueDate",
        "currency","netCents","taxCents","grossCents","taxRate","createdAt","updatedAt"
      ) VALUES (
        $1,$2,$3,COALESCE($4, CURRENT_DATE),$5,
        $6,$7,$8,$9,$10, now(), now()
      )`,
      [id, invoiceNo, customerId, issueDate || null, dueDate || null, currency, netCents, taxCents, grossCents, Number(taxRate || 0)]
    );

    for (const it of normalized) {
      await q(
        `INSERT INTO "InvoiceItem" (
          "id","invoiceId","productId","name","description",
          "quantity","unitPriceCents","extraBaseCents","lineTotalCents","createdAt","updatedAt"
        ) VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9, now(), now()
        )`,
        [
          it.id, it.invoiceId, it.productId, it.name, it.description,
          it.quantity, it.unitPriceCents, it.extraBaseCents, it.lineTotalCents
        ]
      );
    }

    return Response.json({ ok: true, data: { id, invoiceNo } }, { status: 201 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
}
