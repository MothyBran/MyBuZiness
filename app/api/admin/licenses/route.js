import { NextResponse } from "next/server";
import { initDb, q, uuid } from "@/lib/db";
import { cookies } from "next/headers";

async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return false;
  return true; // Simplified check based on presence for now.
}

function generateKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let key = "";
  for (let i = 0; i < 9; i++) {
    if (i > 0 && i % 3 === 0) key += "-";
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export async function GET(request) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    await initDb();

    // Fetch licenses with user details if used
    const result = await q(`
      SELECT
        l."id", l."key", l."userId", l."createdAt", l."usedAt", l."kind", l."expiresAt",
        u."name" as "userName", u."email" as "userEmail"
      FROM "License" l
      LEFT JOIN "User" u ON l."userId" = u."id"
      ORDER BY l."createdAt" DESC
    `);

    return NextResponse.json({ ok: true, licenses: result.rows });
  } catch (error) {
    console.error("Fehler beim Abrufen der Lizenzen:", error);
    return NextResponse.json({ ok: false, error: "Interner Fehler" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    await initDb();

    const { kind = "lifetime" } = await request.json().catch(() => ({}));
    const newId = uuid();
    const newKey = generateKey();

    await q(`
      INSERT INTO "License" ("id", "key", "userId", "createdAt", "usedAt", "kind", "expiresAt")
      VALUES ($1, $2, NULL, CURRENT_TIMESTAMP, NULL, $3, NULL)
    `, [newId, newKey, kind]);

    return NextResponse.json({ ok: true, key: newKey });
  } catch (error) {
    console.error("Fehler beim Erstellen der Lizenz:", error);
    return NextResponse.json({ ok: false, error: "Interner Fehler" }, { status: 500 });
  }
}
