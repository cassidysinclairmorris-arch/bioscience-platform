import { NextRequest, NextResponse } from "next/server";
import { getDb, type ClientUser } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";
import { makeResetToken } from "@/lib/client-session";
import { sendWelcomeEmail } from "@/lib/client-email";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "company";
}

// Create a new company and its owner user in one step (admin only).
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const company = body.company || {};
    const owner = body.owner || {};

    const companyName = String(company.name || "").trim();
    const first_name = String(owner.first_name || "").trim();
    const last_name = String(owner.last_name || "").trim();
    const email = String(owner.email || "").trim();

    if (!companyName) {
      return NextResponse.json({ error: "Company name is required." }, { status: 400 });
    }
    if (!first_name || !last_name || !email) {
      return NextResponse.json({ error: "Owner name and email are required." }, { status: 400 });
    }

    const db = getDb();

    const existingEmail = await db.prepare("SELECT id FROM client_users WHERE lower(email) = lower(?)").get(email);
    if (existingEmail) {
      return NextResponse.json({ error: "A user with that email already exists." }, { status: 400 });
    }

    // Unique company id from the name.
    const base = slugify(companyName);
    let id = base;
    let n = 2;
    while (await db.prepare("SELECT id FROM clients WHERE id = ?").get(id)) {
      id = `${base}-${n++}`;
    }

    await db.prepare(
      `INSERT INTO clients (id, name, tagline, color, timezone, audience, voice, posting_days, best_post_times)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      companyName,
      company.tagline ? String(company.tagline).trim() : null,
      company.color || "#0066ff",
      company.timezone || "EST",
      null,
      null,
      '["Tuesday","Wednesday","Thursday","Friday"]',
      "{}"
    );

    const { token, expires } = makeResetToken();
    const info = await db
      .prepare(
        `INSERT INTO client_users
           (first_name, last_name, email, role, company_id, job_title, phone, notes,
            password_reset_token, password_reset_expires, must_reset_password, active)
         VALUES (?, ?, ?, 'owner', ?, ?, ?, ?, ?, ?, 1, 1)`
      )
      .run(
        first_name,
        last_name,
        email,
        id,
        owner.job_title ? String(owner.job_title).trim() : null,
        owner.phone ? String(owner.phone).trim() : null,
        owner.notes ? String(owner.notes).trim() : null,
        token,
        expires
      );

    let emailSent = true;
    let emailError: string | null = null;
    try {
      await sendWelcomeEmail({
        to: email,
        firstName: first_name,
        role: "owner",
        companyName,
        link: `${req.nextUrl.origin}/client/set-password?token=${token}`,
        baseUrl: req.nextUrl.origin,
      });
    } catch (e) {
      emailSent = false;
      emailError = e instanceof Error ? e.message : "Email failed to send.";
      console.error("Welcome email failed:", e);
    }

    const created = await db.prepare("SELECT * FROM client_users WHERE id = ?").get(info.lastInsertRowid) as ClientUser;
    return NextResponse.json({ companyId: id, companyName, user: created, emailSent, emailError });
  } catch (err) {
    console.error("Create company + owner error:", err);
    return NextResponse.json({ error: "Could not create company." }, { status: 500 });
  }
}
