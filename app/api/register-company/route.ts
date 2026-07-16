import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";
import { makeResetToken } from "@/lib/client-session";
import { sendWelcomeEmail } from "@/lib/client-email";
import { TIERS, type Tier } from "@/lib/tiers";

const TIER_KEYS = TIERS.map(t => t.key) as string[];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "company";
}

// Company intake: create the client row (with tier + description) and its owner
// login in one step. The `tier` written here is the same field the reporting
// section reads to gate Linkwright Signal metrics. Agency only.
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const description = body.description ? String(body.description).trim() : null;
    const tier = String(body.tier || "").trim() as Tier;
    const email = String(body.email || "").trim();

    if (!name) return NextResponse.json({ error: "Company name is required." }, { status: 400 });
    if (!email) return NextResponse.json({ error: "A contact email is required." }, { status: 400 });
    if (!TIER_KEYS.includes(tier)) return NextResponse.json({ error: "Choose a service tier." }, { status: 400 });

    const db = getDb();

    const existingEmail = await db.prepare("SELECT id FROM client_users WHERE lower(email) = lower(?)").get(email);
    if (existingEmail) {
      return NextResponse.json({ error: "A user with that email already exists." }, { status: 400 });
    }

    // Unique company id derived from the name.
    const base = slugify(name);
    let id = base;
    let n = 2;
    while (await db.prepare("SELECT id FROM clients WHERE id = ?").get(id)) {
      id = `${base}-${n++}`;
    }

    await db.prepare(
      `INSERT INTO clients (id, name, tagline, color, timezone, audience, voice, posting_days, best_post_times, tier, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, name, null, "#0066ff", "EST", null, null,
      '["Tuesday","Wednesday","Thursday","Friday"]', "{}",
      tier, description
    );

    // Owner login. Only a contact email is collected at intake, so the display
    // name is derived from it and can be edited later in Client Users.
    const local = (email.split("@")[0] || "Account").replace(/[._-]+/g, " ").trim();
    const first_name = (local.charAt(0).toUpperCase() + local.slice(1)) || "Account";
    const last_name = "";

    const { token, expires } = makeResetToken();
    await db.prepare(
      `INSERT INTO client_users
         (first_name, last_name, email, role, company_id, must_reset_password, active,
          password_reset_token, password_reset_expires)
       VALUES (?, ?, ?, 'owner', ?, 1, 1, ?, ?)`
    ).run(first_name, last_name, email, id, token, expires);

    let emailSent = true;
    let emailError: string | null = null;
    try {
      await sendWelcomeEmail({
        to: email,
        firstName: first_name,
        role: "owner",
        companyName: name,
        link: `${req.nextUrl.origin}/client/set-password?token=${token}`,
        baseUrl: req.nextUrl.origin,
      });
    } catch (e) {
      emailSent = false;
      emailError = e instanceof Error ? e.message : "Email failed to send.";
      console.error("Welcome email failed:", e);
    }

    return NextResponse.json({ companyId: id, companyName: name, tier, emailSent, emailError });
  } catch (err) {
    console.error("Register company error:", err);
    return NextResponse.json({ error: "Could not register company." }, { status: 500 });
  }
}
