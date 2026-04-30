import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = req.cookies.get("user_session")?.value;
  if (session) {
    try {
      const data = JSON.parse(Buffer.from(session, "base64").toString("utf8"));
      return NextResponse.json(data);
    } catch {
      // invalid session cookie, fall through
    }
  }

  const auth = req.cookies.get("auth")?.value;
  if (auth === "gorlin_authenticated") {
    return NextResponse.json({ role: "agency", clientId: null, email: "admin@gorlin.com" });
  }

  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}
