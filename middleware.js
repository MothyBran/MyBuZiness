// middleware.js
import { NextResponse } from "next/server";

// Loggt jede Anfrage mit Request-ID und URL ins Server-Log.
// Hilft, die Railway-Request-ID mit deinem Log zu korrelieren.
export function middleware(req) {
  const url = req.nextUrl?.href || req.url;
  const rid =
    req.headers.get("x-request-id") ||
    crypto.randomUUID(); // Fallback, wenn Proxy keine setzt

  // Minimales Log:
  console.log(
    JSON.stringify({
      level: "info",
      msg: "incoming request",
      requestId: rid,
      method: req.method,
      url,
    })
  );

  const res = NextResponse.next();
  // Gib die ID nach außen weiter – nützlich für Fehlerseiten:
  res.headers.set("x-request-id", rid);
  return res;
}

// Optional: nur loggen für bestimmte Pfade
// export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
