// app/api/invoices/route.ts
import { NextResponse } from "next/server";
import { query } from "@/server/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  const sql = `SELECT * FROM "Invoice" ORDER BY "createdAt" DESC;`; // Invoice.* inkl. invoiceNo, issueDate, dueDate, grossCents, status … 
  const { rows } = await query(sql);
  return NextResponse.json(rows);
}
