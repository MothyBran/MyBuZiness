// app/api/selftest/route.js
import { q, dbStatus, hasDbUrl } from "@/lib/db";

export async function GET() {
  try {
    if (!hasDbUrl) {
      return new Response(
        JSON.stringify(
          {
            ok: false,
            error: "DATABASE_URL/POSTGRES_URL fehlt. Bitte Env-Var setzen.",
          },
          null,
          2
        ),
        { status: 503, headers: { "content-type": "application/json" } }
      );
    }

    const status = await dbStatus();
    if (!status.connected) {
      return new Response(
        JSON.stringify(
          { ok: false, error: `DB nicht erreichbar: ${status.reason}` },
          null,
          2
        ),
        { status: 503, headers: { "content-type": "application/json" } }
      );
    }

    // Kleine Beispielabfrage gegen deine Struktur (Settings ist leichtgewichtig)
    const settings = await q(
      'SELECT id, "companyName", "currencyDefault", "taxRateDefault" FROM "Settings" LIMIT 1'
    );

    return new Response(
      JSON.stringify(
        {
          ok: true,
          db: { connected: true, settingsFound: settings.rowCount > 0 },
          sample: settings.rows?.[0] || null,
          now: new Date().toISOString(),
        },
        null,
        2
      ),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify(
        {
          ok: false,
          error: {
            message: err?.message || "Unknown error",
            code: err?.code || null,
          },
        },
        null,
        2
      ),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
