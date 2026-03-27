import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { cookies } from "next/headers";

// Ensure we always read the fresh process.env inside the request
// because Next.js sometimes caches module-level constants if not careful.

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_dev_secret_key_change_me_in_prod"
);

export async function POST(request) {
  try {
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    const { password } = await request.json();

    if (!ADMIN_PASSWORD) {
      return NextResponse.json({ ok: false, error: "Das Admin-Passwort ist noch nicht konfiguriert." }, { status: 500 });
    }

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ ok: false, error: "Ungültiges Passwort" }, { status: 401 });
    }

    const token = await new SignJWT({ role: "superadmin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1d")
      .sign(SECRET_KEY);

    const cookieStore = await cookies();
    cookieStore.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: "Ein Fehler ist aufgetreten" }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
  return NextResponse.json({ ok: true });
}
