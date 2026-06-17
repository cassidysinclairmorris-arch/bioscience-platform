import { NextResponse } from "next/server";
import { CLIENT_SESSION_COOKIE } from "@/lib/client-session";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(CLIENT_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
