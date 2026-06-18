import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("company_id");
  const status = searchParams.get("status");
  let query = "SELECT * FROM posts WHERE 1=1";
  const params: (string | number)[] = [];
  if (companyId) { query += " AND company_id = ?"; params.push(companyId); }
  if (status) { query += " AND status = ?"; params.push(status); }
  query += " ORDER BY created_at DESC";
  const posts = (await db.prepare(query).all(...params)) as Record<string, unknown>[];

  // Attach the ordered visual assets to each post (carousel support). Posts with
  // no post_assets rows keep rendering via their legacy image_url.
  if (posts.length) {
    const ids = posts.map((p) => p.id as number);
    const placeholders = ids.map(() => "?").join(",");
    const assets = (await db
      .prepare(`SELECT * FROM post_assets WHERE post_id IN (${placeholders}) ORDER BY sort_order ASC, id ASC`)
      .all(...ids)) as Record<string, unknown>[];
    const byPost: Record<number, Record<string, unknown>[]> = {};
    for (const a of assets) {
      const pid = a.post_id as number;
      (byPost[pid] ||= []).push(a);
    }
    for (const p of posts) p.assets = byPost[p.id as number] || [];
  }

  return NextResponse.json({ posts });
}

type IncomingAsset = {
  url: string;
  kind?: string;
  source?: string;
  canvas_json?: string | null;
  mime?: string | null;
  asset_title?: string | null;
};

export async function POST(req: NextRequest) {
  const db = getDb();
  const { company_id, company_name, post_type, scheduled_day, content, status, week_number, image_url, image_canvas_json, assets } = await req.json();
  const result = await db.prepare(
    `INSERT INTO posts (company_id, company_name, post_type, scheduled_day, content, status, week_number, image_url, image_canvas_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(company_id, company_name, post_type, scheduled_day, content, status || "draft", week_number || null, image_url || null, image_canvas_json || null);
  const postId = result.lastInsertRowid;

  // Optional bundled visual assets (carousel). First asset becomes the cover.
  if (Array.isArray(assets) && assets.length) {
    let order = 0;
    for (const a of (assets as IncomingAsset[]).slice(0, 10)) {
      if (!a.url) continue;
      await db.prepare(
        `INSERT INTO post_assets (post_id, sort_order, kind, source, url, canvas_json, mime, asset_title) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(postId, order++, a.kind || "image", a.source || "uploaded", a.url, a.canvas_json ?? null, a.mime ?? null, a.asset_title ?? null);
    }
    const cover = (await db.prepare("SELECT url FROM post_assets WHERE post_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1").get(postId)) as { url: string } | undefined;
    if (cover?.url) await db.prepare("UPDATE posts SET image_url = ? WHERE id = ?").run(cover.url, postId);
  }

  const post = await db.prepare("SELECT * FROM posts WHERE id = ?").get(postId);
  return NextResponse.json({ post });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const { id, status, content, notes, image_url, image_canvas_json, scheduled_at, linkedin_post_id } = await req.json();

  if (content !== undefined) {
    await db.prepare("UPDATE posts SET content = ?, updated_at = datetime('now') WHERE id = ?").run(content, id);
  }
  if (status !== undefined) {
    if (status === "pending_approval") {
      await db.prepare("UPDATE posts SET status = ?, notes = NULL, updated_at = datetime('now') WHERE id = ?").run(status, id);
    } else if (status === "approved") {
      await db.prepare("UPDATE posts SET status = ?, approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(status, id);
    } else if (status === "posted") {
      await db.prepare("UPDATE posts SET status = ?, posted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(status, id);
    } else {
      await db.prepare("UPDATE posts SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    }
  }
  if (notes !== undefined) {
    await db.prepare("UPDATE posts SET notes = ?, updated_at = datetime('now') WHERE id = ?").run(notes, id);
  }
  if (image_url !== undefined) {
    await db.prepare("UPDATE posts SET image_url = ?, updated_at = datetime('now') WHERE id = ?").run(image_url, id);
  }
  if (image_canvas_json !== undefined) {
    await db.prepare("UPDATE posts SET image_canvas_json = ?, updated_at = datetime('now') WHERE id = ?").run(image_canvas_json, id);
  }
  if (scheduled_at !== undefined) {
    await db.prepare("UPDATE posts SET scheduled_at = ?, status = 'scheduled', updated_at = datetime('now') WHERE id = ?").run(scheduled_at || null, id);
  }
  if (linkedin_post_id !== undefined) {
    await db.prepare("UPDATE posts SET linkedin_post_id = ?, updated_at = datetime('now') WHERE id = ?").run(linkedin_post_id, id);
  }

  const post = await db.prepare("SELECT * FROM posts WHERE id = ?").get(id);
  return NextResponse.json({ post });
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await db.prepare("DELETE FROM posts WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
