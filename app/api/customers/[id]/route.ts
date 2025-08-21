// app/api/customers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { buildUpdateQuery, query } from "@/server/db";

const TABLE = "Customer";
const ID = "id";
const ALLOWED = [
  "name","email","phone","note",
  "addressStreet","addressZip","addressCity","addressCountry"
]; // Spalten gemäß Customer.* 

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { rows } = await query(`SELECT * FROM "Customer" WHERE "${ID}" = $1 LIMIT 1;`, [params.id]);
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const upd = buildUpdateQuery(TABLE, ID, params.id, body, ALLOWED);
  if (!upd) return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  const { rows } = await query(upd.text, upd.values);
  return NextResponse.json(rows[0]);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await query(`DELETE FROM "Customer" WHERE "${ID}" = $1;`, [params.id]);
  return NextResponse.json({ ok: true });
}
