// app/api/finances/transactions/[id]/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(_req, { params }) {
  try {
    const id = params.id;
    const body = await _req.json();
    const fields = [];
    const values = [];
    let i = 0;

    const set = (col, val) => {
      i += 1;
      fields.push(`${col} = $${i}`);
      values.push(val);
    };

    ["kind","amount_cents","currency","booked_on","category","note","related_invoice_id","related_receipt_id"]
      .forEach((k) => {
        if (k in body) set(k, body[k]);
      });

    if (!fields.length) {
      return NextResponse.json({ ok: false, error: "Keine Änderungen übermittelt." }, { status: 400 });
    }

    values.push(id);
    const sql = `UPDATE finance_transactions SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`;
    const { rows } = await q(sql, values);

    return NextResponse.json({ ok: true, row: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Aktualisierung fehlgeschlagen." }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const id = params.id;
    await q(`DELETE FROM finance_transactions WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Löschen fehlgeschlagen." }, { status: 500 });
  }
}
