// /app/api/invoices/route.js
import { ensureSchemaOnce, q, uuid } from "@/lib/db";
import { nextNumber } from "@/lib/numbering";

/** Helpers */
const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

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
      kind,
    };
  }
  return { base: 0, unit: toInt(p?.priceCents || 0), kind };
}

export async function GET(request) {
  try {
    await ensureSchemaOnce();
    const { searchParams } = new URL(request.url);
    const qs = (searchParams.get("q") || "").trim().toLowerCase();
    const no = (searchParams.get("no") || "").trim();

    const where = [];
    const params = [];
    if (qs) {
      params.push(`%${qs}%`);
      where.push(
        `(lower(i."invoiceNo") LIKE $${params.length} OR lower(c."name") LIKE $${params.length})`
      );
    }
    if (no) {
      params.push(no);
      where.push(`i."invoiceNo" = $${params.length}`);
    }

    const invoices = (
      await q(
        `SELECT i.*,
                c."name" AS "customerName"
           FROM "Invoice" i
           JOIN "Customer" c ON c."id" = i."customerId"
          ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
          ORDER BY i."issueDate" DESC NULLS LAST, i."createdAt" DESC NULLS LAST`,
        params
      )
    ).rows;

    if (invoices.length === 0) {
      return new Response(JSON.stringify({ ok: true, data: [] }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      });
    }

    const ids = invoices.map((r) => String(r.id));
    const items = (
      await q(
        `SELECT
            "id","invoiceId",
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
      )
    ).rows;

    // Produkte (für extraBaseCents)
    const productIds = [
      ...new Set(items.map((it) => it.productId).filter(Boolean).map(String)),
    ];
    let productMap = new Map();
    if (productIds.length) {
      const prows = (
        await q(
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
        )
      ).rows;
      productMap = new Map(prows.map((p) => [p.id, p]));
    }

    const byId = new Map(invoices.map((r) => [r.id, { ...r, items: [] }]));
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

    return new Response(
      JSON.stringify({ ok: true, data: Array.from(byId.values()) }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  }
}

export async function POST(request) {
  try {
    await ensureSchemaOnce();
    const body = await request.json().catch(() => ({}));
    const items = Array.isArray(body.items) ? body.items : [];
    const customerId = body.customerId;

    if (!customerId) {
      return new Response(
        JSON.stringify({ ok: false, error: "customerId fehlt." }),
        { status: 400 }
      );
    }
    if (items.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "Mindestens eine Position ist erforderlich." }),
        { status: 400 }
      );
    }

    // Settings
    const settings =
      (
        await q(
          `SELECT * FROM "Settings" ORDER BY "createdAt" ASC LIMIT 1`
        )
      ).rows[0] || {};
    const vatExempt = !!settings.kleinunternehmer;
    const taxRateDefault = Number(settings.taxRateDefault ?? 19);
    const taxRate = vatExempt ? 0 : (Number.isFinite(taxRateDefault) ? taxRateDefault : 19);
    const currency = body.currency || settings.currency || settings.currencyDefault || "EUR";

    // Rechnungsnummer
    let invoiceNo = (body.invoiceNo || "").trim();
    if (!invoiceNo) {
      const fmt = settings.invoiceNumberFormat || "INV-{yyyy}-{00000}";
      const { no } = await nextNumber("invoice", fmt, { period: "yyyy" });
      invoiceNo = no;
    }

    const id = uuid();

    // Produkte für Preislogik
    const prodIds = items.map((it) => it.productId).filter(Boolean).map(String);
    let productMap = new Map();
    if (prodIds.length) {
      const prows = (
        await q(
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
        )
      ).rows;
      productMap = new Map(prows.map((p) => [p.id, p]));
    }

    // Items + Summen
    const prepared = [];
    let net = 0;
    for (const raw of items) {
      const qty = toInt(raw.quantity || 0);
      let unit = toInt(raw.unitPriceCents || 0);
      let base = 0;
      let name = (raw.name || "").trim();
      const pid = raw.productId || null;

      if (pid && productMap.has(String(pid))) {
        const p = productMap.get(String(pid));
        const { base: b, unit: u } = computeBaseAndUnit(p);
        base = b;
        unit = u;
        if (!name) name = p.name || "Position";
      }

      const line = base + qty * unit;
      net += line;

      prepared.push({
        productId: pid,
        name: name || "Position",
        description: null,
        quantity: qty,
        unitPriceCents: unit,
        lineTotalCents: line,
      });
    }

    const discountCents = toInt(body.discountCents || 0);
    const netAfterDiscount = Math.max(0, net - discountCents);
    const taxCents = Math.round(netAfterDiscount * (taxRate / 100));
    const grossCents = netAfterDiscount + taxCents;

    await q(
      `INSERT INTO "Invoice"
         ("id","invoiceNo","customerId","issueDate","dueDate","currency","netCents","taxCents","grossCents","taxRate","createdAt","updatedAt")
       VALUES
         ($1,$2,$3,COALESCE($4, CURRENT_DATE),$5,$6,$7,$8,$9,$10,now(),now())`,
      [
        id,
        invoiceNo,
        customerId,
        body.issueDate || null,
        body.dueDate || null,
        currency,
        netAfterDiscount,
        taxCents,
        grossCents,
        taxCents === 0 ? 0 : taxRate,
      ]
    );

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
          it.lineTotalCents,
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
