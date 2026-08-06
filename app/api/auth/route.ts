import { NextRequest, NextResponse } from "next/server";
import { getDb, hashPassword } from "@/lib/db";

// Agency login. Credentials live in the `users` table (role 'agency'), not in
// this file. Set or change them with:  npx tsx scripts/set-agency-login.ts
export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ success: false, error: "Email and password required" }, { status: 400 });
  }

  const db = getDb();
  const user = await db
    .prepare("SELECT * FROM users WHERE lower(email) = lower(?) AND role = 'agency'")
    .get(String(email).trim()) as { id: number; email: string; password_hash: string } | undefined;

  if (!user || user.password_hash !== hashPassword(password)) {
    return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 });
  }

  const cookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  };

  const res = NextResponse.json({ success: true });
  res.cookies.set("auth", "gorlin_authenticated", cookie);
  // Carries the signed-in email for /api/auth/me. Authorization itself still
  // comes from the `auth` cookie above, which middleware and API routes check.
  res.cookies.set(
    "user_session",
    Buffer.from(JSON.stringify({ role: "agency", clientId: null, email: user.email })).toString("base64"),
    cookie
  );
  // Clear any leftover client portal session so it cannot shadow agency access.
  res.cookies.set("client_session", "", { path: "/", maxAge: 0 });
  return res;
}
