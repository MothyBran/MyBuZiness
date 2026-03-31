import { NextResponse } from "next/server";
import { initDb, q, uuid } from "@/lib/db";
import { hashPassword, getUser } from "@/lib/auth";

export async function GET(request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    await initDb();

    let ownerId = user.id;
    if (user.role === "employee" && user.ownerId) {
        ownerId = user.ownerId;
    }

    const res = await q(`
      SELECT id, name, email, "createdAt", "needsPasswordChange", "initialLoginCode"
      FROM "User"
      WHERE "ownerId" = $1 AND "role" = 'employee'
      ORDER BY "createdAt" DESC
    `, [ownerId]);

    return NextResponse.json({ ok: true, data: res.rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Fehler beim Laden." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user || user.role !== "admin") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    await initDb();
    let { name, email } = await request.json();
    email = email?.toLowerCase();

    if (!email || !name) {
      return NextResponse.json({ ok: false, error: "Name und E-Mail sind erforderlich." }, { status: 400 });
    }

    const existing = await q(`SELECT id FROM "User" WHERE email = $1`, [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ ok: false, error: "E-Mail wird bereits verwendet." }, { status: 400 });
    }

    const id = uuid();
    const initialCode = Math.random().toString(36).slice(-8).toUpperCase(); // 8 character random code

    await q(
      `INSERT INTO "User" (id, email, "passwordHash", name, role, "ownerId", "needsPasswordChange", "initialLoginCode") VALUES ($1, $2, $3, $4, 'employee', $5, true, $6)`,
      [id, email, "", name, user.id, initialCode]
    );

    return NextResponse.json({ ok: true, id, initialCode });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Speichern fehlgeschlagen." }, { status: 500 });
  }
}
