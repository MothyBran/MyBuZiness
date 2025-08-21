// app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db";

export async function GET() {
  const sql = `SELECT * FROM "Product" ORDER BY "updatedAt" DESC;`; // Product.* inkl. categoryCode, kind, priceCents … 
  const { rows } = await query(sql);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const sql = `
    INSERT INTO "Product" ("id","name","sku","priceCents","currency","description","kind","categoryCode","createdAt","updatedAt")
    VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7, NOW(), NOW())
    RETURNING *;
  `;
  const params = [
    b.name ?? null, b.sku ?? null, b.priceCents ?? 0, b.currency ?? "EUR",
    b.description ?? null, b.kind ?? null, b.categoryCode ?? null
  ];
  const { rows } = await query(sql, params);
  return NextResponse.json(rows[0], { status: 201 });
}
