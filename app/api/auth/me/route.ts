import { NextRequest, NextResponse } from "next/server";
import { getClientSession } from "@/lib/client-session";

export async function GET(req: NextRequest) {
  // 1. Agency/admin always takes precedence, so an agency user with a leftover
  //    client session still gets full agency access in the studio and portal.
  if (req.cookies.get("auth")?.value === "gorlin_authenticated") {
    return NextResponse.json({ role: "agency", clientId: null, email: "admin@gorlin.com" });
  }

  const userSession = req.cookies.get("user_session")?.value;
  if (userSession) {
    try {
      const data = JSON.parse(Buffer.from(userSession, "base64").toString("utf8"));
      if (data?.role === "agency") return NextResponse.json(data);
    } catch {
      // invalid cookie, fall through
    }
  }

  // 2. New per-client portal session scopes the portal to the client's company.
  const clientSession = getClientSession(req);
  if (clientSession) {
    return NextResponse.json(clientSession);
  }

  // 3. Legacy client user_session (old portal accounts).
  if (userSession) {
    try {
      return NextResponse.json(JSON.parse(Buffer.from(userSession, "base64").toString("utf8")));
    } catch {
      // invalid cookie, fall through
    }
  }

  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}
