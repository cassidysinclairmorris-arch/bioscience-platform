import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";

// Brand Center's five long-form guidance fields. They live on the existing
// brand_kits row rather than a new table, so the generation routes that already
// read brand_kits pick them up without another join.
const FIELDS = [
  "voice_guide",
  "post_guidelines",
  "target_audiences",
  "competitor_analysis",
  "messaging_priorities",
] as const;

// Agency only. These fields hold competitor positioning and internal messaging
// judgements, so a portal session must never be able to read them, for its own
// company or any other.
export async function GET(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  const db = getDb();
  const { clientId } = await params;

  const row = await db
    .prepare(`SELECT ${FIELDS.join(", ")} FROM brand_kits WHERE client_id = ?`)
    .get(clientId) as Record<string, string | null> | undefined;

  // A client with no brand_kits row yet reads back as empty rather than 404,
  // so the tab renders and the first save creates the row.
  const brandKit = Object.fromEntries(FIELDS.map(f => [f, row?.[f] ?? ""]));
  return NextResponse.json({ brandKit });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  const db = getDb();
  const { clientId } = await params;
  const body = await req.json() as Record<string, unknown>;

  const client = await db.prepare("SELECT id FROM clients WHERE id = ?").get(clientId);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // Only the fields actually sent are written, so saving one section never
  // blanks the other four.
  const updates = FIELDS.filter(f => body[f] !== undefined);
  if (!updates.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const existing = await db.prepare("SELECT id FROM brand_kits WHERE client_id = ?").get(clientId);
  if (!existing) {
    await db.prepare("INSERT INTO brand_kits (client_id) VALUES (?)").run(clientId);
  }

  await db
    .prepare(`UPDATE brand_kits SET ${updates.map(f => `${f} = ?`).join(", ")}, updated_at = datetime('now') WHERE client_id = ?`)
    .run(...updates.map(f => (body[f] === null ? null : String(body[f]))), clientId);

  const row = await db
    .prepare(`SELECT ${FIELDS.join(", ")} FROM brand_kits WHERE client_id = ?`)
    .get(clientId) as Record<string, string | null>;

  return NextResponse.json({ brandKit: Object.fromEntries(FIELDS.map(f => [f, row?.[f] ?? ""])) });
}
