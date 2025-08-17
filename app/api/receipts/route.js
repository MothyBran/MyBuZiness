// app/api/receipts/route.js
import { initDb, q, uuid } from "@/lib/db";

/**
 * GET /api/receipts?q=...
 * - Gibt Belege inkl. Items zurück (Aggregat als JSON-Array)
 * - Sortiert: Datum DESC, createdAt DESC (falls Spalte vorhanden)
 */
export async function GET(request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const qs = (searchParams.get("q") || "").trim().toLowerCase();

    // Mit Items aggregiert zurückgeben
    const sql = `
      SELECT
        r.*,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ri."id",
                'productId', ri."productId",
                'name', ri."name",
                'quantity', ri."quantity",
                'unitPriceCents', ri."unitPriceCents",
                'lineTotalCents', ri."lineTotalCents"
              ) ORDER BY ri."id"
            )
            FROM "ReceiptItem" ri
            WHERE ri."receiptId" = r."id"
          ),
          '[]'::json
        ) AS items
      FROM "Receipt" r
      ${
        qs
          ? `WHERE lower(r."receiptNo") LIKE $1 OR lower(COALESCE(r."note", '')) LIKE $1`
          : ""
      }
      ORDER BY r."date" DESC, r."createdAt" DESC
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
 * POST /api/receipts
 * Body (JSON):
 * {
 *   receiptNo?: string | null     // optional manuell
 *   date?: string (YYYY-MM-DD)
 *   vatExempt?: boolean           // §19 UStG -> true = steuerfrei
 *   currency?: "EUR" | ...
 *   discountCents?: number        // bereits in Cent!
 *   items: Array<{
 *     productId?: string | null
 *     name: string
 *     quantity: number
 *     unitPriceCents: number      // bereits in Cent!
 *   }>
 * }
 */
export async function POST(request) {
  try {
    await initDb();
    const body = await request.json().catch(() => ({}));

    const {
      // manuelle Belegnummer erlauben (sonst auto aus Sequenz)
      receiptNo: providedReceiptNo = null,
      date,
      vatExempt = true,
      currency = "EUR",
      discountCents = 0,
    } = body;

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Mindestens eine Position ist erforderlich.",
        }),
        { status: 400 }
      );
    }

    // IDs & Nummern
    const id = uuid();
    const seq =
      (await q(`SELECT nextval('\"ReceiptNumberSeq\"') AS n`)).rows?.[0]?.n ??
      null;
    const receiptNo =
      (providedReceiptNo && String(providedReceiptNo)) ||
      (seq !== null ? String(seq) : uuid().slice(0, 8));

    // Beträge (in Cent) — KEINE Multiplikation hier!
    const itemsSafe = items.map((it) => ({
      productId: it.productId || null,
      name: String(it.name || "").trim(),
      quantity: Number(it.quantity || 0),
      unitPriceCents: Number(it.unitPriceCents || 0),
    }));

    const netCents = itemsSafe.reduce(
      (s, it) => s + it.quantity * it.unitPriceCents,
      0
    );
    const discount = Number(discountCents || 0); // schon Cent
    const netAfterDiscount = Math.max(0, netCents - discount);
    const taxCents = vatExempt ? 0 : Math.round(netAfterDiscount * 0.19);
    const grossCents = netAfterDiscount + taxCents;

    // Beleg speichern
    await q(
      `
      INSERT INTO "Receipt"
      ("id","receiptNo","date","vatExempt","currency","netCents","taxCents","grossCents","discountCents")
      VALUES ($1,$2,COALESCE($3, CURRENT_DATE),$4,$5,$6,$7,$8,$9)
    `,
      [
        id,
        receiptNo,
        date || null,
        !!vatExempt,
        currency,
        netAfterDiscount, // netto nach Rabatt (vor Steuer)
        taxCents,
        grossCents,
        discount,
      ]
    );

    // Positionen speichern
    for (const it of itemsSafe) {
      await q(
        `
        INSERT INTO "ReceiptItem"
        ("id","receiptId","productId","name","quantity","unitPriceCents","lineTotalCents")
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
        [
          uuid(),
          id,
          it.productId,
          it.name,
          it.quantity,
          it.unitPriceCents,
          it.quantity * it.unitPriceCents,
        ]
      );
    }

    // Vollständiges Objekt inkl. Items zurückgeben
    const created = (
      await q(
        `
        SELECT
          r.*,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', ri."id",
                  'productId', ri."productId",
                  'name', ri."name",
                  'quantity', ri."quantity",
                  'unitPriceCents', ri."unitPriceCents",
                  'lineTotalCents', ri."lineTotalCents"
                ) ORDER BY ri."id"
              )
              FROM "ReceiptItem" ri
              WHERE ri."receiptId" = r."id"
            ),
            '[]'::json
          ) AS items
        FROM "Receipt" r
        WHERE r."id" = $1
      `,
        [id]
      )
    ).rows?.[0];

    return Response.json(
      { ok: true, data: created || { id, receiptNo } },
      { status: 201 }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400,
    });
  }
}
