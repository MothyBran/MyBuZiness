// app/api/export/receipts/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * CSV Export: Belege / Quittungen
 * Erwartete Felder in "receipts": id, number, customer_name, issued_on, total_cents, paid
 */
export async function GET() {
  try {
    const { rows } = await q(`
      SELECT id, number, customer_name, issued_on, total_cents, paid
      FROM receipts
      ORDER BY issued_on DESC, created_at DESC NULLS LAST
    `);

    const header = [
      "ID","Nummer","Kunde","Datum","Betrag (€)","Bezahlt"
    ];
    const lines = [header.join(";")];

    for (const r of rows) {
      const eur = (Number(r.total_cents || 0) / 100).toFixed(2).replace(".", ",");
      lines.push([
        r.id,
        r.number ?? "",
        (r.customer_name ?? "").replace(/;/g, ","),
        r.issued_on ?? "",
        eur,
        r.paid ? "ja" : "nein",
      ].join(";"));
    }

    const csv = lines.join("\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="belege_export.csv"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok:false, error: "Export fehlgeschlagen (Belege)." }, { status: 500 });
  }
}
