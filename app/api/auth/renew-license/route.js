import { NextResponse } from "next/server";
import { initDb, q } from "@/lib/db";
import { getUser, signToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Nicht authentifiziert." }, { status: 401 });
    }

    const { licenseKey } = await request.json();

    if (!licenseKey) {
      return NextResponse.json({ ok: false, error: "Bitte geben Sie einen Lizenzschlüssel ein." }, { status: 400 });
    }

    await initDb();

    // The license to renew is the owner's license if employee, or user's own license
    const targetUserId = user.role === 'employee' ? user.ownerId : user.id;

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

    if (license.kind === "trial") {
      return NextResponse.json(
        { ok: false, error: "Es kann kein Trial-Key zur Verlängerung genutzt werden. Bitte verwenden Sie eine Lifetime-Lizenz." },
        { status: 400 }
      );
    }

    // Delete the old expired license for the target user
    await q(`DELETE FROM "License" WHERE "userId" = $1`, [targetUserId]);

    // Mark new license as used by the target user
    await q(
      `UPDATE "License" SET "userId" = $1, "usedAt" = CURRENT_TIMESTAMP WHERE key = $2`,
      [targetUserId, licenseKey]
    );

    // Refresh user's session token to immediately clear the `isExpired` flag
    const newToken = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'admin',
      ownerId: user.ownerId || null,
      licenseKind: license.kind,
      expiresAt: null,
      isExpired: false
    });

    const cookieStore = await cookies();
    cookieStore.set("session", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Fehler bei der Lizenzerneuerung:", e);
    return NextResponse.json(
      { ok: false, error: "Es ist ein unerwarteter Fehler aufgetreten." },
      { status: 500 }
    );
  }
}
