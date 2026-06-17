import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ENC_KEY_HEX = process.env.ENCRYPTION_KEY || "";

function encrypt(text: string): string {
  if (!ENC_KEY_HEX) return text;
  const key = Buffer.from(ENC_KEY_HEX.padEnd(64, "0").slice(0, 64), "hex");
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + enc.toString("hex");
}

export { encrypt as encryptToken };

export function decryptToken(ciphertext: string): string {
  if (!ENC_KEY_HEX || !ciphertext.includes(":")) return ciphertext;
  try {
    const key = Buffer.from(ENC_KEY_HEX.padEnd(64, "0").slice(0, 64), "hex");
    const [ivHex, encHex] = ciphertext.split(":");
    const decipher = createDecipheriv("aes-256-cbc", key, Buffer.from(ivHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]).toString("utf8");
  } catch { return ciphertext; }
}

export async function GET(req: NextRequest) {
  const code     = req.nextUrl.searchParams.get("code");
  const clientId = req.nextUrl.searchParams.get("state");
  const error    = req.nextUrl.searchParams.get("error");

  if (error || !code || !clientId) {
    return NextResponse.redirect(`${req.nextUrl.origin}/studio?linkedin_error=${error || "missing_params"}`);
  }

  const linkedinClientId     = process.env.LINKEDIN_CLIENT_ID!;
  const linkedinClientSecret = process.env.LINKEDIN_CLIENT_SECRET!;
  const redirectUri          = process.env.LINKEDIN_REDIRECT_URI || `${req.nextUrl.origin}/api/auth/linkedin/callback`;

  // Exchange code for token
  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: linkedinClientId,
      client_secret: linkedinClientSecret,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("[linkedin/callback] token exchange failed:", err);
    return NextResponse.redirect(`${req.nextUrl.origin}/studio?linkedin_error=token_exchange_failed`);
  }

  const tokenData = await tokenRes.json();
  const accessToken  = tokenData.access_token as string;
  const expiresIn    = tokenData.expires_in as number;
  const expiresAt    = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Fetch LinkedIn profile to get sub (URN)
  const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let linkedinUrn = "";
  let linkedinName = "";
  if (profileRes.ok) {
    const profile = await profileRes.json();
    linkedinUrn  = profile.sub ? `urn:li:person:${profile.sub}` : "";
    linkedinName = [profile.given_name, profile.family_name].filter(Boolean).join(" ");
  }

  const db = getDb();
  await db.prepare(`UPDATE clients SET
    linkedin_access_token = ?,
    linkedin_urn = ?,
    linkedin_name = ?,
    linkedin_token_expires_at = ?
    WHERE id = ?
  `).run(encrypt(accessToken), linkedinUrn, linkedinName, expiresAt, clientId);

  return NextResponse.redirect(`${req.nextUrl.origin}/studio?linkedin_connected=1`);
}
