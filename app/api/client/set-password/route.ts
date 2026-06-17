import { NextRequest, NextResponse } from "next/server";
import { getDb, hashPassword, type ClientUser } from "@/lib/db";

// GET validates a token (used by the set-password page on load).
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false }, { status: 400 });

  const db = getDb();
  const user = await db
    .prepare("SELECT * FROM client_users WHERE password_reset_token = ? AND active = 1")
    .get(token) as ClientUser | undefined;

  if (!user || !user.password_reset_expires || new Date(user.password_reset_expires) < new Date()) {
    return NextResponse.json({ valid: false });
  }
  return NextResponse.json({ valid: true, firstName: user.first_name });
}

// POST sets the new password.
export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
    }
    if (String(password).length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const db = getDb();
    const user = await db
      .prepare("SELECT * FROM client_users WHERE password_reset_token = ? AND active = 1")
      .get(token) as ClientUser | undefined;

    if (!user || !user.password_reset_expires || new Date(user.password_reset_expires) < new Date()) {
      return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 400 });
    }

    await db.prepare(
      `UPDATE client_users
         SET password_hash = ?, must_reset_password = 0,
             password_reset_token = NULL, password_reset_expires = NULL
       WHERE id = ?`
    ).run(hashPassword(password), user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Set password error:", err);
    return NextResponse.json({ error: "Could not set password." }, { status: 500 });
  }
}
