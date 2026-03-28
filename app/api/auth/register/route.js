import { NextResponse } from "next/server";
import { initDb, q, uuid } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    await initDb();
    const { email, password, name, licenseKey } = await request.json();

    if (!email || !password || !licenseKey) {
      return NextResponse.json(
        { ok: false, error: "E-Mail, Passwort und Lizenzschlüssel erforderlich." },
        { status: 400 }
      );
    }

    // Server-side password strength validation
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;

    if (score < 4) {
      return NextResponse.json(
        { ok: false, error: "Das Passwort erfüllt nicht die Mindestanforderungen." },
        { status: 400 }
      );
    }

    // Validate License Key
    const licenseResult = await q(`SELECT * FROM "License" WHERE key = $1`, [licenseKey]);
    if (licenseResult.rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Ungültiger Lizenzschlüssel." },
        { status: 400 }
      );
    }

    const license = licenseResult.rows[0];
    if (license.userId) {
      return NextResponse.json(
        { ok: false, error: "Dieser Lizenzschlüssel wurde bereits verwendet." },
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

    // We should do this in a transaction, but using separate queries for simplicity since q uses a pool
    // In production we would use a client transaction.
    // Create User
    await q(
      `INSERT INTO "User" (id, email, "passwordHash", name) VALUES ($1, $2, $3, $4)`,
      [id, email, hashed, name || email.split("@")[0]]
    );

    // Calculate expiration if trial
    let expiresAt = null;
    if (license.kind === "trial") {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 14);
      expiresAt = expirationDate.toISOString();
    }

    // Mark License as used
    await q(
      `UPDATE "License" SET "userId" = $1, "usedAt" = CURRENT_TIMESTAMP, "expiresAt" = $3 WHERE key = $2`,
      [id, licenseKey, expiresAt]
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

    // Registration successful, but we don't log them in automatically.
    return NextResponse.json({ ok: true, message: "Registration successful. Please log in." });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Registrierung fehlgeschlagen." },
      { status: 500 }
    );
  }
}
