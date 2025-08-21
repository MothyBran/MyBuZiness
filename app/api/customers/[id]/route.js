// app/api/customers/[id]/route.js
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

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

// GET /api/customers/:id
export async function GET(_req, { params }){
  const id = params.id;
  const client = await pool.connect();
  try {
    await ensureCustomerSchema(client);
    const { rows } = await client.query(`SELECT * FROM "Customer" WHERE "id"=$1`, [id]);
    if (!rows[0]) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(rows[0], { status: 200 });
  } catch (e){
    console.error("GET /api/customers/:id failed:", e);
    return NextResponse.json({ error: "customer_get_failed" }, { status: 500 });
  } finally {
    client.release();
  }
}

// PUT /api/customers/:id
export async function PUT(request, { params }){
  const id = params.id;
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
    if (!data.name) return NextResponse.json({ error: "missing:name" }, { status: 400 });

    const { rows } = await client.query(
      `UPDATE "Customer"
       SET "name"=$1,"street"=$2,"zip"=$3,"city"=$4,"phone"=$5,"email"=$6,"note"=$7,"updatedAt"=NOW()
       WHERE "id"=$8
       RETURNING *`,
      [data.name, data.street, data.zip, data.city, data.phone, data.email, data.note, id]
    );
    if (!rows[0]) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(rows[0], { status: 200 });
  } catch (e){
    console.error("PUT /api/customers/:id failed:", e);
    return NextResponse.json({ error: "customer_update_failed" }, { status: 500 });
  } finally {
    client.release();
  }
}

// DELETE /api/customers/:id
export async function DELETE(_request, { params }){
  const id = params.id;
  const client = await pool.connect();
  try {
    await ensureCustomerSchema(client);
    const { rowCount } = await client.query(`DELETE FROM "Customer" WHERE "id"=$1`, [id]);
    if (!rowCount) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e){
    console.error("DELETE /api/customers/:id failed:", e);
    return NextResponse.json({ error: "customer_delete_failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
