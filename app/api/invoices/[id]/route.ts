// app/api/invoices/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { buildUpdateQuery, query } from "@/server/db";

const TABLE = "Invoice";
const ID = "id";
const ALLOWED = [
  "invoiceNo","customerId","issueDate","dueDate","currency",
  "netCents","taxCents","grossCents","taxRate","note","status","paidAt"
]; // Invoice‑Spalten 

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const invSql = `SELECT * FROM "Invoice" WHERE "${ID}" = $1 LIMIT 1;`;
  const { rows: inv } = await query(invSql, [params.id]);
  if (!inv[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const itemsSql = `SELECT * FROM "InvoiceItem" WHERE "invoiceId" = $1 ORDER BY "createdAt" ASC;`; // InvoiceItem.invoiceId 
  const { rows: items } = await query(itemsSql, [params.id]);

  return NextResponse.json({ ...inv[0], items });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const upd = buildUpdateQuery(TABLE, ID, params.id, body, ALLOWED);
  if (!upd) return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  const { rows } = await query(upd.text, upd.values);
  return NextResponse.json(rows[0]);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  // Items zuerst löschen (FK‑Abhängigkeit)
  await query(`DELETE FROM "InvoiceItem" WHERE "invoiceId" = $1;`, [params.id]); // InvoiceItem.invoiceId 
  await query(`DELETE FROM "Invoice" WHERE "${ID}" = $1;`, [params.id]);
  return NextResponse.json({ ok: true });
}
