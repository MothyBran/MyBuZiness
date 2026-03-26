// app/api/appointments/route.js
import { NextResponse } from "next/server";
import { pool, ensureSchemaOnce } from "@/lib/db";
import { requireUser } from "@/lib/auth";

function todayYMD() {
  const z = new Date();
  z.setHours(12, 0, 0, 0);
  return z.toISOString().slice(0, 10);
}

export async function GET(req) {
  try {
    const userId = await requireUser();
    await ensureSchemaOnce();

    const { searchParams } = new URL(req.url);
    const month      = searchParams.get("month");      // YYYY-MM
    const date       = searchParams.get("date");       // YYYY-MM-DD
    const kind       = searchParams.get("kind");       // appointment|order (optional)
    const customerId = searchParams.get("customerId"); // optional
    const upcoming   = searchParams.get("upcoming");   // "true" => kommende Termine
    const status     = searchParams.get("status");     // e.g. "open"
    const limit      = Number(searchParams.get("limit") || 0);

    let sql = `SELECT * FROM "Appointment"`;
    const where = [`"userId" = $1`];
    const args = [userId];

    if (status) {
      where.push(`"status" = $${args.length + 1}`);
      args.push(status);
    }

    if (upcoming === "true") {
      if (status === "open") {
        // The condition `"status" = $2` is already added above (because `status` is truthy).
        // Since we want both upcoming (any status) AND past-open, the logic is:
        // (date >= today OR status = 'open')
        // But since `status` is explicitly set to 'open', ALL results will be 'open'.
        // So `date >= today OR status = 'open'` evaluates to TRUE for ALL open appointments.
        // Therefore, we don't need to add the date constraint if status is 'open'.
        // Wait, if status is 'open', it's already fetching ALL open appointments past and future!
        // So actually, we just skip adding `date >= today` here!
        // But let's be explicit and ensure we don't break anything.
      } else {
        where.push(`"date" >= $${args.length + 1}`);
        args.push(todayYMD());
      }
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

    // For sorting, if it's descending order (e.g., when fetching history), we use DESC
    const sort = searchParams.get("sort");
    if (sort === "desc") {
      sql += ` ORDER BY "date" DESC, "startAt" DESC NULLS LAST`;
    } else {
      sql += ` ORDER BY "date" ASC, "startAt" ASC NULLS FIRST`;
    }

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
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(req) {
  try {
    const userId = await requireUser();
    await ensureSchemaOnce();

    const payload = await req.json();

    // Minimal-Validierung
    const errors = [];
    if (!payload?.title) errors.push("title");
    if (!payload?.date) errors.push("date");
    if (!payload?.startAt) errors.push("startAt");
    if (!payload?.kind || !["appointment","order"].includes(payload.kind)) errors.push("kind");
    if (errors.length) {
      return NextResponse.json({ error: "missing:" + errors.join("," ) }, { status: 400 });
    }

    // Werte normalisieren (leere Strings -> NULL)
    const endAt        = payload.endAt || null;
    const customerId   = payload.customerId || null;
    const customerName = payload.customerName || null;
    const note         = payload.note || null;
    const status       = payload.status || "open";

    const client = await pool.connect();
    try {
      // WICHTIG: id explizit via gen_random_uuid() erzeugen
      const { rows } = await client.query(
        `INSERT INTO "Appointment"
          ("id","kind","title","date","startAt","endAt","customerId","customerName","note","status","userId")
         VALUES (gen_random_uuid(), $1, $2, $3::date, $4::time, $5::time, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          payload.kind,
          payload.title,
          payload.date,
          payload.startAt,
          endAt,
          customerId,
          customerName,
          note,
          status,
          userId
        ]
      );
      return NextResponse.json(rows[0], { status: 201 });
    } finally {
      client.release();
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}
