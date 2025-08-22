// app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { buildUpdateQuery, query } from "@/server/db";

export const dynamic = "force-dynamic";      // verhindert Static Generation
export const revalidate = 0;                 // kein ISR

const TABLE = "Product";
const ID = "id";
const ALLOWED = [
  "name","sku","priceCents","currency","description","kind","categoryCode",
  "travelEnabled","travelRateCents","travelUnit","travelBaseCents","travelPerKmCents","hourlyRateCents"
];

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { rows } = await query(`SELECT * FROM "Product" WHERE "${ID}" = $1 LIMIT 1;`, [params.id]);
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const b = await req.json();
  const upd = buildUpdateQuery(TABLE, ID, params.id, b, ALLOWED);
  if (!upd) return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  const { rows } = await query(upd.text, upd.values);
  return NextResponse.json(rows[0]);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await query(`DELETE FROM "Product" WHERE "${ID}" = $1;`, [params.id]);
  return NextResponse.json({ ok: true });
}
