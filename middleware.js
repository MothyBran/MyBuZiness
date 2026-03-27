import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/admin/auth",
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
  const isAdminRoute = pathname.startsWith("/admin");

  if (!user && !isAuthPage && !isAdminRoute) {
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

  // 4b. Admin route protection
  if (isAdminRoute && pathname !== "/admin/login") {
    const adminToken = request.cookies.get("admin_session")?.value;
    if (!adminToken) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    // We assume the admin_session is valid for now.
    // Real validation of signature could be done here if needed.
  }
  if (pathname === "/admin/login") {
    const adminToken = request.cookies.get("admin_session")?.value;
    if (adminToken) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  }

  // 5. Role-based access control for employees
  if (user && user.role === "employee") {
    if (pathname.startsWith("/finanzen") || pathname.startsWith("/einstellungen") || pathname.startsWith("/mitarbeiter")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // 6. Restrict admin-only routes
  if (user && user.role !== "admin") {
    if (pathname.startsWith("/mitarbeiter")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
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
