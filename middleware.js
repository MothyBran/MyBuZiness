// middleware.js
import { NextResponse } from "next/server";

export function middleware(req) {
  const rid =
    req.headers.get("x-request-id") || crypto.randomUUID();
  const url = req.nextUrl?.href || req.url;

  // Minimales strukturiertes Log (läuft im Server-Log)
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
  res.headers.set("x-request-id", rid);
  return res;
}

// Optional nur aktiv für alles außer statics:
// export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
