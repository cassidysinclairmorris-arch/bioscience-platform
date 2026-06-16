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
  const posts = db.prepare(query).all(...params);
  return NextResponse.json({ posts });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const { company_id, company_name, post_type, scheduled_day, content, status, week_number, image_url, image_canvas_json } = await req.json();
  const result = db.prepare(
    `INSERT INTO posts (company_id, company_name, post_type, scheduled_day, content, status, week_number, image_url, image_canvas_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(company_id, company_name, post_type, scheduled_day, content, status || "draft", week_number || null, image_url || null, image_canvas_json || null);
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json({ post });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const { id, status, content, notes, image_url, image_canvas_json, scheduled_at, linkedin_post_id } = await req.json();

  if (content !== undefined) {
    db.prepare("UPDATE posts SET content = ?, updated_at = datetime('now') WHERE id = ?").run(content, id);
  }
  if (status !== undefined) {
    if (status === "pending_approval") {
      db.prepare("UPDATE posts SET status = ?, notes = NULL, updated_at = datetime('now') WHERE id = ?").run(status, id);
    } else if (status === "approved") {
      db.prepare("UPDATE posts SET status = ?, approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(status, id);
    } else if (status === "posted") {
      db.prepare("UPDATE posts SET status = ?, posted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(status, id);
    } else {
      db.prepare("UPDATE posts SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    }
  }
  if (notes !== undefined) {
    db.prepare("UPDATE posts SET notes = ?, updated_at = datetime('now') WHERE id = ?").run(notes, id);
  }
  if (image_url !== undefined) {
    db.prepare("UPDATE posts SET image_url = ?, updated_at = datetime('now') WHERE id = ?").run(image_url, id);
  }
  if (image_canvas_json !== undefined) {
    db.prepare("UPDATE posts SET image_canvas_json = ?, updated_at = datetime('now') WHERE id = ?").run(image_canvas_json, id);
  }
  if (scheduled_at !== undefined) {
    db.prepare("UPDATE posts SET scheduled_at = ?, status = 'scheduled', updated_at = datetime('now') WHERE id = ?").run(scheduled_at || null, id);
  }
  if (linkedin_post_id !== undefined) {
    db.prepare("UPDATE posts SET linkedin_post_id = ?, updated_at = datetime('now') WHERE id = ?").run(linkedin_post_id, id);
  }

  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(id);
  return NextResponse.json({ post });
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  db.prepare("DELETE FROM posts WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
