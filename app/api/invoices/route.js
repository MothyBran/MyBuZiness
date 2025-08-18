// app/api/invoices/route.js
import { initDb, q, uuid } from "@/lib/db";

/**
 * GET /api/invoices?q=...
 * Liefert Rechnungen inkl. Items und Customer-Name
 */
export async function GET(request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const qs = (searchParams.get("q") || "").trim().toLowerCase();

    const sql = `
      SELECT
        i.*,
        c."name" AS "customerName",
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ii."id",
                'productId', ii."productId",
                'name', ii."name",
                'description', ii."description",
                'quantity', ii."quantity",
                'unitPriceCents', ii."unitPriceCents",
                'lineTotalCents', ii."lineTotalCents"
              ) ORDER BY ii."id"
            )
            FROM "InvoiceItem" ii
            WHERE ii."invoiceId" = i."id"
          ),
          '[]'::json
        ) AS items
      FROM "Invoice" i
      JOIN "Customer" c ON c."id" = i."customerId"
      ${
        qs
          ? `WHERE lower(i."invoiceNo") LIKE $1 OR lower(c."name") LIKE $1`
          : ""
      }
      ORDER BY i."issueDate" DESC, i."createdAt" DESC
    `;

    const params = qs ? [`%${qs}%`] : [];
    const rows = (await q(sql, params)).rows;

    return Response.json({ ok: true, data: rows });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
    });
  }
}

/**
 * POST /api/invoices
 * Body (JSON):
 * {
 *   invoiceNo?: string | null
 *   customerId: string
 *   issueDate?: string (YYYY-MM-DD)
 *   dueDate?: string (YYYY-MM-DD)
 *   currency?: string (default EUR)
 *   taxRate?: number (default 19)
 *   items: Array<{
 *     productId?: string | null
 *     name: string
 *     description?: string
 *     quantity: number
 *     unitPriceCents: number   // bereits in Cent!
 *   }>
 * }
 */
export async function POST(request) {
  try {
    await initDb();
    const body = await request.json().catch(() => ({}));

    const {
      invoiceNo: providedInvoiceNo = null,
      customerId,
      issueDate,
      dueDate,
      currency = "EUR",
      taxRate = 19,
    } = body;

    const items = Array.isArray(body.items) ? body.items : [];
    if (!customerId) {
      return new Response(
        JSON.stringify({ ok: false, error: "customerId fehlt." }),
        { status: 400 }
      );
    }
    if (items.length === 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Mindestens eine Position ist erforderlich.",
        }),
        { status: 400 }
      );
    }

    const id = uuid();
    const seq =
      (await q(`SELECT nextval('\"InvoiceNumberSeq\"') AS n`)).rows?.[0]?.n ??
      null;
    const invoiceNo =
      (providedInvoiceNo && String(providedInvoiceNo)) ||
      (seq !== null ? String(seq) : uuid().slice(0, 8));

    // Beträge berechnen
    const itemsSafe = items.map((it) => ({
      productId: it.productId || null,
      name: String(it.name || "").trim(),
      description: it.description || null,
      quantity: Number(it.quantity || 0),
      unitPriceCents: Number(it.unitPriceCents || 0),
    }));

    const netCents = itemsSafe.reduce(
      (s, it) => s + it.quantity * it.unitPriceCents,
      0
    );
    const taxCents = Math.round(netCents * (Number(taxRate || 0) / 100));
    const grossCents = netCents + taxCents;

    // Rechnung speichern
    await q(
      `
      INSERT INTO "Invoice"
      ("id","invoiceNo","customerId","issueDate","dueDate","currency","netCents","taxCents","grossCents","taxRate")
      VALUES ($1,$2,$3,COALESCE($4, CURRENT_DATE),$5,$6,$7,$8,$9,$10)
    `,
      [
        id,
        invoiceNo,
        customerId,
        issueDate || null,
        dueDate || null,
        currency,
        netCents,
        taxCents,
        grossCents,
        Number(taxRate || 0),
      ]
    );

    // Positionen speichern
    for (const it of itemsSafe) {
      await q(
        `
        INSERT INTO "InvoiceItem"
        ("id","invoiceId","productId","name","description","quantity","unitPriceCents","lineTotalCents")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
        [
          uuid(),
          id,
          it.productId,
          it.name,
          it.description,
          it.quantity,
          it.unitPriceCents,
          it.quantity * it.unitPriceCents,
        ]
      );
    }

    // Vollständige Rechnung inkl. Items zurückgeben
    const created = (
      await q(
        `
        SELECT
          i.*,
          c."name" AS "customerName",
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', ii."id",
                  'productId', ii."productId",
                  'name', ii."name",
                  'description', ii."description",
                  'quantity', ii."quantity",
                  'unitPriceCents', ii."unitPriceCents",
                  'lineTotalCents', ii."lineTotalCents"
                ) ORDER BY ii."id"
              )
              FROM "InvoiceItem" ii
              WHERE ii."invoiceId" = i."id"
            ),
            '[]'::json
          ) AS items
        FROM "Invoice" i
        JOIN "Customer" c ON c."id" = i."customerId"
        WHERE i."id" = $1
      `,
        [id]
      )
    ).rows?.[0];

    return Response.json(
      { ok: true, data: created || { id, invoiceNo } },
      { status: 201 }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400,
    });
  }
}
