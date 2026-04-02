import { NextResponse } from "next/server";
import { q, initDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(req, { params }) {
  try {
    const userId = await requireUser();
    await initDb();
    const id = params.id;

    if (!id) {
      return NextResponse.json({ ok: false, error: "ID fehlt." }, { status: 400 });
    }

    const { rowCount } = await q(`DELETE FROM "FinanceTransaction" WHERE "id"=$1 AND "userId"=$2`, [id, userId]);

    if (rowCount === 0) {
      return NextResponse.json({ ok: false, error: "Transaktion nicht gefunden oder keine Berechtigung." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Löschen fehlgeschlagen." }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}
