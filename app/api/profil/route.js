import { NextResponse } from "next/server";
import { initDb, q } from "@/lib/db";
import { getUser, hashPassword, verifyPassword, signToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    await initDb();

    const res = await q(`SELECT id, name, email FROM "User" WHERE id = $1`, [user.id]);
    if (res.rows.length === 0) return NextResponse.json({ ok: false, error: "Benutzer nicht gefunden." }, { status: 404 });

    return NextResponse.json({ ok: true, data: res.rows[0] });
  } catch (e) {
    console.error("Fehler beim Laden des Profils:", e);
    return NextResponse.json({ ok: false, error: "Fehler beim Laden des Profils." }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    let { name, email, oldPassword, newPassword, confirmPassword } = await request.json();
    email = email?.toLowerCase();

    if (!name || !email) {
      return NextResponse.json({ ok: false, error: "Name und E-Mail sind erforderlich." }, { status: 400 });
    }

    await initDb();

    // Check if email is already taken by another user
    const existing = await q(`SELECT id FROM "User" WHERE email = $1 AND id != $2`, [email, user.id]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ ok: false, error: "Die E-Mail wird bereits von einem anderen Konto verwendet." }, { status: 400 });
    }

    let updateQuery = `UPDATE "User" SET name = $1, email = $2`;
    let params = [name, email, user.id];

    if (newPassword || oldPassword || confirmPassword) {
      if (!oldPassword) {
        return NextResponse.json({ ok: false, error: "Bitte geben Sie Ihr aktuelles Passwort ein." }, { status: 400 });
      }
      if (!newPassword || !confirmPassword) {
         return NextResponse.json({ ok: false, error: "Bitte geben Sie ein neues Passwort und die Bestätigung ein." }, { status: 400 });
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json({ ok: false, error: "Die neuen Passwörter stimmen nicht überein." }, { status: 400 });
      }

      if (newPassword === oldPassword) {
        return NextResponse.json({ ok: false, error: "Das neue Passwort darf nicht mit dem alten Passwort identisch sein." }, { status: 400 });
      }

      // Fetch the current user to get the current passwordHash
      const currentUserData = await q(`SELECT "passwordHash" FROM "User" WHERE id = $1`, [user.id]);
      if (currentUserData.rows.length === 0) {
        return NextResponse.json({ ok: false, error: "Benutzer nicht gefunden." }, { status: 404 });
      }

      const currentHash = currentUserData.rows[0].passwordHash;
      if (currentHash) {
         const isValidOld = await verifyPassword(oldPassword, currentHash);
         if (!isValidOld) {
            return NextResponse.json({ ok: false, error: "Das alte Passwort ist falsch." }, { status: 400 });
         }
      }

      // Validate password
      if (newPassword.length > 72) {
        return NextResponse.json({ ok: false, error: "Das Passwort ist zu lang (maximal 72 Zeichen)." }, { status: 400 });
      }

      let score = 0;
      if (newPassword.length >= 8) score += 1;
      if (/[a-z]/.test(newPassword)) score += 1;
      if (/[A-Z]/.test(newPassword)) score += 1;
      if (/[0-9]/.test(newPassword)) score += 1;

      if (score < 4) {
        return NextResponse.json({ ok: false, error: "Das Passwort erfüllt nicht die Mindestanforderungen (Min. 8 Zeichen, Groß-/Kleinbuchstaben, Zahl)." }, { status: 400 });
      }

      const hashed = await hashPassword(newPassword);
      updateQuery += `, "passwordHash" = $4`;
      params = [name, email, user.id, hashed];
    }

    updateQuery += ` WHERE id = $3 RETURNING id, name, email, role, "ownerId"`;

    const res = await q(updateQuery, params);
    const updatedUser = res.rows[0];

    // Refresh Session
    const token = await signToken({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role || 'admin',
      ownerId: updatedUser.ownerId || null,
    });

    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ ok: true, message: "Profil erfolgreich aktualisiert." });
  } catch (e) {
    console.error("Fehler beim Aktualisieren des Profils:", e);
    return NextResponse.json({ ok: false, error: "Aktualisieren des Profils fehlgeschlagen." }, { status: 500 });
  }
}
