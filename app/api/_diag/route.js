// app/api/_diag/route.js
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1) Verbindung testen
    await prisma.$queryRaw`SELECT 1`;

    // 2) Tabellenvorhandensein abfragen
    const rows = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema='public'
        AND table_name IN ('Customer','Product')
    `;

    // 3) Zähler versuchen (liefert -1, wenn Tabelle fehlt)
    const [customerCount, productCount] = await Promise.all([
      prisma.customer?.count().catch(() => -1),
      prisma.product?.count().catch(() => -1),
    ]);

    return new Response(
      JSON.stringify({
        ok: true,
        db: "reachable",
        tablesPresent: rows.map(r => r.table_name),
        counts: { customerCount, productCount },
        hint: "Wenn Tabellen fehlen oder Count -1 ist, hat db push/migrate nicht gegriffen."
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
