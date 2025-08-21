// app/api/invoices/route.ts
import { NextResponse } from "next/server";
import { query } from "@/server/db";

export async function GET() {
  const sql = `SELECT * FROM "Invoice" ORDER BY "createdAt" DESC;`; // Invoice.* inkl. invoiceNo, issueDate, dueDate, grossCents, status … 
  const { rows } = await query(sql);
  return NextResponse.json(rows);
}
