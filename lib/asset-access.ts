import type { NextRequest } from "next/server";
import { isAdminRequest } from "./admin-auth";
import { getClientSession, type ClientSession } from "./client-session";

// Who is making an asset request: the agency (studio, full access across all
// clients) or a signed-in portal client user (scoped to their own company).
export type AssetRequester =
  | { kind: "agency" }
  | { kind: "client"; session: ClientSession };

export function getAssetRequester(req: NextRequest): AssetRequester | null {
  if (isAdminRequest(req)) return { kind: "agency" };
  const session = getClientSession(req);
  if (session) return { kind: "client", session };
  return null;
}

// Upload, edit, and delete permission. The agency can always manage; a portal
// user can only manage when they are an owner or administrator. Regular users
// get view/download only, enforced here on the server, not just hidden in the UI.
export function canManageAssets(r: AssetRequester): boolean {
  return (
    r.kind === "agency" ||
    r.session.clientRole === "owner" ||
    r.session.clientRole === "administrator"
  );
}

// The company an asset request is scoped to. Portal clients are always locked to
// their own company id; the agency may target any company via the requested id.
export function scopedClientId(
  r: AssetRequester,
  requestedClientId: string | null
): string | null {
  return r.kind === "client" ? r.session.clientId : requestedClientId;
}
