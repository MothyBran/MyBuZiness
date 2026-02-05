// app/api/appointments/[id]/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { pool, ensureSchemaOnce } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(_req, { params }) {
  try {
    const userId = await requireUser();
    await ensureSchemaOnce();
    const id = params.id;

    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT * FROM "Appointment" WHERE "id" = $1 AND "userId" = $2`,
        [id, userId]
      );
      if (!rows[0]) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json(rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("GET /api/appointments/[id] failed:", err);
    return NextResponse.json({ error: "server_error", detail: String(err?.message || err) }, { status: err.message === "Unauthorized" ? 401 : 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const userId = await requireUser();
    await ensureSchemaOnce();
    const id = params.id;

    const toPgTime = (s) => {
      if (!s) return null;
      const t = String(s).trim();
      if (!t) return null;
      return /^\d{2}:\d{2}:\d{2}$/.test(t) ? t : `${t}:00`;
    };

    const payload = await req.json().catch(() => ({}));

    // erlaubte Felder; Times normalisieren
    const fields = [
      "kind","title","date","startAt","endAt","customerId","customerName","note","status"
    ];
    const sets = [];
    const args = [];

    fields.forEach((k) => {
      if (k in payload) {
        let val = payload[k];
        if (k === "startAt" || k === "endAt") val = toPgTime(val);
        if (val === "") val = null;
        sets.push(`"${k}" = $${args.length + 1}`);
        args.push(val);
      }
    });
    sets.push(`"updatedAt" = NOW()`);

    if (sets.length === 1) {
      return NextResponse.json({ error: "no_fields" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `UPDATE "Appointment" SET ${sets.join(", ")} WHERE "id" = $${args.length + 1} AND "userId" = $${args.length + 2} RETURNING *`,
        [...args, id, userId]
      );
      if (!rows[0]) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json(rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("PUT /api/appointments/[id] failed:", err);
    return NextResponse.json({ error: "server_error", detail: String(err?.message || err) }, { status: err.message === "Unauthorized" ? 401 : 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const userId = await requireUser();
    await ensureSchemaOnce();
    const id = params.id;

    const client = await pool.connect();
    try {
      const { rowCount } = await client.query(
        `DELETE FROM "Appointment" WHERE "id" = $1 AND "userId" = $2`,
        [id, userId]
      );
      if (!rowCount) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("DELETE /api/appointments/[id] failed:", err);
    return NextResponse.json({ error: "server_error", detail: String(err?.message || err) }, { status: err.message === "Unauthorized" ? 401 : 500 });
  }
}
