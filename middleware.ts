// middleware.ts (Root)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API, Next-Assets & statische Dateien immer durchlassen
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(ico|png|jpg|jpeg|svg|webp|txt|json|css|js|map)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // alles andere auf "/" → SPA rendert
  const url = req.nextUrl.clone();
  url.pathname = "/";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
