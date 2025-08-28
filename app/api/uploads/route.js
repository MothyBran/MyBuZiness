// app/api/uploads/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";
export const dynamic = "force-dynamic";

function uuid(){ return (globalThis.crypto?.randomUUID?.() ?? require("crypto").randomUUID()); }

export async function POST(req){
  try{
    const form = await req.formData();
    const file = form.get("file");
    const note = form.get("note");
    if(!file || typeof file === "string") return NextResponse.json({ ok:false, error:"Datei fehlt." }, { status:400 });

    // Sicherstellen, dass "Document" existiert (falls Transaktionen-Route noch nicht aufgerufen wurde)
    await q(`CREATE TABLE IF NOT EXISTS "Document" (
      "id" TEXT PRIMARY KEY,
      "filename" TEXT NOT NULL,
      "mimetype" TEXT NOT NULL,
      "sizeBytes" INTEGER NOT NULL,
      "data" BYTEA NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`);

    const buf = Buffer.from(await file.arrayBuffer());
    const row = await q(`INSERT INTO "Document"("id","filename","mimetype","sizeBytes","data") VALUES ($1,$2,$3,$4,$5) RETURNING "id","filename","mimetype","sizeBytes","createdAt"`,
      [uuid(), file.name||"upload.bin", file.type||"application/octet-stream", buf.length, buf]).then(r=>r.rows[0]);

    return NextResponse.json({ ok:true, file: row, note: note||null }, { status:201 });
  }catch(e){
    console.error(e); return NextResponse.json({ ok:false, error:"Upload fehlgeschlagen." }, { status:500 });
  }
}
