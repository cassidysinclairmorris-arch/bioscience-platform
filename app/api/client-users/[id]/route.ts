import { NextRequest, NextResponse } from "next/server";
import { getDb, ROLE_LIMITS, type ClientRole, type ClientUser } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";
import { sendRoleChangeEmail } from "@/lib/client-email";

const ROLES: ClientRole[] = ["owner", "administrator", "user"];

// Update a client user (admin only): toggle active, or change role (sends Email 4).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  try {
    const body = await req.json();
    const db = getDb();
    const user = await db.prepare("SELECT * FROM client_users WHERE id = ?").get(Number(id)) as ClientUser | undefined;
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    // Activate / deactivate.
    if (typeof body.active === "boolean") {
      await db.prepare("UPDATE client_users SET active = ? WHERE id = ?").run(body.active ? 1 : 0, user.id);
      return NextResponse.json({ success: true });
    }

    // Role change.
    if (body.role) {
      const role = String(body.role) as ClientRole;
      if (!ROLES.includes(role)) {
        return NextResponse.json({ error: "Invalid role." }, { status: 400 });
      }
      if (role !== user.role) {
        const count = (await db
          .prepare("SELECT COUNT(*) AS n FROM client_users WHERE company_id = ? AND role = ? AND active = 1 AND id != ?")
          .get(user.company_id, role, user.id) as { n: number }).n;
        if (count >= ROLE_LIMITS[role]) {
          return NextResponse.json(
            { error: `This company already has the maximum number of ${role} accounts (${ROLE_LIMITS[role]}).` },
            { status: 400 }
          );
        }
        await db.prepare("UPDATE client_users SET role = ? WHERE id = ?").run(role, user.id);

        const company = await db.prepare("SELECT name FROM clients WHERE id = ?").get(user.company_id || "") as
          | { name: string }
          | undefined;
        try {
          await sendRoleChangeEmail({
            to: user.email,
            firstName: user.first_name,
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
    console.error("Update client user error:", err);
    return NextResponse.json({ error: "Could not update user." }, { status: 500 });
  }
}

// Permanently delete a client user (admin only). Only allowed once the account
// is deactivated. Deleting frees their email so it can be invited again.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  try {
    const db = getDb();
    const user = await db.prepare("SELECT * FROM client_users WHERE id = ?").get(Number(id)) as ClientUser | undefined;
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (user.active) {
      return NextResponse.json({ error: "Deactivate the account before deleting it." }, { status: 400 });
    }

    await db.prepare("DELETE FROM messages WHERE client_user_id = ?").run(user.id);
    await db.prepare("DELETE FROM client_users WHERE id = ?").run(user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete client user error:", err);
    return NextResponse.json({ error: "Could not delete user." }, { status: 500 });
  }
}
