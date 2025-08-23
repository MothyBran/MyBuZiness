// /app/api/health/route.js
import { NextResponse } from "next/server";
import { pool, q, ensureSchemaOnce } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TABLES = [
  "Appointment",
  "Customer",
  "Product",
  "Invoice", "InvoiceItem",
  "Receipt", "ReceiptItem",
  "Settings",
  "Order", "OrderItem",
  "Quote", "QuoteItem",
];

export async function GET(request) {
  const started = Date.now();
  const { searchParams } = new URL(request.url);
  const verbose = searchParams.get("verbose") === "1";

  const result = {
    ok: false,
    time: new Date().toISOString(),
    db: {
      connected: false,
      pingMs: null,
      missingTables: [],
    },
    app: {
      env: process.env.NODE_ENV || "development",
    },
  };

  try {
    // Stellt sicher, dass optionale Schemas (z. B. Appointment) existieren
    await ensureSchemaOnce();

    const t0 = Date.now();
    // Einfache DB-Roundtrip-Pings
    const ping = await q("SELECT now() AS now");
    result.db.pingMs = Date.now() - t0;
    result.db.connected = true;
    result.db.now = ping.rows?.[0]?.now?.toISOString?.() ?? String(ping.rows?.[0]?.now ?? "");

    // Tabellen-Existenz prüfen (Case-sensitiv!)
    const rows = (
      await q(
        `SELECT table_name
           FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = ANY($1::text[])`,
        [TABLES]
      )
    ).rows;

    const have = new Set(rows.map((r) => r.table_name));
    const missing = TABLES.filter((t) => !have.has(t));
    result.db.missingTables = missing;

    // Settings kurz prüfen (optional)
    try {
      const s = (
        await q(
          `SELECT "id","companyName","currencyDefault","taxRateDefault","kleinunternehmer","updatedAt"
             FROM "Settings"
            ORDER BY "updatedAt" DESC NULLS LAST, "createdAt" DESC NULLS LAST
            LIMIT 1`
        )
      ).rows[0];
      if (s) {
        result.settings = {
          id: s.id,
          companyName: s.companyName || s.companyname || null,
          currencyDefault: s.currencyDefault ?? s.currencydefault ?? "EUR",
          taxRateDefault: Number(s.taxRateDefault ?? s.taxratedefault ?? 19),
          kleinunternehmer: !!(s.kleinunternehmer ?? false),
          updatedAt:
            s.updatedAt?.toISOString?.() ??
            s.updatedat?.toISOString?.() ??
            s.updatedAt ??
            s.updatedat ??
            null,
        };
      } else {
        result.settings = null;
      }
    } catch {
      // Settings sind optional – Fehler hier nicht fatal
      result.settings = null;
    }

    // Optional: mehr Details nur bei verbose
    if (verbose) {
      const version = await q("SHOW server_version");
      result.db.serverVersion = version.rows?.[0]?.server_version ?? null;

      // Aktiver User + DB-Name
      const meta = await q("SELECT current_user, current_database()");
      result.db.user = meta.rows?.[0]?.current_user ?? null;
      result.db.database = meta.rows?.[0]?.current_database ?? null;

      // Anzahl Datensätze in Kern-Tabellen (schneller Überblick, LIMIT auf simple COUNTs)
      const counts = {};
      for (const t of ["Customer", "Product", "Invoice", "Receipt", "Order", "Quote"]) {
        try {
          const c = await q(`SELECT COUNT(*)::bigint AS c FROM "${t}"`);
          counts[t] = Number(c.rows[0].c);
        } catch {
          counts[t] = null;
        }
      }
      result.db.counts = counts;
    }

    result.ok = result.db.connected && result.db.missingTables.length === 0;
    result.tookMs = Date.now() - started;

    return NextResponse.json(result, {
      headers: { "cache-control": "no-store, no-cache, must-revalidate" },
    });
  } catch (err) {
    result.error = String(err?.message ?? err);
    result.tookMs = Date.now() - started;
    return NextResponse.json(result, {
      status: 500,
      headers: { "cache-control": "no-store, no-cache, must-revalidate" },
    });
  }
}
