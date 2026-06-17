import { randomBytes } from "crypto";
import type { NextRequest } from "next/server";
import type { ClientRole } from "./db";

// The client portal session. Mirrors the existing base64-encoded JSON cookie
// pattern used by `user_session`, so /api/auth/me and the portal can read it.
// `role: "client"` and `clientId` (the company id) keep it compatible with the
// existing portal scoping; `clientRole` carries the granular owner/admin/user.
export interface ClientSession {
  role: "client";
  clientId: string;
  clientUserId: number;
  email: string;
  firstName: string;
  lastName: string;
  clientRole: ClientRole;
}

export const CLIENT_SESSION_COOKIE = "client_session";

export function encodeClientSession(session: ClientSession): string {
  return Buffer.from(JSON.stringify(session)).toString("base64");
}

export function decodeClientSession(value: string | undefined): ClientSession | null {
  if (!value) return null;
  try {
    const data = JSON.parse(Buffer.from(value, "base64").toString("utf8"));
    if (data && data.role === "client" && data.clientId && data.clientUserId) {
      return data as ClientSession;
    }
  } catch {
    // invalid cookie
  }
  return null;
}

// Read the client session from a route handler request.
export function getClientSession(req: NextRequest): ClientSession | null {
  return decodeClientSession(req.cookies.get(CLIENT_SESSION_COOKIE)?.value);
}

// Generate a secure password reset token plus its 72 hour expiry timestamp.
export function makeResetToken(): { token: string; expires: string } {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 72 * 60 * 60 * 1000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);
  return { token, expires };
}
