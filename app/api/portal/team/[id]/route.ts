import { NextRequest, NextResponse } from "next/server";
import { getDb, ROLE_LIMITS, type ClientRole, type ClientUser } from "@/lib/db";
import { getClientSession } from "@/lib/client-session";
import { sendRoleChangeEmail } from "@/lib/client-email";

// PATCH: change a team member's role or deactivate them, scoped to the
// requester's company with server-side role enforcement.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = getClientSession(req);
  if (!s) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (s.clientRole === "user") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  try {
    const db = getDb();
    const target = await db
      .prepare("SELECT * FROM client_users WHERE id = ? AND company_id = ?")
      .get(Number(id), s.clientId) as ClientUser | undefined;
    if (!target) return NextResponse.json({ error: "Not found." }, { status: 404 });

    // No one manages the owner from the portal.
    if (target.role === "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Administrators may only act on users.
    if (s.clientRole === "administrator" && target.role !== "user") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Deactivate / remove.
    if (body.active === false) {
      await db.prepare("UPDATE client_users SET active = 0 WHERE id = ?").run(target.id);
      return NextResponse.json({ success: true });
    }

    // Role change.
    if (body.role) {
      const role = String(body.role) as ClientRole;
      if (role === "owner") {
        return NextResponse.json({ error: "You cannot promote anyone to owner." }, { status: 403 });
      }
      if (role !== "administrator" && role !== "user") {
        return NextResponse.json({ error: "Invalid role." }, { status: 400 });
      }
      // Administrators may only promote a user to administrator.
      if (s.clientRole === "administrator" && role !== "administrator") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (role !== target.role) {
        const count = (await db
          .prepare("SELECT COUNT(*) AS n FROM client_users WHERE company_id = ? AND role = ? AND active = 1 AND id != ?")
          .get(s.clientId, role, target.id) as { n: number }).n;
        if (count >= ROLE_LIMITS[role]) {
          return NextResponse.json(
            { error: `Your team already has the maximum number of ${role} accounts (${ROLE_LIMITS[role]}).` },
            { status: 400 }
          );
        }
        await db.prepare("UPDATE client_users SET role = ? WHERE id = ?").run(role, target.id);

        const company = await db.prepare("SELECT name FROM clients WHERE id = ?").get(s.clientId) as
          | { name: string }
          | undefined;
        try {
          await sendRoleChangeEmail({
            to: target.email,
            firstName: target.first_name,
            companyName: company?.name || "",
            newRole: role,
            baseUrl: req.nextUrl.origin,
          });
        } catch (e) {
          console.error("Role change email failed:", e);
        }
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  } catch (err) {
    console.error("Team update error:", err);
    return NextResponse.json({ error: "Could not update team member." }, { status: 500 });
  }
}
