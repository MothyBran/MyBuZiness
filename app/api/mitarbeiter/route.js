import { NextResponse } from "next/server";
import { initDb, q, uuid } from "@/lib/db";
import { hashPassword, getUser } from "@/lib/auth";

export async function GET(request) {
  try {
    const user = await getUser();
    if (!user || user.role !== "admin") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    await initDb();

    const res = await q(`
      SELECT id, name, email, "createdAt"
      FROM "User"
      WHERE "ownerId" = $1 AND "role" = 'employee'
      ORDER BY "createdAt" DESC
    `, [user.id]);

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
    const { name, email, password } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ ok: false, error: "Alle Felder sind erforderlich." }, { status: 400 });
    }

    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;

    if (score < 4) {
      return NextResponse.json({ ok: false, error: "Das Passwort erfüllt nicht die Mindestanforderungen." }, { status: 400 });
    }

    const existing = await q(`SELECT id FROM "User" WHERE email = $1`, [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ ok: false, error: "E-Mail wird bereits verwendet." }, { status: 400 });
    }

    const id = uuid();
    const hashed = await hashPassword(password);

    await q(
      `INSERT INTO "User" (id, email, "passwordHash", name, role, "ownerId") VALUES ($1, $2, $3, $4, 'employee', $5)`,
      [id, email, hashed, name, user.id]
    );

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Speichern fehlgeschlagen." }, { status: 500 });
  }
}
