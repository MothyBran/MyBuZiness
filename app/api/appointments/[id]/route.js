// app/api/appointments/[id]/route.js
import { NextResponse } from "next/server";
import { pool, ensureSchemaOnce } from "@/lib/db";

export async function GET(_req, { params }) {
  await ensureSchemaOnce();
  const id = params.id;

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT * FROM "Appointment" WHERE "id" = $1`,
      [id]
    );
    if (!rows[0]) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(rows[0]);
  } finally {
    client.release();
  }
}

export async function PUT(req, { params }) {
  await ensureSchemaOnce();
  const id = params.id;
  const payload = await req.json();

  const fields = [
    "kind","title","date","startAt","endAt","customerId","customerName","note","status"
  ];
  const sets = [];
  const args = [];

  fields.forEach((k) => {
    if (k in payload) {
      sets.push(`"${k}" = $${args.length + 1}`);
      args.push(payload[k]);
    }
  });
  sets.push(`"updatedAt" = NOW()`);
  if (sets.length === 1) {
    return NextResponse.json({ error: "no_fields" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `UPDATE "Appointment" SET ${sets.join(", ")} WHERE "id" = $${args.length + 1} RETURNING *`,
      [...args, id]
    );
    if (!rows[0]) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(rows[0]);
  } finally {
    client.release();
  }
}

export async function DELETE(_req, { params }) {
  await ensureSchemaOnce();
  const id = params.id;

  const client = await pool.connect();
  try {
    const { rowCount } = await client.query(
      `DELETE FROM "Appointment" WHERE "id" = $1`,
      [id]
    );
    if (!rowCount) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } finally {
    client.release();
  }
}
