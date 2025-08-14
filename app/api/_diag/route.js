// app/api/_diag/route.js
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [customers, products] = await Promise.all([
      prisma.customer.count().catch(() => -1),
      prisma.product.count().catch(() => -1),
    ]);

    return new Response(
      JSON.stringify({
        ok: true,
        db: "reachable",
        tables: {
          customerCount: customers,
          productCount: products,
          note: "Count = -1 bedeutet: Tabelle (noch) nicht vorhanden."
        }
      }),
      { headers: { "content-type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
