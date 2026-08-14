import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { wallClockToUtc, toIanaZone } from "@/lib/schedule";

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

// The real instant a wall-clock schedule refers to, or null when no usable
// timezone was supplied (older rows keep the naive value only).
function utcFor(wall: string | null | undefined, tz: string | null | undefined): string | null {
  if (!wall) return null;
  const zone = toIanaZone(tz);
  if (!zone) return null;
  return wallClockToUtc(wall, zone)?.toISOString() ?? null;
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
  const { company_id, company_name, post_type, pillar_id, scheduled_day, content, status, week_number, image_url, image_canvas_json, scheduled_at, timezone, assets } = await req.json();

  // A post records both the pillar record it belongs to and the pillar name as
  // it read at the time. The id is what survives a later rename.
  let pillarId: number | null = pillar_id ? Number(pillar_id) : null;
  let pillarName: string = post_type;
  if (pillarId) {
    const p = await db.prepare("SELECT type FROM pillars WHERE id = ?").get(pillarId) as { type: string } | undefined;
    if (p) pillarName = p.type;
  } else if (post_type && company_id) {
    const p = await db.prepare("SELECT id FROM pillars WHERE client_id = ? AND type = ? LIMIT 1").get(company_id, post_type) as { id: number } | undefined;
    if (p) pillarId = p.id;
  }

  const result = await db.prepare(
    `INSERT INTO posts (company_id, company_name, post_type, pillar_id, scheduled_day, content, status, week_number, image_url, image_canvas_json, scheduled_at, timezone, scheduled_at_utc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(company_id, company_name, pillarName, pillarId, scheduled_day, content, status || "draft", week_number || null, image_url || null, image_canvas_json || null, scheduled_at || null, timezone || null, utcFor(scheduled_at, timezone));
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
  const { id, status, content, notes, image_url, image_canvas_json, scheduled_at, timezone, pillar_id, linkedin_post_id } = await req.json();

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
  // The creative lives in two places: posts.image_url (the cover) and post_assets
  // (the ordered visuals the portal renders). The portal prefers post_assets, so
  // both have to move together or the client keeps seeing the old image.
  if (image_url !== undefined) {
    await db.prepare("UPDATE posts SET image_url = ?, updated_at = datetime('now') WHERE id = ?").run(image_url, id);

    if (!image_url) {
      // Removing the creative clears the visuals entirely.
      await db.prepare("DELETE FROM post_assets WHERE post_id = ?").run(id);
    } else {
      const cover = await db
        .prepare("SELECT id FROM post_assets WHERE post_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1")
        .get(id) as { id: number } | undefined;
      if (cover) {
        // Replace the cover in place; any further carousel slides are untouched.
        await db.prepare("UPDATE post_assets SET url = ?, canvas_json = NULL WHERE id = ?").run(image_url, cover.id);
      } else {
        await db.prepare("INSERT INTO post_assets (post_id, sort_order, kind, source, url) VALUES (?, 0, 'image', 'uploaded', ?)").run(id, image_url);
      }
    }
  }
  if (image_canvas_json !== undefined) {
    await db.prepare("UPDATE posts SET image_canvas_json = ?, updated_at = datetime('now') WHERE id = ?").run(image_canvas_json, id);
  }
  // Wall clock and timezone are two halves of one value, so whichever arrives,
  // the stored UTC instant is recomputed from the pair that ends up on the row.
  if (scheduled_at !== undefined || timezone !== undefined) {
    const current = await db.prepare("SELECT status, scheduled_at, timezone FROM posts WHERE id = ?").get(id) as
      { status: string; scheduled_at: string | null; timezone: string | null } | undefined;

    const nextWall = scheduled_at !== undefined ? (scheduled_at || null) : (current?.scheduled_at ?? null);
    const nextZone = timezone !== undefined ? (timezone || null) : (current?.timezone ?? null);
    const nextUtc = utcFor(nextWall, nextZone);

    // A date can be set at any stage so both calendars place the post correctly.
    // Only an approved (or already scheduled) post flips to 'scheduled' — a draft
    // or one awaiting client approval keeps its status and just carries the date.
    const becomesScheduled = nextWall && (current?.status === "approved" || current?.status === "scheduled");
    if (becomesScheduled) {
      await db.prepare("UPDATE posts SET scheduled_at = ?, timezone = ?, scheduled_at_utc = ?, status = 'scheduled', updated_at = datetime('now') WHERE id = ?")
        .run(nextWall, nextZone, nextUtc, id);
    } else {
      await db.prepare("UPDATE posts SET scheduled_at = ?, timezone = ?, scheduled_at_utc = ?, updated_at = datetime('now') WHERE id = ?")
        .run(nextWall, nextZone, nextUtc, id);
    }
  }
  // Moving a post to a different pillar keeps the stored name in step with it.
  if (pillar_id !== undefined) {
    const p = pillar_id
      ? await db.prepare("SELECT type FROM pillars WHERE id = ?").get(Number(pillar_id)) as { type: string } | undefined
      : undefined;
    await db.prepare("UPDATE posts SET pillar_id = ?, post_type = COALESCE(?, post_type), updated_at = datetime('now') WHERE id = ?")
      .run(pillar_id ? Number(pillar_id) : null, p?.type ?? null, id);
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
