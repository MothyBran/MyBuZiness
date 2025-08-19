// app/api/invoices/route.js
import { initDb, q, uuid } from "@/lib/db";

/** kleine Helfer */
const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

/**
 * Preislogik nach Produkt-Art:
 * - product:        base=0,           unit=priceCents
 * - service:
 *    - hourlyRate>0 base=priceCents,  unit=hourlyRateCents
 *    - sonst        base=0,           unit=priceCents
 * - travel:         base=travelBaseCents, unit=travelPerKmCents
 */
function computeBaseAndUnit(p) {
  const kind = p?.kind || "product";
  if (kind === "service") {
    const hr = toInt(p?.hourlyRateCents || 0);
    const gp = toInt(p?.priceCents || 0);
    if (hr > 0) return { base: gp, unit: hr, kind };
    return { base: 0, unit: gp, kind };
  }
  if (kind === "travel") {
    return {
      base: toInt(p?.travelBaseCents || 0),
      unit: toInt(p?.travelPerKmCents || 0),
      kind
    };
  }
  return { base: 0, unit: toInt(p?.priceCents || 0), kind };
}

export async function GET(request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const qs = (searchParams.get("q") || "").trim().toLowerCase();

    // Rechnungen laden (+ Kundenname)
    const invoices = (await q(
      `SELECT i.*,
              c."name" AS "customerName"
         FROM "Invoice" i
         JOIN "Customer" c ON c."id" = i."customerId"
        ${qs ? `WHERE lower(i."invoiceNo") LIKE $1 OR lower(c."name") LIKE $1` : ""}
        ORDER BY i."issueDate" DESC NULLS LAST, i."createdAt" DESC NULLS LAST`,
      qs ? [`%${qs}%`] : []
    )).rows;

    if (invoices.length === 0) {
      return new Response(JSON.stringify({ ok: true, data: [] }), {
        status: 200,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      });
    }

    // Alle Items zu diesen Rechnungen holen
    const ids = invoices.map(r => String(r.id));
    const items = (await q(
      `SELECT
          "id",
          "invoiceId",
          COALESCE("productId", NULL)            AS "productId",
          COALESCE("name", '')                   AS "name",
          COALESCE("description", NULL)          AS "description",
          COALESCE("quantity", 0)                AS "quantity",
          COALESCE("unitPriceCents", 0)::bigint  AS "unitPriceCents",
          COALESCE("lineTotalCents", 0)::bigint  AS "lineTotalCents",
          COALESCE("createdAt", now())           AS "createdAt"
        FROM "InvoiceItem"
       WHERE "invoiceId"::text = ANY($1::text[])
       ORDER BY "createdAt" ASC NULLS LAST, "id" ASC`,
      [ids]
    )).rows;

    // Produkte dazu holen, damit wir extraBaseCents (nur für Anzeige) berechnen können
    const productIds = [...new Set(items.map(it => it.productId).filter(Boolean).map(String))];
    let productMap = new Map();
    if (productIds.length) {
      const prows = (await q(
        `SELECT "id"::text AS id,
                COALESCE("name",'') AS name,
                COALESCE("kind",'product') AS kind,
                COALESCE("priceCents",0)::bigint AS "priceCents",
                COALESCE("hourlyRateCents",0)::bigint AS "hourlyRateCents",
                COALESCE("travelBaseCents",0)::bigint AS "travelBaseCents",
                COALESCE("travelPerKmCents",0)::bigint AS "travelPerKmCents"
           FROM "Product"
          WHERE "id"::text = ANY($1::text[])`,
        [productIds]
      )).rows;
      productMap = new Map(prows.map(p => [p.id, p]));
    }

    // Items auf Rechnungen mappen + extraBaseCents fürs Frontend berechnen (nur Response-Feld)
    const byId = new Map(invoices.map(r => [r.id, { ...r, items: [] }]));
    for (const it of items) {
      let extraBaseCents = 0;
      if (it.productId && productMap.has(String(it.productId))) {
        const p = productMap.get(String(it.productId));
        const { base } = computeBaseAndUnit(p);
        extraBaseCents = base;
      }
      const row = byId.get(it.invoiceId);
      if (row) row.items.push({ ...it, extraBaseCents });
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
    const { customerId, issueDate, dueDate, currency = "EUR", taxRate = 19 } = body;
    const items = Array.isArray(body.items) ? body.items : [];
    let manualNo = (body.invoiceNo || "").trim();

    if (!customerId) {
      return new Response(JSON.stringify({ ok:false, error:"customerId fehlt." }), { status:400 });
    }
    if (items.length === 0) {
      return new Response(JSON.stringify({ ok:false, error:"Mindestens eine Position ist erforderlich." }), { status:400 });
    }

    // Rechnungsnummer bestimmen (manuell oder automatisch aus max. Ziffernfolge)
    let invoiceNo = manualNo;
    if (!invoiceNo) {
      const r = (await q(
        `SELECT COALESCE(MAX(
            NULLIF(regexp_replace("invoiceNo", '\\D', '', 'g'), '')::bigint
          ), 0)::bigint AS last
         FROM "Invoice"`
      )).rows[0];
      invoiceNo = String(Number(r?.last || 0) + 1);
    }

    const id = uuid();

    // Produkte für Preislogik in einem Rutsch holen
    const prodIds = items.map(it => it.productId).filter(Boolean).map(String);
    let productMap = new Map();
    if (prodIds.length > 0) {
      const prows = (await q(
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
      productMap = new Map(prows.map(p => [p.id, p]));
    }

    // Items vorbereiten (Server-seitige Wahrheit: Grundpreis + Menge*Einzelpreis)
    const prepared = [];
    let netCents = 0;

    for (const raw of items) {
      const qty = toInt(raw.quantity || 0);
      let unit = toInt(raw.unitPriceCents || 0); // Fallback
      let base = 0;
      let name = (raw.name || "").trim();
      let productId = raw.productId || null;

      if (productId && productMap.has(String(productId))) {
        const p = productMap.get(String(productId));
        const c = computeBaseAndUnit(p);
        base = c.base;
        unit = c.unit;
        if (!name) name = p.name || "Position";
      }

      const lineTotal = base + (qty * unit);
      netCents += lineTotal;

      prepared.push({
        productId,
        name: name || "Position",
        description: null,
        quantity: qty,
        unitPriceCents: unit,      // Anzeige-/Satzwert
        lineTotalCents: lineTotal, // enthält Grundpreis + qty*unit
      });
    }

    const taxCents = Math.round(netCents * (Number(taxRate || 0) / 100));
    const grossCents = netCents + taxCents;

    // Insert Invoice
    await q(
      `INSERT INTO "Invoice"
         ("id","invoiceNo","customerId","issueDate","dueDate","currency","netCents","taxCents","grossCents","taxRate","createdAt","updatedAt")
       VALUES
         ($1,$2,$3,COALESCE($4, CURRENT_DATE),$5,$6,$7,$8,$9,$10,now(),now())`,
      [id, invoiceNo, customerId, issueDate || null, dueDate || null, currency, netCents, taxCents, grossCents, Number(taxRate || 0)]
    );

    // Insert Items
    for (const it of prepared) {
      await q(
        `INSERT INTO "InvoiceItem"
           ("id","invoiceId","productId","name","description","quantity","unitPriceCents","lineTotalCents","createdAt","updatedAt")
         VALUES
           ($1,$2,$3,$4,$5,$6,$7,$8,now(),now())`,
        [
          uuid(),
          id,
          it.productId,
          it.name,
          it.description,
          it.quantity,
          it.unitPriceCents,
          it.lineTotalCents
        ]
      );
    }

    return new Response(JSON.stringify({ ok: true, data: { id, invoiceNo } }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
}
