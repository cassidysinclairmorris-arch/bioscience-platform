import { NextRequest, NextResponse } from "next/server";
import { getDb, hashPassword } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as {
      id: number; email: string; password_hash: string; role: string; client_id: string | null;
    } | undefined;

    if (!user || user.password_hash !== hashPassword(password)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const sessionData = Buffer.from(JSON.stringify({
      role: user.role,
      clientId: user.client_id,
      email: user.email,
    })).toString("base64");

    const res = NextResponse.json({ success: true, role: user.role, clientId: user.client_id });
    res.cookies.set("user_session", sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return res;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
