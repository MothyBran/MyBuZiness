// middleware.ts  (Projekt-Root)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API & Next-Assets direkt durchlassen
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(ico|png|jpg|jpeg|svg|webp|txt|json)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // alles andere auf "/" umschreiben → SPA rendert, React Router übernimmt
  const url = req.nextUrl.clone();
  url.pathname = "/";
  return NextResponse.rewrite(url);
}

// Matcher: alles außer /api, /_next, und statischen Dateien
export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
