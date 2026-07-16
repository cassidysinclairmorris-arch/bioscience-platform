import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { getDb, type Asset } from "@/lib/db";
import { getAssetRequester, canManageAssets } from "@/lib/asset-access";

// Load the asset and confirm the requester may manage it. Portal clients can
// only touch assets belonging to their own company.
async function loadManageable(req: NextRequest, id: string) {
  const requester = getAssetRequester(req);
  if (!requester || !canManageAssets(requester)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const db = getDb();
  const asset = (await db.prepare("SELECT * FROM assets WHERE id = ?").get(Number(id))) as Asset | undefined;
  if (!asset) {
    return { error: NextResponse.json({ error: "Asset not found." }, { status: 404 }) };
  }
  if (requester.kind === "client" && asset.client_id !== requester.session.clientId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { db, asset };
}

// Edit notes or the pillar tag (owner/administrator or agency).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, db, asset } = await loadManageable(req, id);
  if (error) return error;

  try {
    const body = await req.json();
    if (body.notes !== undefined) {
      const notes = body.notes ? String(body.notes).trim() : null;
      await db!.prepare("UPDATE assets SET notes = ?, updated_at = datetime('now') WHERE id = ?").run(notes, asset!.id);
    }
    if (body.pillar_id !== undefined) {
      const pillarId = body.pillar_id != null && body.pillar_id !== "" ? Number(body.pillar_id) : null;
      await db!.prepare("UPDATE assets SET pillar_id = ?, updated_at = datetime('now') WHERE id = ?").run(pillarId, asset!.id);
    }
    const updated = await db!.prepare("SELECT * FROM assets WHERE id = ?").get(asset!.id);
    return NextResponse.json({ asset: updated });
  } catch (err) {
    console.error("Update asset error:", err);
    return NextResponse.json({ error: "Could not update asset." }, { status: 500 });
  }
}

// Delete the asset row and its underlying Blob file (owner/administrator or agency).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, db, asset } = await loadManageable(req, id);
  if (error) return error;

  try {
    // Remove the stored file first; ignore Blob errors so a missing file never
    // blocks clearing the DB row.
    if (process.env.BLOB_READ_WRITE_TOKEN && asset!.file_url) {
      try { await del(asset!.file_url); } catch (e) { console.error("Blob delete failed:", e); }
    }
    await db!.prepare("DELETE FROM assets WHERE id = ?").run(asset!.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete asset error:", err);
    return NextResponse.json({ error: "Could not delete asset." }, { status: 500 });
  }
}
