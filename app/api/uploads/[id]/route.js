import { NextResponse } from "next/server";
import { q } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  try {
    const p = await params;
    const { id } = p;
    if (!id) return new NextResponse("ID fehlt", { status: 400 });

    const rows = await q(`SELECT "mimetype", "data", "sizeBytes" FROM "Document" WHERE "id" = $1`, [id]);
    const doc = rows.rows[0];

    if (!doc) return new NextResponse("Nicht gefunden", { status: 404 });

    const headers = new Headers();
    headers.set("Content-Type", doc.mimetype);
    headers.set("Content-Length", doc.sizeBytes.toString());
    // Für Bilder im Browser anzeigen, statt direkten Download zu erzwingen
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(doc.data, { status: 200, headers });
  } catch (e) {
    console.error("GET Document Error:", e);
    return new NextResponse("Serverfehler", { status: 500 });
  }
}
