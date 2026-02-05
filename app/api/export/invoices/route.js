// app/api/export/invoices/route.js
import { NextResponse } from "next/server";
import { q, initDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * CSV Export: Rechnungen
 */
export async function GET() {
  try {
    const userId = await requireUser();
    await initDb();
    const { rows } = await q(`
      SELECT i."id", i."invoiceNo", c."name" AS "customerName", i."issueDate", i."dueDate", i."grossCents", i."status"
      FROM "Invoice" i
      LEFT JOIN "Customer" c ON c."id" = i."customerId"
      WHERE i."userId"=$1
      ORDER BY i."issueDate" DESC, i."createdAt" DESC NULLS LAST
    `, [userId]);

    const header = [
      "ID","Nummer","Kunde","Ausgestellt am","Fällig am","Betrag (€)","Bezahlt"
    ];
    const lines = [header.join(";")];

    for (const r of rows) {
      const eur = (Number(r.grossCents || 0) / 100).toFixed(2).replace(".", ",");
      const paid = r.status === "paid" || r.status === "done";
      lines.push([
        r.id,
        r.invoiceNo ?? "",
        (r.customerName ?? "").replace(/;/g, ","),
        r.issueDate ? new Date(r.issueDate).toISOString().slice(0,10) : "",
        r.dueDate ? new Date(r.dueDate).toISOString().slice(0,10) : "",
        eur,
        paid ? "ja" : "nein",
      ].join(";"));
    }

    const csv = lines.join("\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rechnungen_export.csv"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok:false, error: "Export fehlgeschlagen (Rechnungen)." }, { status: err.message === "Unauthorized" ? 401 : 500 });
  }
}
