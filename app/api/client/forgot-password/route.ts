import { NextRequest, NextResponse } from "next/server";
import { getDb, type ClientUser } from "@/lib/db";
import { makeResetToken } from "@/lib/client-session";
import { sendWelcomeEmail } from "@/lib/client-email";

export async function POST(req: NextRequest) {
  // Always return the same neutral response so the endpoint cannot be used to
  // discover which emails have accounts.
  const neutral = NextResponse.json({
    ok: true,
    message: "If that email is registered, a reset link is on its way.",
  });

  try {
    const { email } = await req.json();
    if (!email) return neutral;

    const db = getDb();
    const user = await db
      .prepare("SELECT * FROM client_users WHERE lower(email) = lower(?) AND active = 1")
      .get(String(email).trim()) as ClientUser | undefined;

    if (!user) return neutral;

    const { token, expires } = makeResetToken();
    await db.prepare(
      "UPDATE client_users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?"
    ).run(token, expires, user.id);

    const company = await db.prepare("SELECT name FROM clients WHERE id = ?").get(user.company_id || "") as
      | { name: string }
      | undefined;
    const link = `${req.nextUrl.origin}/client/set-password?token=${token}`;
    try {
      await sendWelcomeEmail({
        to: user.email,
        firstName: user.first_name,
        role: user.role,
        companyName: company?.name || "",
        link,
        baseUrl: req.nextUrl.origin,
      });
    } catch (e) {
      console.error("Reset email failed:", e);
    }

    return neutral;
  } catch (err) {
    console.error("Forgot password error:", err);
    return neutral;
  }
}
