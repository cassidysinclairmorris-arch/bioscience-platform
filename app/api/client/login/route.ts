import { NextRequest, NextResponse } from "next/server";
import { getDb, hashPassword, type ClientUser } from "@/lib/db";
import { encodeClientSession, CLIENT_SESSION_COOKIE } from "@/lib/client-session";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const db = getDb();
    const user = await db
      .prepare("SELECT * FROM client_users WHERE lower(email) = lower(?) AND active = 1")
      .get(String(email).trim()) as ClientUser | undefined;

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Account created but password never set: route them to set-password.
    if (user.must_reset_password || !user.password_hash) {
      if (user.password_reset_token) {
        return NextResponse.json({ mustReset: true, token: user.password_reset_token });
      }
      return NextResponse.json(
        { error: "Your account is not active yet. Please use the link in your invite email." },
        { status: 403 }
      );
    }

    if (user.password_hash !== hashPassword(password)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await db.prepare("UPDATE client_users SET last_login = datetime('now') WHERE id = ?").run(user.id);

    const session = encodeClientSession({
      role: "client",
      clientId: user.company_id ?? "",
      clientUserId: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      clientRole: user.role,
    });

    const res = NextResponse.json({ success: true, redirect: "/portal" });
    res.cookies.set(CLIENT_SESSION_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    // A browser can only be one identity at a time. Clear any agency session so
    // the client session is the active one (otherwise agency view would shadow it).
    res.cookies.set("auth", "", { path: "/", maxAge: 0 });
    res.cookies.set("user_session", "", { path: "/", maxAge: 0 });
    return res;
  } catch (err) {
    console.error("Client login error:", err);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
