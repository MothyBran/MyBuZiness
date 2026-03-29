import { NextResponse } from "next/server";
import { initDb, q } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    await initDb();
    let { email, initialCode, newPassword } = await request.json();
    email = email?.toLowerCase();

    if (!email || !initialCode || !newPassword) {
      return NextResponse.json({ ok: false, error: "Fehlende Parameter." }, { status: 400 });
    }

    // Validiere neues Passwort (Mindestanforderungen)
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (/[a-z]/.test(newPassword)) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;

    if (score < 4) {
      return NextResponse.json({ ok: false, error: "Das Passwort erfüllt nicht die Mindestanforderungen (Min. 8 Zeichen, Groß-/Kleinbuchstaben, Zahl)." }, { status: 400 });
    }

    // Hole den User
    const res = await q(`SELECT * FROM "User" WHERE email = $1`, [email]);
    const user = res.rows[0];

    if (!user || !user.needsPasswordChange) {
      return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
    }

    if (user.initialLoginCode !== initialCode) {
      return NextResponse.json({ ok: false, error: "Ungültiger oder abgelaufener Erst-Login Code." }, { status: 401 });
    }

    // Aktualisiere Passwort und setze needsPasswordChange zurück
    const hashed = await hashPassword(newPassword);

    await q(
      `UPDATE "User" SET "passwordHash" = $1, "needsPasswordChange" = false, "initialLoginCode" = null WHERE id = $2`,
      [hashed, user.id]
    );

    // Erstelle Session, um User direkt einzuloggen
    const token = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'admin',
      ownerId: user.ownerId || null,
    });

    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, ownerId: user.ownerId },
    });
  } catch (e) {
    console.error("Fehler beim Setzen des Passworts:", e);
    return NextResponse.json({ ok: false, error: "Passwort konnte nicht gesetzt werden." }, { status: 500 });
  }
}
