// app/api/customers/route.js
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// --- robustes Schema-Safety (nur hier, kein Top-Level beim Import) ---------
async function ensureCustomerSchema(client){
  await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS "Customer" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" TEXT NOT NULL,
      "street" TEXT,
      "zip" TEXT,
      "city" TEXT,
      "phone" TEXT,
      "email" TEXT,
      "note" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS "idx_customer_name" ON "Customer" (lower("name"));
    CREATE INDEX IF NOT EXISTS "idx_customer_city" ON "Customer" (lower("city"));
  `);
}

function cleanCustomerPayload(p){
  const o = p || {};
  return {
    name: (o.name ?? "").toString().trim(),
    street: (o.street ?? "").toString().trim() || null,
    zip: (o.zip ?? o.plz ?? "").toString().trim() || null,
    city: (o.city ?? "").toString().trim() || null,
    phone: (o.phone ?? o.tel ?? "").toString().trim() || null,
    email: (o.email ?? "").toString().trim() || null,
    note: (o.note ?? "").toString().trim() || null,
  };
}

// GET /api/customers?search=...&limit=...&offset=...
export async function GET(request){
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("search") || "").trim();
  const limit = Math.max(0, Math.min(200, Number(searchParams.get("limit") || 100)));
  const offset = Math.max(0, Number(searchParams.get("offset") || 0));

  const client = await pool.connect();
  try {
    await ensureCustomerSchema(client);
    if (q) {
      const { rows } = await client.query(
        `SELECT * FROM "Customer"
         WHERE lower("name") LIKE lower($1) OR lower(coalesce("city",''))
               LIKE lower($1)
         ORDER BY "name" ASC
         LIMIT $2 OFFSET $3`,
        [`%${q}%`, limit, offset]
      );
      return NextResponse.json(rows, { status: 200 });
    } else {
      const { rows } = await client.query(
        `SELECT * FROM "Customer" ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      return NextResponse.json(rows, { status: 200 });
    }
  } catch (e){
    console.error("GET /api/customers failed:", e);
    return NextResponse.json({ error: "customers_list_failed" }, { status: 500 });
  } finally {
    client.release();
  }
}

// POST /api/customers
export async function POST(request){
  const client = await pool.connect();
  try {
    await ensureCustomerSchema(client);

    let payload;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const data = cleanCustomerPayload(payload);
    if (!data.name) {
      return NextResponse.json({ error: "missing:name" }, { status: 400 });
    }

    const { rows } = await client.query(
      `INSERT INTO "Customer" ("name","street","zip","city","phone","email","note","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
       RETURNING *`,
      [data.name, data.street, data.zip, data.city, data.phone, data.email, data.note]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (e){
    console.error("POST /api/customers failed:", e);
    return NextResponse.json({ error: "customer_create_failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
