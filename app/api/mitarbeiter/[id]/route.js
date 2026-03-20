import { NextResponse } from "next/server";
import { initDb, q } from "@/lib/db";
import { getUser } from "@/lib/auth";
import React from "react";

export async function DELETE(request, props) {
  try {
    const user = await getUser();
    if (!user || user.role !== "admin") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const params = await props.params;
    const { id } = params;

    await initDb();

    const res = await q(`DELETE FROM "User" WHERE id = $1 AND "ownerId" = $2 AND role = 'employee' RETURNING id`, [id, user.id]);

    if (res.rowCount === 0) {
      return NextResponse.json({ ok: false, error: "Mitarbeiter nicht gefunden oder keine Berechtigung." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Löschen fehlgeschlagen." }, { status: 500 });
  }
}
