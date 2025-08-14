// app/api/customers/[id]/route.js
import { prisma } from "@/lib/prisma";

export async function PUT(request, { params }) {
  const { id } = params;
  const body = await request.json();
  const { name, email, note } = body || {};

  if (!name || !name.trim()) {
    return new Response(JSON.stringify({ ok: false, error: "Name ist erforderlich." }), { status: 400 });
  }

  try {
    const updated = await prisma.customer.update({
      where: { id },
      data: { name: name.trim(), email: email?.trim() || null, note: note?.trim() || null }
    });
    return Response.json({ ok: true, data: updated });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "Update fehlgeschlagen." }), { status: 400 });
  }
}

export async function DELETE(_request, { params }) {
  const { id } = params;
  try {
    await prisma.customer.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "Löschen fehlgeschlagen." }), { status: 400 });
  }
}
