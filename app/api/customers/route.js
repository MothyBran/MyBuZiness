// app/api/customers/route.js
import { prisma } from "@/lib/prisma";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").toLowerCase();

  let where = {};
  if (q) {
    where = {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { note: { contains: q, mode: "insensitive" } }
      ]
    };
  }

  const data = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" }
  });

  return Response.json({ ok: true, data });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, note } = body || {};
    if (!name || !name.trim()) {
      return new Response(JSON.stringify({ ok: false, error: "Name ist erforderlich." }), { status: 400 });
    }

    const created = await prisma.customer.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        note: note?.trim() || null
      }
    });

    return Response.json({ ok: true, data: created }, { status: 201 });
  } catch (e) {
    // Einzigartige Email kann Konflikt werfen
    return new Response(JSON.stringify({ ok: false, error: "Erstellen fehlgeschlagen." }), { status: 400 });
  }
}
