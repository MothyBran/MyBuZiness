// app/api/settings/logo/route.js
import { initDb, q } from "@/lib/db";

export async function GET() {
  try {
    await initDb();
    const row = (await q(
      `SELECT "logoData","logoMime" FROM "Settings" WHERE "id"='singleton'`
    )).rows[0];
    if (!row || !row.logoData) {
      return new Response("No logo", { status: 404 });
    }
    return new Response(row.logoData, {
      status: 200,
      headers: {
        "content-type": row.logoMime || "application/octet-stream",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return new Response("Error", { status: 500 });
  }
}

export async function POST(request) {
  try {
    await initDb();
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return new Response(JSON.stringify({ ok: false, error: "Datei fehlt." }), { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mime = file.type || "application/octet-stream";

    const res = await q(
      `UPDATE "Settings"
       SET "logoData"=$1, "logoMime"=$2, "logoUrl"=NULL, "updatedAt"=CURRENT_TIMESTAMP
       WHERE "id"='singleton'
       RETURNING "logoMime"`,
      [buffer, mime]
    );
    if (res.rowCount === 0) {
      return new Response(JSON.stringify({ ok: false, error: "Settings nicht gefunden." }), { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
}

export async function DELETE() {
  try {
    await initDb();
    await q(
      `UPDATE "Settings"
       SET "logoData"=NULL, "logoMime"=NULL, "logoUrl"=NULL, "updatedAt"=CURRENT_TIMESTAMP
       WHERE "id"='singleton'`
    );
    return Response.json({ ok: true });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
}
