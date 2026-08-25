import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { getDb } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";
import { blobPrefix, EXAMPLE_TYPES, isBlobUrl, MAX_BYTES, safeFileName } from "@/lib/brand-files";

export const runtime = "nodejs";

// Screenshots of posts that performed well, with the agency's notes on why.
// Agency only, at every method: these carry internal judgements about a client's
// content and must never be readable from a portal session.
export async function GET(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  const db = getDb();
  const { clientId } = await params;
  const examples = await db
    .prepare("SELECT * FROM brand_post_examples WHERE client_id = ? ORDER BY created_at DESC, id DESC LIMIT 12")
    .all(clientId);
  return NextResponse.json({ examples });
}

// Create the row after the browser has uploaded the image to Blob via
// POST /api/clients/:clientId/brand-upload.
export async function POST(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  const db = getDb();
  const { clientId } = await params;

  try {
    const body = await req.json() as Record<string, unknown>;
    const fileUrl = String(body.file_url || "").trim();
    const fileName = safeFileName(String(body.file_name || ""), "example");
    const fileType = String(body.file_type || "");
    const fileSize = Number(body.file_size) || 0;

    if (!isBlobUrl(fileUrl)) {
      return NextResponse.json({ error: "Invalid file URL." }, { status: 400 });
    }
    // The upload token already limited the folder, the type, and the size. This
    // repeats the checks on the metadata so a hand-made request cannot point a
    // row at another client's file or misreport what it is.
    if (!new URL(fileUrl).pathname.includes(blobPrefix("examples", clientId))) {
      return NextResponse.json({ error: "That file belongs to another client." }, { status: 400 });
    }
    if (!(EXAMPLE_TYPES as readonly string[]).includes(fileType)) {
      return NextResponse.json({ error: `Unsupported image type (${fileType || "unknown"}).` }, { status: 400 });
    }
    if (fileSize > MAX_BYTES.examples) {
      return NextResponse.json({ error: "Image too large (max 10MB)." }, { status: 400 });
    }

    const client = await db.prepare("SELECT id FROM clients WHERE id = ?").get(clientId);
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const info = await db.prepare(
      `INSERT INTO brand_post_examples (client_id, file_url, file_name, post_text, pillar, engagement_notes, posted_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      clientId, fileUrl, String(body.file_name || fileName),
      (body.post_text as string) || null,
      (body.pillar as string) || null,
      (body.engagement_notes as string) || null,
      (body.posted_date as string) || null,
    );

    const example = await db.prepare("SELECT * FROM brand_post_examples WHERE id = ?").get(info.lastInsertRowid);
    return NextResponse.json({ example });
  } catch (err) {
    console.error("Brand post example save failed:", err);
    return NextResponse.json({ error: "Could not save the example." }, { status: 500 });
  }
}

// PATCH: attach or edit the notes on an existing example.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  const db = getDb();
  const { clientId } = await params;
  const { id, post_text, pillar, engagement_notes, posted_date } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.prepare(
    `UPDATE brand_post_examples SET post_text = ?, pillar = ?, engagement_notes = ?, posted_date = ?
      WHERE id = ? AND client_id = ?`
  ).run(post_text || null, pillar || null, engagement_notes || null, posted_date || null, id, clientId);

  const example = await db.prepare("SELECT * FROM brand_post_examples WHERE id = ? AND client_id = ?").get(id, clientId);
  if (!example) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ example });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  const db = getDb();
  const { clientId } = await params;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const row = await db
    .prepare("SELECT file_url FROM brand_post_examples WHERE id = ? AND client_id = ?")
    .get(id, clientId) as { file_url: string } | undefined;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.prepare("DELETE FROM brand_post_examples WHERE id = ? AND client_id = ?").run(id, clientId);
  // Blob removal is best effort: the row is gone either way.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try { await del(row.file_url); } catch { /* already gone */ }
  }
  return NextResponse.json({ deleted: true });
}
