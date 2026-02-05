// app/api/export/receipts/route.js
import { NextResponse } from "next/server";
import { q, initDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * CSV Export: Belege / Quittungen
 */
export async function GET() {
  try {
    const userId = await requireUser();
    await initDb();
    const { rows } = await q(`
      SELECT "id", "receiptNo", "date", "grossCents", "note"
      FROM "Receipt"
      WHERE "userId"=$1
      ORDER BY "date" DESC, "createdAt" DESC NULLS LAST
    `, [userId]);

    const header = [
      "ID","Nummer","Kunde/Info","Datum","Betrag (€)"
    ];
    const lines = [header.join(";")];

    for (const r of rows) {
      const eur = (Number(r.grossCents || 0) / 100).toFixed(2).replace(".", ",");
      lines.push([
        r.id,
        r.receiptNo ?? "",
        (r.note ?? "").replace(/;/g, ","),
        r.date ? new Date(r.date).toISOString().slice(0,10) : "",
        eur
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
    return NextResponse.json({ ok:false, error: "Export fehlgeschlagen (Belege)." }, { status: err.message === "Unauthorized" ? 401 : 500 });
  }
}
