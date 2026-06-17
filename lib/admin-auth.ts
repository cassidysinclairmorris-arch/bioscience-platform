import type { NextRequest } from "next/server";

// True when the request carries a valid agency/admin session, matching the
// existing admin auth pattern (the `auth` cookie or a `user_session` with the
// agency role).
export function isAdminRequest(req: NextRequest): boolean {
  if (req.cookies.get("auth")?.value === "gorlin_authenticated") return true;

  const session = req.cookies.get("user_session")?.value;
  if (session) {
    try {
      const data = JSON.parse(Buffer.from(session, "base64").toString("utf8"));
      if (data?.role === "agency") return true;
    } catch {
      // ignore
    }
  }
  return false;
}
