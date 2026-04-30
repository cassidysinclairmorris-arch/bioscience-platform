import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow static assets, auth APIs, and the public landing page
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/portal/login" ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  const agencyAuth = req.cookies.get("auth")?.value === "gorlin_authenticated";
  const sessionCookie = req.cookies.get("user_session")?.value;

  let sessionRole: string | null = null;
  let sessionClientId: string | null = null;
  if (sessionCookie) {
    try {
      const data = JSON.parse(Buffer.from(sessionCookie, "base64").toString("utf8"));
      sessionRole = data.role ?? null;
      sessionClientId = data.clientId ?? null;
    } catch {
      // invalid cookie
    }
  }

  const isAuthenticated = agencyAuth || !!sessionRole;

  if (!isAuthenticated) {
    // Portal routes go to portal login, everything else to main login
    if (pathname.startsWith("/portal")) {
      return NextResponse.redirect(new URL("/portal/login", req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Client users should only access /portal, not the agency studio
  if (sessionRole === "client" && !pathname.startsWith("/portal") && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/portal", req.url));
  }

  // Agency users (session or cookie) can access everything
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|files/|.*\\.png|.*\\.svg|.*\\.ico).*)"],
};
