// app/api/appointments/route.js
import { NextResponse } from "next/server";
import { pool, ensureSchemaOnce } from "@/lib/db";

function todayYMD() {
  const z = new Date();
  z.setHours(12, 0, 0, 0);
  return z.toISOString().slice(0, 10);
}

export async function GET(req) {
  await ensureSchemaOnce();

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
}

export async function POST(req) {
  await ensureSchemaOnce();

  const payload = await req.json();

  // Minimal-Validierung
  const errors = [];
  if (!payload?.title) errors.push("title");
  if (!payload?.date) errors.push("date");
  if (!payload?.startAt) errors.push("startAt");
  if (!payload?.kind || !["appointment","order"].includes(payload.kind)) errors.push("kind");
  if (errors.length) {
    return NextResponse.json({ error: "missing:" + errors.join(",") }, { status: 400 });
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
        payload.date,
        payload.startAt,
        payload.endAt || null,
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
}
