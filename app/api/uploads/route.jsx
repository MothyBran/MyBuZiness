// app/api/uploads/route.js
export const runtime = "nodejs"; // fs nötig

import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ ok: false, error: "Keine Datei hochgeladen." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(file.name || "").toLowerCase() || ".png";
    const safe = crypto.randomBytes(6).toString("hex") + ext;
    const full = path.join(uploadsDir, safe);
    await writeFile(full, buffer);

    // öffentliche URL (Next.js serviert /public)
    const url = `/uploads/${safe}`;
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
