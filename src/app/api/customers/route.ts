// app/api/customers/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db";

// GET /api/customers  → alle Kunden
export async function GET() {
  const sql = `SELECT * FROM "Customer" ORDER BY "createdAt" DESC;`; // Customer.* inkl. addressStreet/City … 
  const { rows } = await query(sql);
  return NextResponse.json(rows);
}

// POST /api/customers  → neuen Kunden anlegen (minimal)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const sql = `
    INSERT INTO "Customer" ("id","name","email","phone","addressStreet","addressZip","addressCity","addressCountry","note","createdAt","updatedAt")
    VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7,$8, NOW(), NOW())
    RETURNING *;
  `;
  const params = [
    body.name ?? null, body.email ?? null, body.phone ?? null,
    body.addressStreet ?? null, body.addressZip ?? null, body.addressCity ?? null, body.addressCountry ?? null,
    body.note ?? null,
  ];
  const { rows } = await query(sql, params);
  return NextResponse.json(rows[0], { status: 201 });
}
