// app/api/receipts/[id]/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { buildUpdateQuery, query } from "@/server/db";

const TABLE = "Receipt";
const ID = "id";
const ALLOWED = [
  "receiptNo","date","vatExempt","currency",
  "netCents","taxCents","grossCents","discountCents","note"
]; // Receipt‑Spalten 

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const recSql = `SELECT * FROM "Receipt" WHERE "${ID}" = $1 LIMIT 1;`;
  const { rows: rec } = await query(recSql, [params.id]);
  if (!rec[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const itemsSql = `SELECT * FROM "ReceiptItem" WHERE "receiptId" = $1 ORDER BY "createdAt" ASC;`; // ReceiptItem.receiptId 
  const { rows: items } = await query(itemsSql, [params.id]);

  return NextResponse.json({ ...rec[0], items });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const upd = buildUpdateQuery(TABLE, ID, params.id, body, ALLOWED);
  if (!upd) return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  const { rows } = await query(upd.text, upd.values);
  return NextResponse.json(rows[0]);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await query(`DELETE FROM "ReceiptItem" WHERE "receiptId" = $1;`, [params.id]); // ReceiptItem.receiptId 
  await query(`DELETE FROM "Receipt" WHERE "${ID}" = $1;`, [params.id]);
  return NextResponse.json({ ok: true });
}
