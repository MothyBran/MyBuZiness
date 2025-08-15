// app/api/invoices/route.js
import { initDb, q, uuid } from "@/lib/db";

function toInt(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : d;
}

function calcTotals(items, taxRate = 19) {
  const net = items.reduce((s, it) => s + toInt(it.unitPriceCents) * toInt(it.quantity, 1), 0);
  const tax = Math.round(net * (Number(taxRate) / 100));
  const gross = net + tax;
  return { netCents: net, taxCents: tax, grossCents: gross };
}

function formatInvoiceNo(seq) {
  const year = new Date().getFullYear();
  const pad = String(seq).padStart(5, "0");
  return `INV-${year}-${pad}`;
}

export async function GET(request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const qStr = (searchParams.get("q") || "").trim();

    let rows;
    if (qStr) {
      rows = (await q(
        `SELECT i.*, c."name" as "customerName"
         FROM "Invoice" i
         JOIN "Customer" c ON c."id" = i."customerId"
         WHERE i."invoiceNo" ILIKE $1 OR c."name" ILIKE $1
         ORDER BY i."createdAt" DESC`,
        [`%${qStr}%`]
      )).rows;
    } else {
      rows = (await q(
        `SELECT i.*, c."name" as "customerName"
         FROM "Invoice" i
         JOIN "Customer" c ON c."id" = i."customerId"
         ORDER BY i."createdAt" DESC`
      )).rows;
    }

    return Response.json({ ok: true, data: rows });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}

export async function POST(request) {
  const client = await (await import("pg")).Pool.prototype.connect.call((await import("@/lib/db")).pool).catch(() => null);
  try {
    await initDb();
    const body = await request.json().catch(() => ({}));
    const {
      customerId,
      items = [],
      taxRate = 19,
      currency = "EUR",
      issueDate, // optional ISO (YYYY-MM-DD)
      dueDate,   // optional ISO
      note = ""
    } = body || {};

    if (!customerId) {
      return new Response(JSON.stringify({ ok: false, error: "customerId fehlt." }), { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "Mindestens eine Position ist erforderlich." }), { status: 400 });
    }

    // Summen berechnen
    const totals = calcTotals(items, taxRate);

    // Transaktion
    const db = client || (await import("@/lib/db")).pool;
    const c = client || await db.connect();
    const release = client ? () => {} : () => c.release();

    try {
      await c.query("BEGIN");

      // Laufnummer holen
      const seqRow = (await c.query(`SELECT nextval('"InvoiceNumberSeq"') AS seq`)).rows[0];
      const invoiceNo = formatInvoiceNo(seqRow.seq);
      const id = uuid();

      // Invoice anlegen
      const invRes = await c.query(
        `INSERT INTO "Invoice"
         ("id","invoiceNo","customerId","issueDate","dueDate","currency","netCents","taxCents","grossCents","taxRate","note","status")
         VALUES ($1,$2,$3,COALESCE($4,CURRENT_DATE),$5,$6,$7,$8,$9,$10,$11,'open')
         RETURNING *`,
        [id, invoiceNo, customerId, issueDate || null, dueDate || null, currency,
         totals.netCents, totals.taxCents, totals.grossCents, Number(taxRate), note]
      );

      // Items anlegen
      for (const it of items) {
        const itemId = uuid();
        const name = (it.name || "").trim();
        const description = (it.description || "").trim() || null;
        const quantity = toInt(it.quantity, 1);
        const unitPriceCents = toInt(it.unitPriceCents, 0);
        const lineTotalCents = quantity * unitPriceCents;
        const productId = it.productId || null;

        if (!name) throw new Error("Positionsname fehlt.");

        await c.query(
          `INSERT INTO "InvoiceItem"
           ("id","invoiceId","productId","name","description","quantity","unitPriceCents","lineTotalCents")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [itemId, id, productId, name, description, quantity, unitPriceCents, lineTotalCents]
        );
      }

      await c.query("COMMIT");
      release();
      return Response.json({ ok: true, data: invRes.rows[0] }, { status: 201 });
    } catch (e) {
      await c.query("ROLLBACK");
      release();
      throw e;
    }
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
}
