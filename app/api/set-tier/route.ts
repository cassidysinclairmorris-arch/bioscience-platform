import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";
import { TIERS, type Tier } from "@/lib/tiers";

const TIER_KEYS = TIERS.map(t => t.key) as string[];

// Change a client's service tier (agency only). This is the same `tier` field the
// reporting section reads, so upgrading/downgrading here unlocks or locks the
// Linkwright Signal metrics accordingly.
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const clientId = String(body.clientId || "").trim();
    const tier = String(body.tier || "").trim() as Tier;
    if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });
    if (!TIER_KEYS.includes(tier)) return NextResponse.json({ error: "Invalid tier." }, { status: 400 });

    const db = getDb();
    const client = await db.prepare("SELECT id FROM clients WHERE id = ?").get(clientId);
    if (!client) return NextResponse.json({ error: "That company does not exist." }, { status: 404 });

    await db.prepare("UPDATE clients SET tier = ? WHERE id = ?").run(tier, clientId);
    return NextResponse.json({ success: true, clientId, tier });
  } catch (err) {
    console.error("Set tier error:", err);
    return NextResponse.json({ error: "Could not update tier." }, { status: 500 });
  }
}
