import { prisma } from "@/lib/prisma";

export async function PUT(request, { params }) {
  const { id } = params;
  const body = await request.json();
  const { name, sku, priceCents, currency = "EUR", description } = body || {};

  if (!name || !name.trim()) {
    return new Response(JSON.stringify({ ok: false, error: "Name ist erforderlich." }), { status: 400 });
  }

  try {
    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: name.trim(),
        sku: sku?.trim() || null,
        priceCents: Number.isFinite(priceCents) ? priceCents : 0,
        currency,
        description: description?.trim() || null,
      },
    });
    return Response.json({ ok: true, data: updated });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "Update fehlgeschlagen (evtl. doppelte SKU?)." }), { status: 400 });
  }
}

export async function DELETE(_request, { params }) {
  const { id } = params;
  try {
    await prisma.product.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Löschen fehlgeschlagen." }), { status: 400 });
  }
}
