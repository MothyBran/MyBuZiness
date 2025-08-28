// app/api/finances/transactions/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET ?from=YYYY-MM-DD&to=YYYY-MM-DD&kind=income|expense|transfer&search=... */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const kind = searchParams.get("kind");
    const search = searchParams.get("search");

    const clauses = [];
    const params = [];

    if (from) {
      params.push(from);
      clauses.push(`booked_on >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      clauses.push(`booked_on <= $${params.length}`);
    }
    if (kind) {
      params.push(kind);
      clauses.push(`kind = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(coalesce(category,'') ILIKE $${params.length} OR coalesce(note,'') ILIKE $${params.length})`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const sql = `
      SELECT id, kind, amount_cents, currency, booked_on, category, note,
             related_invoice_id, related_receipt_id, created_at, updated_at
      FROM finance_transactions
      ${where}
      ORDER BY booked_on DESC, created_at DESC
      LIMIT 1000
    `;
    const { rows } = await q(sql, params);
    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Failed to load transactions." }, { status: 500 });
  }
}

/** POST JSON: { kind, amount_cents, currency?, booked_on?, category?, note?, related_invoice_id?, related_receipt_id? } */
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      kind,
      amount_cents,
      currency = "EUR",
      booked_on,
      category,
      note,
      related_invoice_id,
      related_receipt_id,
    } = body || {};

    if (!kind || !["income", "expense", "transfer"].includes(kind)) {
      return NextResponse.json({ ok: false, error: "kind muss income|expense|transfer sein." }, { status: 400 });
    }
    if (!Number.isInteger(amount_cents)) {
      return NextResponse.json({ ok: false, error: "amount_cents (Integer) fehlt." }, { status: 400 });
    }

    const { rows } = await q(
      `INSERT INTO finance_transactions
       (kind, amount_cents, currency, booked_on, category, note, related_invoice_id, related_receipt_id)
       VALUES ($1,$2,$3,COALESCE($4, CURRENT_DATE),$5,$6,$7,$8)
       RETURNING *`,
      [kind, amount_cents, currency, booked_on, category, note, related_invoice_id, related_receipt_id]
    );

    return NextResponse.json({ ok: true, row: rows[0] }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Speichern fehlgeschlagen." }, { status: 500 });
  }
}
