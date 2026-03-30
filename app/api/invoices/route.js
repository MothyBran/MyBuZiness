// app/api/invoices/route.js
import { initDb, q, uuid, pool } from "@/lib/db";
import { requireUser } from "@/lib/auth";

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
      kind
    };
  }
  return { base: 0, unit: toInt(p?.priceCents || 0), kind };
}

export async function GET(request) {
  try {
    const userId = await requireUser();
    await initDb();
    const { searchParams } = new URL(request.url);
    const qs = (searchParams.get("q") || "").trim().toLowerCase();
    const no = (searchParams.get("no") || "").trim();

    const where = [`i."userId" = $1`];
    const params = [userId];
    if (qs) { params.push(`%${qs}%`); where.push(`(lower(i."invoiceNo") LIKE $${params.length} OR lower(c."name") LIKE $${params.length})`); }
    if (no) { params.push(no); where.push(`i."invoiceNo" = $${params.length}`); }

    const invoices = (await q(
      `SELECT i.*,
              c."name" AS "customerName"
         FROM "Invoice" i
         JOIN "Customer" c ON c."id" = i."customerId"
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY i."issueDate" DESC NULLS LAST, i."createdAt" DESC NULLS LAST`,
      params
    )).rows;

    if (invoices.length === 0) {
      return new Response(JSON.stringify({ ok: true, data: [] }), {
        status: 200,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      });
    }

    const ids = invoices.map(r => String(r.id));
    const items = (await q(
      `SELECT
          "id","invoiceId",
          COALESCE("productId", NULL)            AS "productId",
          COALESCE("name", '')                   AS "name",
          COALESCE("description", NULL)          AS "description",
          COALESCE("quantity", 0)                AS "quantity",
          COALESCE("unitPriceCents", 0)::bigint  AS "unitPriceCents",
          COALESCE("lineTotalCents", 0)::bigint  AS "lineTotalCents",
          COALESCE("taxRate", 19)                AS "taxRate",
          COALESCE("createdAt", now())           AS "createdAt"
        FROM "InvoiceItem"
       WHERE "invoiceId"::text = ANY($1::text[])
       ORDER BY "createdAt" ASC NULLS LAST, "id" ASC`,
      [ids]
    )).rows;

    // Produkte laden (für extraBaseCents Anzeige)
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
                COALESCE("travelPerKmCents",0)::bigint AS "travelPerKmCents",
                COALESCE("taxRate",19) AS "taxRate"
           FROM "Product"
          WHERE "id"::text = ANY($1::text[]) AND "userId" = $2`,
        [productIds, userId]
      )).rows;
      productMap = new Map(prows.map(p => [p.id, p]));
    }

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
      status: e.message === "Unauthorized" ? 401 : 500,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
}

export async function POST(request) {
  const client = await pool.connect();
  try {
    const userId = await requireUser();
    await initDb();
    const body = await request.json().catch(() => ({}));
    const items = Array.isArray(body.items) ? body.items : [];
    const customerId = body.customerId;

    if (!customerId) {
      return new Response(JSON.stringify({ ok:false, error:"customerId fehlt." }), { status:400 });
    }
    if (items.length === 0) {
      return new Response(JSON.stringify({ ok:false, error:"Mindestens eine Position ist erforderlich." }), { status:400 });
    }

    // Einstellungen
    const settings = (await client.query(`SELECT * FROM "Settings" WHERE "userId"=$1 ORDER BY "createdAt" ASC LIMIT 1`, [userId])).rows[0] || {};
    const vatExempt = !!settings.kleinunternehmer;
    const taxRateDefault = Number(settings.taxRateDefault ?? 19);
    const taxRate = vatExempt ? 0 : (Number.isFinite(taxRateDefault) ? taxRateDefault : 19);
    const currency = body.currency || settings.currency || "EUR";

    // Rechnungsnummer: RN-YYMM-000 (YY = Jahr 2-stellig, MM = Monat 2-stellig, fortlaufend pro Monat)
    let invoiceNo = (body.invoiceNo || "").trim();
    if (!invoiceNo) {
      const baseDate = body.issueDate ? new Date(body.issueDate) : new Date();
      const yy = String(baseDate.getFullYear()).slice(-2);
      const mm = String(baseDate.getMonth() + 1).padStart(2, "0");
      const yymm = `${yy}${mm}`;
      const pattern = `^RN-${yymm}-(\\d{3})$`;
      const row = (await client.query(
        `SELECT COALESCE(MAX( (regexp_match("invoiceNo", $1))[1]::int ), 0) AS last
           FROM "Invoice"
          WHERE "userId"=$2 AND "invoiceNo" ~ $1`,
        [pattern, userId]
      )).rows[0];
      const next = Number(row?.last || 0) + 1;
      invoiceNo = `RN-${yymm}-${String(next).padStart(3, "0")}`;
    }

    const id = uuid();

    // Produkte für Preislogik
    const prodIds = items.map(it => it.productId).filter(Boolean).map(String);
    let productMap = new Map();
    if (prodIds.length) {
      const prows = (await client.query(
        `SELECT "id"::text AS id,
                COALESCE("name",'') AS name,
                COALESCE("kind",'product') AS kind,
                COALESCE("priceCents",0)::bigint AS "priceCents",
                COALESCE("hourlyRateCents",0)::bigint AS "hourlyRateCents",
                COALESCE("travelBaseCents",0)::bigint AS "travelBaseCents",
                COALESCE("travelPerKmCents",0)::bigint AS "travelPerKmCents",
                COALESCE("taxRate",19) AS "taxRate"
           FROM "Product"
          WHERE "id"::text = ANY($1::text[]) AND "userId"=$2`,
        [prodIds, userId]
      )).rows;
      productMap = new Map(prows.map(p => [p.id, p]));
    }

    // Items + Summen
    const prepared = [];
    let totalGross = 0;
    let totalTax = 0;

    for (const raw of items) {
      const qty = toInt(raw.quantity || 0);
      let unitGross = toInt(raw.unitPriceCents || 0); // Eingegebene Preise sind brutto
      let baseGross = 0;
      let name = (raw.name || "").trim();
      const pid = raw.productId || null;
      let itemTaxRate = raw.taxRate !== undefined ? Number(raw.taxRate) : taxRate;

      if (pid && productMap.has(String(pid))) {
        const p = productMap.get(String(pid));
        const { base: b, unit: u } = computeBaseAndUnit(p);
        baseGross = b; unitGross = u;
        if (p.taxRate !== undefined) {
          itemTaxRate = Number(p.taxRate);
        }
        if (!name) name = p.name || "Position";
      }

      if (vatExempt) {
         itemTaxRate = 0;
      }

      const lineGross = baseGross + qty * unitGross;
      totalGross += lineGross;

      const lineNet = Math.round(lineGross / (1 + (itemTaxRate / 100)));
      const lineTax = lineGross - lineNet;
      totalTax += lineTax;

      prepared.push({
        productId: pid,
        name: name || "Position",
        description: null,
        quantity: qty,
        unitPriceCents: unitGross, // wir speichern den Bruttopreis als Referenz für die UI!
        lineTotalCents: lineGross,
        taxRate: itemTaxRate
      });
    }

    // Rabatt optional
    const discountCents = toInt(body.discountCents || 0);
    const grossAfterDiscount = Math.max(0, totalGross - discountCents);

    // Annäherung: Wir passen die Gesammtsteuer proportional zum Rabatt an
    const taxCents = totalGross > 0 ? Math.round(totalTax * (grossAfterDiscount / totalGross)) : 0;
    const grossCents = grossAfterDiscount;
    const netAfterDiscount = grossCents - taxCents;

    const dueDate = body.dueDate || null;

    await client.query("BEGIN");

    await client.query(
      `INSERT INTO "Invoice"
         ("id","invoiceNo","customerId","issueDate","dueDate","currency","netCents","taxCents","grossCents","taxRate","createdAt","updatedAt","userId")
       VALUES
         ($1,$2,$3,COALESCE($4, CURRENT_DATE),$5,$6,$7,$8,$9,$10,now(),now(),$11)`,
      [id, invoiceNo, customerId, body.issueDate || null, dueDate, currency, netAfterDiscount, taxCents, grossCents, taxRate, userId]
    );

    // Überfällig-Automation bei Erstellung
    let isOverdue = false;
    if (dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(dueDate);
      due.setHours(0, 0, 0, 0);
      if (due < today) {
        isOverdue = true;
      }
    }

    if (isOverdue) {
      // Check if an appointment already exists for this exact due date and invoice
      const apptTitle = `${invoiceNo} überfällig`;
      const apptRes = await client.query(
        `SELECT "id" FROM "Appointment"
          WHERE "userId"=$1
            AND "date"=$2
            AND "title"=$3
            AND "customerId"=$4
          LIMIT 1`,
        [userId, dueDate, apptTitle, customerId]
      );

      if (apptRes.rows.length === 0) {
        // Fetch customer name
        const custRes = await client.query(`SELECT "name" FROM "Customer" WHERE "id"=$1 AND "userId"=$2`, [customerId, userId]);
        const customerName = custRes.rows[0]?.name || "";

        // Insert new appointment
        const apptNote = `Die Zahlung der Rechnung ${invoiceNo} ist überfällig, der Kunde muss benachrichtigt werden!`;
        await client.query(
          `INSERT INTO "Appointment"
             ("id", "kind", "title", "date", "startAt", "status", "customerId", "customerName", "note", "userId", "createdAt", "updatedAt")
           VALUES
             ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())`,
          [uuid(), "order", apptTitle, dueDate, "12:00", "open", customerId, customerName, apptNote, userId]
        );
      }
    }

    if (prepared.length > 0) {
      const flat = [];
      const rows = [];
      for (let i = 0; i < prepared.length; i++) {
        const it = prepared[i];
        const offset = i * 9;
        rows.push(`($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${offset + 5},$${offset + 6},$${offset + 7},$${offset + 8},$${offset + 9},now(),now())`);
        flat.push(uuid(), id, it.productId, it.name, it.description, it.quantity, it.unitPriceCents, it.lineTotalCents, it.taxRate);
      }
      await client.query(
        `INSERT INTO "InvoiceItem"
           ("id","invoiceId","productId","name","description","quantity","unitPriceCents","lineTotalCents","taxRate","createdAt","updatedAt")
         VALUES ${rows.join(",")}`,
        flat
      );
    }

    await client.query("COMMIT");

    return new Response(JSON.stringify({ ok: true, data: { id, invoiceNo } }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: e.message === "Unauthorized" ? 401 : 400,
      headers: { "content-type": "application/json" },
    });
  } finally {
    client.release();
  }
}
