// app/api/appointments/[id]/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db";

const TABLE = `"Appointment"`;
const ID = `"id"`;
const ALLOWED = new Set([
  "kind","title","date","startAt","endAt","customerId","customerName","status","note"
]); // Spalten laut Schema 

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { rows } = await query(`SELECT * FROM ${TABLE} WHERE ${ID} = $1 LIMIT 1;`, [params.id]);
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const b = await req.json();
  const keys = Object.keys(b).filter((k) => ALLOWED.has(k));
  if (keys.length === 0) return NextResponse.json({ error: "No valid fields" }, { status: 400 });

  const setSql = keys.map((k, i) => `"${k}" = $${i + 2}`).join(", ");
  const values = [params.id, ...keys.map((k) => b[k])];

  const text = `UPDATE ${TABLE} SET ${setSql}, "updatedAt" = NOW() WHERE ${ID} = $1 RETURNING *;`;
  const { rows } = await query(text, values);
  return NextResponse.json(rows[0]);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await query(`DELETE FROM ${TABLE} WHERE ${ID} = $1;`, [params.id]);
  return NextResponse.json({ ok: true });
}
