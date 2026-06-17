import { NextRequest, NextResponse } from "next/server";
import { getDb, type ClientUser } from "@/lib/db";
import { getClientSession, makeResetToken } from "@/lib/client-session";
import { sendWelcomeEmail } from "@/lib/client-email";

// Resend a welcome email to a team member, scoped to the requester's company.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = getClientSession(req);
  if (!s) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (s.clientRole === "user") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  try {
    const db = getDb();
    const target = await db
      .prepare("SELECT * FROM client_users WHERE id = ? AND company_id = ?")
      .get(Number(id), s.clientId) as ClientUser | undefined;
    if (!target) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (target.role === "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (s.clientRole === "administrator" && target.role !== "user") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { token, expires } = makeResetToken();
    await db.prepare(
      "UPDATE client_users SET password_reset_token = ?, password_reset_expires = ?, must_reset_password = 1 WHERE id = ?"
    ).run(token, expires, target.id);

    const company = await db.prepare("SELECT name FROM clients WHERE id = ?").get(s.clientId) as
      | { name: string }
      | undefined;
    try {
      await sendWelcomeEmail({
        to: target.email,
        firstName: target.first_name,
        role: target.role,
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
    console.error("Team resend error:", err);
    return NextResponse.json({ error: "Could not resend invite." }, { status: 500 });
  }
}
