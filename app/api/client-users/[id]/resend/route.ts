import { NextRequest, NextResponse } from "next/server";
import { getDb, type ClientUser } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";
import { makeResetToken } from "@/lib/client-session";
import { sendWelcomeEmail } from "@/lib/client-email";

// Regenerate the reset token and resend the welcome email (admin only).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  try {
    const db = getDb();
    const user = await db.prepare("SELECT * FROM client_users WHERE id = ?").get(Number(id)) as ClientUser | undefined;
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const { token, expires } = makeResetToken();
    await db.prepare(
      "UPDATE client_users SET password_reset_token = ?, password_reset_expires = ?, must_reset_password = 1 WHERE id = ?"
    ).run(token, expires, user.id);

    const company = await db.prepare("SELECT name FROM clients WHERE id = ?").get(user.company_id || "") as
      | { name: string }
      | undefined;
    try {
      await sendWelcomeEmail({
        to: user.email,
        firstName: user.first_name,
        role: user.role,
        companyName: company?.name || "",
        link: `${req.nextUrl.origin}/client/set-password?token=${token}`,
        baseUrl: req.nextUrl.origin,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Email failed to send.";
      return NextResponse.json({ success: false, error: msg }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Resend invite error:", err);
    return NextResponse.json({ error: "Could not resend invite." }, { status: 500 });
  }
}
