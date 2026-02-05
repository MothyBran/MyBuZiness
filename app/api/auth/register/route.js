import { NextResponse } from "next/server";
import { initDb, q, uuid } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    await initDb();
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "E-Mail und Passwort erforderlich." },
        { status: 400 }
      );
    }

    // Check if user exists
    const existing = await q(`SELECT id FROM "User" WHERE email = $1`, [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { ok: false, error: "Benutzer existiert bereits." },
        { status: 400 }
      );
    }

    const id = uuid();
    const hashed = await hashPassword(password);

    // Create User
    await q(
      `INSERT INTO "User" (id, email, "passwordHash", name) VALUES ($1, $2, $3, $4)`,
      [id, email, hashed, name || email.split("@")[0]]
    );

    // Create Default Settings
    const settingsId = uuid();
    await q(
      `INSERT INTO "Settings" (
        "id", "userId", "companyName", "currencyDefault", "taxRateDefault",
        "primaryColor", "accentColor", "backgroundColor", "textColor",
        "headerTitle", "showLogo", "borderRadius"
      ) VALUES (
        $1, $2, $3, 'EUR', 19.00,
        '#111111', '#2563eb', '#fafafa', '#111111',
        'MyBuZiness', true, 12
      )`,
      [settingsId, id, name ? `${name}s Business` : "Mein Unternehmen"]
    );

    // Create Session
    const token = await signToken({ id, email, name });

    // Set Cookie
    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ ok: true, user: { id, email, name } });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Registrierung fehlgeschlagen." },
      { status: 500 }
    );
  }
}
