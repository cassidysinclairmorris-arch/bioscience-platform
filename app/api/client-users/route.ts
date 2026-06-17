import { NextRequest, NextResponse } from "next/server";
import { getDb, ROLE_LIMITS, type ClientRole, type ClientUser } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";
import { makeResetToken } from "@/lib/client-session";
import { sendWelcomeEmail } from "@/lib/client-email";

const ROLES: ClientRole[] = ["owner", "administrator", "user"];

// List all client users (admin only), with company name and unread message count.
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const db = getDb();
  const rows = await db
    .prepare(
      `SELECT cu.id, cu.first_name, cu.last_name, cu.email, cu.role, cu.company_id,
              cu.job_title, cu.phone, cu.notes, cu.must_reset_password, cu.active,
              cu.created_at, cu.last_login, c.name AS company_name,
              (SELECT COUNT(*) FROM messages m WHERE m.client_user_id = cu.id
                 AND m.sender = 'client' AND m.read_at IS NULL) AS unread
       FROM client_users cu
       LEFT JOIN clients c ON c.id = cu.company_id
       ORDER BY cu.created_at DESC`
    )
    .all();
  return NextResponse.json({ users: rows });
}

// Create a client user, enforce role limits, send the welcome email (admin only).
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const first_name = String(body.first_name || "").trim();
    const last_name = String(body.last_name || "").trim();
    const email = String(body.email || "").trim();
    const role = String(body.role || "") as ClientRole;
    const company_id = String(body.company_id || "").trim();
    const job_title = body.job_title ? String(body.job_title).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
    const notes = body.notes ? String(body.notes).trim() : null;

    if (!first_name || !last_name || !email || !role || !company_id) {
      return NextResponse.json({ error: "Please fill in name, email, role, and company." }, { status: 400 });
    }
    if (!ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    const db = getDb();
    const company = await db.prepare("SELECT id, name FROM clients WHERE id = ?").get(company_id) as
      | { id: string; name: string }
      | undefined;
    if (!company) {
      return NextResponse.json({ error: "That company does not exist." }, { status: 400 });
    }

    // Enforce per-company role limits (active users only).
    const count = (await db
      .prepare("SELECT COUNT(*) AS n FROM client_users WHERE company_id = ? AND role = ? AND active = 1")
      .get(company_id, role) as { n: number }).n;
    if (count >= ROLE_LIMITS[role]) {
      return NextResponse.json(
        { error: `This company already has the maximum number of ${role} accounts (${ROLE_LIMITS[role]}).` },
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
           (first_name, last_name, email, role, company_id, job_title, phone, notes,
            password_reset_token, password_reset_expires, must_reset_password, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`
      )
      .run(first_name, last_name, email, role, company_id, job_title, phone, notes, token, expires);

    let emailSent = true;
    let emailError: string | null = null;
    try {
      await sendWelcomeEmail({
        to: email,
        firstName: first_name,
        role,
        companyName: company.name,
        link: `${req.nextUrl.origin}/client/set-password?token=${token}`,
        baseUrl: req.nextUrl.origin,
      });
    } catch (e) {
      emailSent = false;
      emailError = e instanceof Error ? e.message : "Email failed to send.";
      console.error("Welcome email failed:", e);
    }

    const created = await db.prepare("SELECT * FROM client_users WHERE id = ?").get(info.lastInsertRowid) as ClientUser;
    return NextResponse.json({ user: created, emailSent, emailError });
  } catch (err) {
    console.error("Create client user error:", err);
    return NextResponse.json({ error: "Could not create user." }, { status: 500 });
  }
}
