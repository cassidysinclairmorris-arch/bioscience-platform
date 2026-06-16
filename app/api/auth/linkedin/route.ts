import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("client_id");
  if (!clientId) return NextResponse.json({ error: "client_id required" }, { status: 400 });

  const linkedinClientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${req.nextUrl.origin}/api/auth/linkedin/callback`;

  if (!linkedinClientId) return NextResponse.json({ error: "LINKEDIN_CLIENT_ID not configured" }, { status: 503 });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: linkedinClientId,
    redirect_uri: redirectUri,
    state: clientId,
    scope: "openid profile w_member_social",
  });

  return NextResponse.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
}
