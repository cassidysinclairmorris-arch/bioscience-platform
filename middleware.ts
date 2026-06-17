import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = new Set([
  "/",
  "/landing",
  "/contact",
  "/blog",
  "/login",
  "/portal/login",
  "/client/login",
  "/client/set-password",
  "/client/forgot-password",
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow static assets, marketing pages, and public auth endpoints.
  if (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/blog/") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/client/") || // client login / set-password / forgot / logout
    pathname === "/api/contact"
  ) {
    return NextResponse.next();
  }

  // Admin session (unchanged from before).
  const agencyAuth = req.cookies.get("auth")?.value === "gorlin_authenticated";
  const userSession = req.cookies.get("user_session")?.value;
  let userRole: string | null = null;
  if (userSession) {
    try {
      userRole = JSON.parse(Buffer.from(userSession, "base64").toString("utf8")).role ?? null;
    } catch {
      // invalid cookie
    }
  }

  // New per-client portal session.
  const clientSession = req.cookies.get("client_session")?.value;
  let clientValid = false;
  if (clientSession) {
    try {
      const data = JSON.parse(Buffer.from(clientSession, "base64").toString("utf8"));
      clientValid = data?.role === "client" && Boolean(data?.clientId);
    } catch {
      // invalid cookie
    }
  }

  const isAdmin = agencyAuth || userRole === "agency";
  const isClient = clientValid || userRole === "client";
  const isAuthenticated = isAdmin || isClient;

  // Client portal: clients and admins may view it; everyone else to client login.
  if (pathname === "/portal" || pathname.startsWith("/portal/")) {
    if (isClient || isAdmin) return NextResponse.next();
    return NextResponse.redirect(new URL("/client/login", req.url));
  }

  // Studio / admin: admins only. Client sessions are never allowed in.
  if (pathname === "/studio" || pathname.startsWith("/studio/")) {
    if (isAdmin) return NextResponse.next();
    if (isClient) return NextResponse.redirect(new URL("/portal", req.url));
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // API routes self-authorize; allow any authenticated session through.
  if (pathname.startsWith("/api/")) {
    if (isAuthenticated) return NextResponse.next();
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Any other protected route: admins through; clients back to the portal.
  if (isAdmin) return NextResponse.next();
  if (isClient) return NextResponse.redirect(new URL("/portal", req.url));
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|files/|.*\\.png|.*\\.svg|.*\\.ico).*)"],
};
