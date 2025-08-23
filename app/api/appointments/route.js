// app/api/appointments/route.js
export const runtime = "nodejs"; // WICHTIG: pg braucht Node-Runtime, keine Edge

import { NextResponse } from "next/server";
import { pool, ensureSchemaOnce } from "@/lib/db";

function todayYMD() {
  const z = new Date();
  z.setHours(12, 0, 0, 0);
  return z.toISOString().slice(0, 10);
}

export async function GET(req) {
  await ensureSchemaOnce();

  try {
    const { searchParams } = new URL(req.url);
    const month     = searchParams.get("month");      // YYYY-MM
    const date      = searchParams.get("date");       // YYYY-MM-DD
    const kind      = searchParams.get("kind");       // appointment|order (optional)
    const customerId= searchParams.get("customerId"); // optional
    const upcoming  = searchParams.get("upcoming");   // "true" => kommende Termine
    const limit     = Number(searchParams.get("limit") || 0);

    let sql = `SELECT * FROM "Appointment"`;
    const where = [];
    const args = [];

    if (upcoming === "true") {
      where.push(`"date" >= $${args.length + 1}`);
      args.push(todayYMD());
    } else if (date) {
      where.push(`"date" = $${args.length + 1}`);
      args.push(date);
    } else if (month) {
      where.push(`date_trunc('month', "date") = date_trunc('month', $${args.length + 1}::date)`);
      args.push(`${month}-01`);
    }

    if (kind && (kind === "appointment" || kind === "order")) {
      where.push(`"kind" = $${args.length + 1}`);
      args.push(kind);
    }

    if (customerId) {
      where.push(`"customerId" = $${args.length + 1}`);
      args.push(customerId);
    }

    if (where.length) sql += " WHERE " + where.join(" AND ");
    sql += ` ORDER BY "date" ASC, "startAt" ASC NULLS FIRST`;

    if (limit > 0) {
      sql += ` LIMIT ${Math.max(1, Math.min(limit, 50))}`;
    }

    const client = await pool.connect();
    try {
      const { rows } = await client.query(sql, args);
      return NextResponse.json(rows);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("GET /api/appointments failed:", err);
    return NextResponse.json({ error: "server_error", detail: String(err?.message || err) }, { status: 500 });
  }
}

export async function POST(req) {
  await ensureSchemaOnce();

  // Helper: robust in TIME konvertieren (HH:MM -> HH:MM:SS), leere Werte => null
  const toPgTime = (s) => {
    if (!s) return null;
    const t = String(s).trim();
    if (!t) return null;
    // Erlaubt: "HH:MM" oder "HH:MM:SS"
    return /^\d{2}:\d{2}:\d{2}$/.test(t) ? t : `${t}:00`;
  };

  try {
    const payload = await req.json().catch(() => ({}));

    // Minimal-Validierung
    const errors = [];
    if (!payload?.title) errors.push("title");
    if (!payload?.date) errors.push("date");
    if (!payload?.startAt) errors.push("startAt");
    if (!payload?.kind || !["appointment", "order"].includes(payload.kind)) errors.push("kind");
    if (errors.length) {
      return NextResponse.json({ error: "missing_fields", fields: errors }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `INSERT INTO "Appointment"
          ("kind","title","date","startAt","endAt","customerId","customerName","note","status")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [
          payload.kind,
          payload.title,
          payload.date,                 // YYYY-MM-DD
          toPgTime(payload.startAt),    // HH:MM(:SS)
          toPgTime(payload.endAt),      // HH:MM(:SS) oder null
          payload.customerId || null,
          payload.customerName || null,
          payload.note || null,
          payload.status || "open",
        ]
      );
      return NextResponse.json(rows[0], { status: 201 });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("POST /api/appointments failed:", err);
    return NextResponse.json({ error: "server_error", detail: String(err?.message || err) }, { status: 500 });
  }
}
