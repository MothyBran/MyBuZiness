import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/brand-logo.png",
  "/logo.png",
  "/manifest.json",
  "/favicon.ico"
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Bypass static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") // crude way to catch files like .png, .css if not caught above
  ) {
    return NextResponse.next();
  }

  // 2. Check if path is public
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // 3. Check for session cookie
  const token = request.cookies.get("session")?.value;
  const user = token ? await verifyToken(token) : null;

  // 4. Redirect logic
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (!user && !isAuthPage) {
    // Not logged in, trying to access protected page -> Redirect to login
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    // Logged in, trying to access login/register -> Redirect to dashboard
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
