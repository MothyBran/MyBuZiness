// app/api/diagnose/route.js
import { dbStatus, hasDbUrl } from "@/lib/db";

function mask(v) {
  if (!v) return null;
  return v.length <= 8 ? "***" : v.slice(0, 4) + "..." + v.slice(-4);
}

export async function GET() {
  const status = await dbStatus().catch((e) => ({
    connected: false,
    reason: e?.message || "unknown",
  }));

  const body = {
    ok: true,
    runtime: {
      node: process.version,
      env: process.env.NODE_ENV || null,
    },
    build: {
      sha: process.env.NEXT_PUBLIC_BUILD_SHA || null,
      branch: process.env.NEXT_PUBLIC_BUILD_BRANCH || null,
      buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || null,
    },
    envCheck: {
      HAS_DATABASE_URL: !!process.env.DATABASE_URL,
      HAS_POSTGRES_URL: !!process.env.POSTGRES_URL,
      DATABASE_URL_preview: mask(process.env.DATABASE_URL),
      POSTGRES_URL_preview: mask(process.env.POSTGRES_URL),
      PORT: process.env.PORT || "3000",
    },
    db: {
      hasDbUrl,
      connected: !!status.connected,
      reason: status.reason || null,
    },
    now: new Date().toISOString(),
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
