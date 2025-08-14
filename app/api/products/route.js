import { prisma } from "@/lib/prisma";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const data = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ ok: true, data });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, sku, priceCents, currency = "EUR", description } = body || {};
    if (!name || !name.trim()) {
      return new Response(JSON.stringify({ ok: false, error: "Name ist erforderlich." }), { status: 400 });
    }
    const created = await prisma.product.create({
      data: {
        name: name.trim(),
        sku: sku?.trim() || null,
        priceCents: Number.isFinite(priceCents) ? priceCents : 0,
        currency,
        description: description?.trim() || null,
      },
    });
    return Response.json({ ok: true, data: created }, { status: 201 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "Erstellen fehlgeschlagen (evtl. doppelte SKU?)." }), { status: 400 });
  }
}
