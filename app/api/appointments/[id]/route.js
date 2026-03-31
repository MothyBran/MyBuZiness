// app/api/appointments/[id]/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { pool, ensureSchemaOnce } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(_req, { params }) {
  try {
    const userId = await requireUser();
    await ensureSchemaOnce();
    const resolvedParams = await params;
    const id = resolvedParams.id;

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
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const toPgTime = (s) => {
      if (!s) return null;
      const t = String(s).trim();
      if (!t) return null;
      return /^\d{2}:\d{2}:\d{2}$/.test(t) ? t : `${t}:00`;
    };

    const payload = await req.json().catch(() => ({}));

    // erlaubte Felder; Times normalisieren
    const fields = [
      "kind","title","date","startAt","endAt","endDate","employeeId","customerId","customerName","note","status"
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
      // If we are updating date, startAt, endAt, kind, or employeeId, we need to check constraints
      // To keep it simple, fetch the current appointment data and merge with updates to validate
      const { rows: currentRows } = await client.query(`SELECT * FROM "Appointment" WHERE "id" = $1 AND "userId" = $2`, [id, userId]);
      if (!currentRows[0]) return NextResponse.json({ error: "not_found" }, { status: 404 });
      const current = currentRows[0];

      const merged = { ...current, ...payload };
      const isAbsence = merged.kind === "absence";

      if (!isAbsence) {
        // Business Hours Check
        const { rows: settingsRows } = await client.query(`SELECT "appointmentSettings" FROM "Settings" WHERE "userId" = $1 LIMIT 1`, [userId]);
        const settings = settingsRows[0]?.appointmentSettings || { workdays: [1,2,3,4,5], start: "08:00", end: "18:00" };

        const dateObj = new Date(merged.date);
        const dayOfWeek = dateObj.getDay() || 7; // 1=Mo, 7=Su

        const startToUse = toPgTime(payload.startAt) ?? current.startAt;
        const endToUse = toPgTime(payload.endAt) ?? current.endAt ?? startToUse;

        if (startToUse) {
            const [appStartH, appStartM] = startToUse.split(':').map(Number);
            const [appEndH, appEndM] = endToUse.split(':').map(Number);
            const [busStartH, busStartM] = settings.start.split(':').map(Number);
            const [busEndH, busEndM] = settings.end.split(':').map(Number);

            const appStartMin = appStartH * 60 + appStartM;
            const appEndMin = appEndH * 60 + appEndM;
            const busStartMin = busStartH * 60 + busStartM;
            const busEndMin = busEndH * 60 + busEndM;

            if (!settings.workdays.includes(dayOfWeek) || appStartMin < busStartMin || appEndMin > busEndMin) {
                return NextResponse.json({ error: "outside_business_hours" }, { status: 400 });
            }
        }

        // Absence Check
        const overlapQuery = `
          SELECT id FROM "Appointment"
          WHERE "userId" = $1 AND "kind" = 'absence' AND "id" != $4
          AND ("employeeId" IS NULL OR "employeeId" = $2)
          AND $3::date <= "endDate" AND $3::date >= "date"
          LIMIT 1
        `;
        const { rows: overlappingAbsences } = await client.query(overlapQuery, [userId, merged.employeeId || null, merged.date, id]);
        if (overlappingAbsences.length > 0) {
            return NextResponse.json({ error: "employee_absent" }, { status: 400 });
        }
      }

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
    const resolvedParams = await params;
    const id = resolvedParams.id;

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
