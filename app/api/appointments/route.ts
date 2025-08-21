// app/api/appointments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db";

/**
 * GET /api/appointments
 * Optional Query:
 *  - month=YYYY-MM   → nur Termine des Monats
 *  - from=YYYY-MM-DD & to=YYYY-MM-DD → Datumsbereich (inklusive from, exklusiv to+1)
 *  - customerId=...  → filter nach Kunde
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const customerId = searchParams.get("customerId");

  let sql = `SELECT * FROM "Appointment"`;
  const where: string[] = [];
  const params: any[] = [];

  if (month) {
    // Start/Ende des Monats berechnen
    where.push(`"date" >= $${params.length + 1} AND "date" < $${params.length + 2}`);
    const first = new Date(`${month}-01T00:00:00Z`);
    const next = new Date(first); next.setMonth(first.getMonth() + 1);
    params.push(first.toISOString().slice(0, 10), next.toISOString().slice(0, 10));
  }
  if (from && to) {
    where.push(`"date" >= $${params.length + 1} AND "date" < $${params.length + 2}`);
    const toPlus1 = new Date(`${to}T00:00:00Z`); toPlus1.setDate(toPlus1.getDate() + 1);
    params.push(from, toPlus1.toISOString().slice(0, 10));
  }
  if (customerId) {
    where.push(`"customerId" = $${params.length + 1}`); // Appointment.customerId 
    params.push(customerId);
  }

  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  sql += ` ORDER BY "date" DESC, "startAt" DESC;`; // Appointment.date,startAt 

  const { rows } = await query(sql, params);
  return NextResponse.json(rows);
}

/**
 * POST /api/appointments
 * body: { kind?, title?, date(YYYY-MM-DD), startAt?, endAt?, customerId?, customerName?, status?, note? }
 */
export async function POST(req: NextRequest) {
  const b = await req.json();
  const sql = `
    INSERT INTO "Appointment"
      ("id","kind","title","date","startAt","endAt","customerId","customerName","status","note","createdAt","updatedAt")
    VALUES
      (gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7,$8,$9, NOW(), NOW())
    RETURNING *;
  `;
  const params = [
    b.kind ?? null, b.title ?? null, b.date, b.startAt ?? null, b.endAt ?? null,
    b.customerId ?? null, b.customerName ?? null, b.status ?? null, b.note ?? null
  ];
  const { rows } = await query(sql, params);
  return NextResponse.json(rows[0], { status: 201 });
}
