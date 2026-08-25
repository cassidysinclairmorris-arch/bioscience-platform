import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { getDb } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";
import { blobPrefix, isBlobUrl, MATERIAL_TYPES, MAX_BYTES, safeFileName } from "@/lib/brand-files";

export const runtime = "nodejs";

// Reference documents for the agency's own use: decks, one-pagers, research.
// Not read by the generation routes. Agency only at every method, so a portal
// session cannot list a client's internal reference material.
export async function GET(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  const db = getDb();
  const { clientId } = await params;
  const materials = await db
    .prepare("SELECT * FROM brand_materials WHERE client_id = ? ORDER BY created_at DESC, id DESC")
    .all(clientId);
  return NextResponse.json({ materials });
}

// Create the row after the browser has uploaded the file to Blob via
// POST /api/clients/:clientId/brand-upload.
export async function POST(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  const db = getDb();
  const { clientId } = await params;

  try {
    const body = await req.json() as Record<string, unknown>;
    const fileUrl = String(body.file_url || "").trim();
    const fileName = safeFileName(String(body.file_name || ""), "material");
    const fileType = String(body.file_type || "");
    const fileSize = Number(body.file_size) || 0;

    if (!isBlobUrl(fileUrl)) {
      return NextResponse.json({ error: "Invalid file URL." }, { status: 400 });
    }
    // The upload token already limited the folder, the type, and the size. This
    // repeats the checks on the metadata so a hand-made request cannot point a
    // row at another client's file or misreport what it is.
    if (!new URL(fileUrl).pathname.includes(blobPrefix("materials", clientId))) {
      return NextResponse.json({ error: "That file belongs to another client." }, { status: 400 });
    }
    if (!(MATERIAL_TYPES as readonly string[]).includes(fileType)) {
      return NextResponse.json({ error: `Unsupported file type (${fileType || "unknown"}).` }, { status: 400 });
    }
    if (fileSize > MAX_BYTES.materials) {
      return NextResponse.json({ error: "File too large (max 25MB)." }, { status: 400 });
    }

    const client = await db.prepare("SELECT id FROM clients WHERE id = ?").get(clientId);
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const info = await db.prepare(
      "INSERT INTO brand_materials (client_id, file_url, file_name, file_type, file_size) VALUES (?, ?, ?, ?, ?)"
    ).run(clientId, fileUrl, String(body.file_name || fileName), fileType, fileSize);

    const material = await db.prepare("SELECT * FROM brand_materials WHERE id = ?").get(info.lastInsertRowid);
    return NextResponse.json({ material });
  } catch (err) {
    console.error("Brand material save failed:", err);
    return NextResponse.json({ error: "Could not save the file." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  const db = getDb();
  const { clientId } = await params;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const row = await db
    .prepare("SELECT file_url FROM brand_materials WHERE id = ? AND client_id = ?")
    .get(id, clientId) as { file_url: string } | undefined;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.prepare("DELETE FROM brand_materials WHERE id = ? AND client_id = ?").run(id, clientId);
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try { await del(row.file_url); } catch { /* already gone */ }
  }
  return NextResponse.json({ deleted: true });
}
