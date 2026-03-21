import { NextResponse } from "next/server";
import { initDb, q } from "@/lib/db";
import { getUser } from "@/lib/auth";

export async function POST(request, { params }) {
  try {
    const user = await getUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing ID" }, { status: 400 });
    }

    await initDb();

    // Check if employee exists and belongs to this admin
    const empRes = await q(`SELECT id FROM "User" WHERE id = $1 AND "ownerId" = $2 AND role = 'employee'`, [id, user.id]);
    if (empRes.rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Mitarbeiter nicht gefunden." }, { status: 404 });
    }

    const newCode = Math.random().toString(36).slice(-8).toUpperCase();

    await q(
      `UPDATE "User" SET "needsPasswordChange" = true, "initialLoginCode" = $1, "passwordHash" = '' WHERE id = $2`,
      [newCode, id]
    );

    return NextResponse.json({ ok: true, initialCode: newCode });
  } catch (e) {
    console.error("Fehler beim Zurücksetzen des Codes:", e);
    return NextResponse.json({ ok: false, error: "Zurücksetzen fehlgeschlagen." }, { status: 500 });
  }
}