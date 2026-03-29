import { NextResponse } from "next/server";
import { initDb, q } from "@/lib/db";
import { verifyPassword, signToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    await initDb();
    let { email, password } = await request.json();
    email = email?.toLowerCase();

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

    // If employee needs to set up a password, check the initial login code
    if (user.needsPasswordChange) {
      // Password from request is the initial code
      if (password !== user.initialLoginCode) {
         return NextResponse.json(
          { ok: false, error: "Ungültiger Erst-Login Code." },
          { status: 401 }
        );
      }

      // If code matches, return response indicating setup is needed
      return NextResponse.json({
        ok: true,
        needsPasswordSetup: true,
        email: user.email,
        initialCode: password
      });
    }

    // Normal login flow
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { ok: false, error: "Ungültige Anmeldedaten." },
        { status: 401 }
      );
    }

    // Check License Status (only for main user, employee inherits)
    let isExpired = false;
    let expiresAt = null;
    let licenseKind = "lifetime";

    if (user.role !== 'employee') {
      const licenseRes = await q(`SELECT kind, "expiresAt" FROM "License" WHERE "userId" = $1`, [user.id]);
      if (licenseRes.rows.length > 0) {
        const license = licenseRes.rows[0];
        licenseKind = license.kind;
        expiresAt = license.expiresAt;
        if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
          isExpired = true;
        }
      }
    } else if (user.ownerId) {
      // Employees inherit license status from their owner
      const licenseRes = await q(`SELECT kind, "expiresAt" FROM "License" WHERE "userId" = $1`, [user.ownerId]);
      if (licenseRes.rows.length > 0) {
        const license = licenseRes.rows[0];
        licenseKind = license.kind;
        expiresAt = license.expiresAt;
        if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
          isExpired = true;
        }
      }
    }

    // Create Session
    const token = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'admin',
      ownerId: user.ownerId || null,
      licenseKind,
      expiresAt,
      isExpired
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
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Anmeldung fehlgeschlagen." },
      { status: 500 }
    );
  }
}
