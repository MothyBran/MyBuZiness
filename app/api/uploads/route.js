// app/api/uploads/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const invoice_id = form.get("invoice_id");
    const receipt_id = form.get("receipt_id");
    const note = form.get("note");

    if (!file || typeof file === "string") {
      return NextResponse.json({ ok:false, error: "Datei fehlt." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);
    const filename = file.name || "upload.bin";
    const mimetype = file.type || "application/octet-stream";
    const size = bytes.length;

    const { rows } = await q(
      `INSERT INTO documents (filename, mimetype, size_bytes, data, invoice_id, receipt_id, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, filename, mimetype, size_bytes, created_at`,
      [filename, mimetype, size, bytes, invoice_id || null, receipt_id || null, note || null]
    );

    return NextResponse.json({ ok:true, file: rows[0] }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok:false, error: "Upload fehlgeschlagen." }, { status: 500 });
  }
}
