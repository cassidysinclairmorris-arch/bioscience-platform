import { NextRequest, NextResponse } from "next/server";
import { getDb, ROLE_LIMITS, type ClientRole, type ClientUser } from "@/lib/db";
import { getClientSession } from "@/lib/client-session";
import { makeResetToken } from "@/lib/client-session";
import { sendWelcomeEmail } from "@/lib/client-email";

// GET: team members for the requester's company.
//  - owner sees everyone, administrator sees only users, user is forbidden.
export async function GET(req: NextRequest) {
  const s = getClientSession(req);
  if (!s) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (s.clientRole === "user") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  const cols =
    "id, first_name, last_name, email, role, must_reset_password, active, last_login, created_at";
  const rows =
    s.clientRole === "owner"
      ? await db
          .prepare(`SELECT ${cols} FROM client_users WHERE company_id = ? AND active = 1 ORDER BY role, created_at`)
          .all(s.clientId)
      : await db
          .prepare(`SELECT ${cols} FROM client_users WHERE company_id = ? AND active = 1 AND role != 'owner' ORDER BY role, created_at`)
          .all(s.clientId);

  return NextResponse.json({ team: rows, role: s.clientRole });
}

// POST: add a team member.
//  - owner may add administrator or user; administrator may add user only.
export async function POST(req: NextRequest) {
  const s = getClientSession(req);
  if (!s) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (s.clientRole === "user") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const first_name = String(body.first_name || "").trim();
    const last_name = String(body.last_name || "").trim();
    const email = String(body.email || "").trim();
    const job_title = body.job_title ? String(body.job_title).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;

    // Owners and administrators may create administrators or users, never owners.
    const role = String(body.role || "user") as ClientRole;
    if (role === "owner") {
      return NextResponse.json({ error: "You cannot create an owner." }, { status: 403 });
    }
    if (role !== "administrator" && role !== "user") {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    if (!first_name || !last_name || !email) {
      return NextResponse.json({ error: "Please fill in name and email." }, { status: 400 });
    }

    const db = getDb();
    const count = (await db
      .prepare("SELECT COUNT(*) AS n FROM client_users WHERE company_id = ? AND role = ? AND active = 1")
      .get(s.clientId, role) as { n: number }).n;
    if (count >= ROLE_LIMITS[role]) {
      return NextResponse.json(
        { error: `Your team already has the maximum number of ${role} accounts (${ROLE_LIMITS[role]}).` },
        { status: 400 }
      );
    }

    const existing = await db.prepare("SELECT id FROM client_users WHERE lower(email) = lower(?)").get(email);
    if (existing) {
      return NextResponse.json({ error: "A user with that email already exists." }, { status: 400 });
    }

    const { token, expires } = makeResetToken();
    const info = await db
      .prepare(
        `INSERT INTO client_users
           (first_name, last_name, email, role, company_id, job_title, phone,
            password_reset_token, password_reset_expires, must_reset_password, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`
      )
      .run(first_name, last_name, email, role, s.clientId, job_title, phone, token, expires);

    const company = await db.prepare("SELECT name FROM clients WHERE id = ?").get(s.clientId) as
      | { name: string }
      | undefined;

    let emailSent = true;
    let emailError: string | null = null;
    try {
      await sendWelcomeEmail({
        to: email,
        firstName: first_name,
        role,
        companyName: company?.name || "",
        link: `${req.nextUrl.origin}/client/set-password?token=${token}`,
        baseUrl: req.nextUrl.origin,
      });
    } catch (e) {
      emailSent = false;
      emailError = e instanceof Error ? e.message : "Email failed to send.";
      console.error("Team welcome email failed:", e);
    }

    const created = await db.prepare("SELECT * FROM client_users WHERE id = ?").get(info.lastInsertRowid) as ClientUser;
    return NextResponse.json({ user: created, emailSent, emailError });
  } catch (err) {
    console.error("Add team member error:", err);
    return NextResponse.json({ error: "Could not add team member." }, { status: 500 });
  }
}
