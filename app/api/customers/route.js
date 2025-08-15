import { prisma } from "@/lib/prisma";

export async function GET(request) {
  try {
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
  } catch (e) {
    // WICHTIG: Fehler transparent zurückgeben, damit du siehst, was los ist
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
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
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }
}
