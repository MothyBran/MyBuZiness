import { NextResponse } from "next/server";
import { initDb, q } from "@/lib/db";
import { verifyPassword, signToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    await initDb();
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Bitte E-Mail und Passwort eingeben." },
        { status: 400 }
      );
    }

    const res = await q(`SELECT * FROM "User" WHERE email = $1`, [email]);
    const user = res.rows[0];

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Ungültige Anmeldedaten." },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { ok: false, error: "Ungültige Anmeldedaten." },
        { status: 401 }
      );
    }

    // Create Session
    const token = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
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
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Anmeldung fehlgeschlagen." },
      { status: 500 }
    );
  }
}
