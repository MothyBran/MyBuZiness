import { NextResponse } from "next/server";
import { q, initDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    await requireUser();
    await initDb();
    const { rows } = await q(`SELECT * FROM "TaxCategory" ORDER BY "name" ASC`);
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Fehler beim Laden der Kategorien." }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}
