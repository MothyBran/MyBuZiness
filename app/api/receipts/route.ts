// app/api/receipts/route.ts
import { NextResponse } from "next/server";
import { query } from "@/server/db";

export async function GET() {
  const sql = `SELECT * FROM "Receipt" ORDER BY "createdAt" DESC;`; // Receipt.* inkl. receiptNo, date, grossCents, note … 
  const { rows } = await query(sql);
  return NextResponse.json(rows);
}
