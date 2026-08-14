import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";
import { getClientSession } from "@/lib/client-session";

// Content pillars are per client and renameable. A post points at the pillar by
// id, so renaming here never detaches historical posts. Retiring a pillar sets
// active = 0 rather than deleting it, which keeps old posts readable.

// GET /api/pillars?clientId=xxx[&includeInactive=1]
// Agency may read any client; a portal user only their own company.
export async function GET(req: NextRequest) {
  const db = getDb();
  const admin = isAdminRequest(req);
  const session = getClientSession(req);
  if (!admin && !session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const requested = req.nextUrl.searchParams.get("clientId");
  const clientId = admin ? requested : session!.clientId;
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "1" && admin;
  const pillars = await db
    .prepare(
      `SELECT p.*, (SELECT COUNT(*) FROM posts WHERE pillar_id = p.id) AS post_count
         FROM pillars p
        WHERE p.client_id = ?${includeInactive ? "" : " AND COALESCE(p.active, 1) = 1"}
        ORDER BY p.sort_order ASC, p.id ASC`
    )
    .all(clientId);

  return NextResponse.json({ pillars });
}

// POST /api/pillars  { clientId, type, day?, color?, example? }
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  const db = getDb();
  const { clientId, type, day, color, example } = await req.json();

  if (!clientId || !String(type ?? "").trim()) {
    return NextResponse.json({ error: "clientId and type are required" }, { status: 400 });
  }

  const next = await db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM pillars WHERE client_id = ?")
    .get(clientId) as { n: number };

  await db
    .prepare(
      `INSERT INTO pillars (client_id, day, type, color, example, sort_order, active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    )
    .run(clientId, day || "", String(type).trim(), color || null, example || null, next.n);

  const pillar = await db.prepare("SELECT * FROM pillars WHERE id = last_insert_rowid()").get();
  return NextResponse.json({ pillar });
}

// PATCH /api/pillars  { id, type?, day?, color?, example?, active?, sort_order? }
// Renaming only changes the label. Posts keep pointing at this same record.
export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  const db = getDb();
  const { id, type, day, color, example, active, sort_order } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const fields: [string, unknown][] = [];
  if (type !== undefined) {
    if (!String(type).trim()) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    fields.push(["type", String(type).trim()]);
  }
  if (day !== undefined) fields.push(["day", day || ""]);
  if (color !== undefined) fields.push(["color", color || null]);
  if (example !== undefined) fields.push(["example", example || null]);
  if (active !== undefined) fields.push(["active", active ? 1 : 0]);
  if (sort_order !== undefined) fields.push(["sort_order", Number(sort_order)]);
  if (!fields.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  await db
    .prepare(`UPDATE pillars SET ${fields.map(([k]) => `${k} = ?`).join(", ")} WHERE id = ?`)
    .run(...fields.map(([, v]) => v as string | number | null), id);

  // Keep the denormalised name on posts in step so lists that read post_type
  // directly show the new label too. The pillar_id link is what actually binds.
  if (type !== undefined) {
    await db.prepare("UPDATE posts SET post_type = ? WHERE pillar_id = ?").run(String(type).trim(), id);
  }

  const pillar = await db.prepare("SELECT * FROM pillars WHERE id = ?").get(id);
  return NextResponse.json({ pillar });
}

// DELETE /api/pillars?id=123
// A pillar with posts is archived, never removed, so history stays intact.
// An unused pillar is deleted outright.
export async function DELETE(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  const db = getDb();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const used = await db.prepare("SELECT COUNT(*) AS n FROM posts WHERE pillar_id = ?").get(id) as { n: number };

  if (used.n > 0) {
    await db.prepare("UPDATE pillars SET active = 0 WHERE id = ?").run(id);
    return NextResponse.json({ archived: true, postCount: used.n });
  }

  await db.prepare("DELETE FROM pillars WHERE id = ?").run(id);
  return NextResponse.json({ deleted: true });
}
