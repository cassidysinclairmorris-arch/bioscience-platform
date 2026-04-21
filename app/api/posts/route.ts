import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("company_id");
  let query = "SELECT * FROM posts WHERE 1=1";
  const params: (string | number)[] = [];
  if (companyId) { query += " AND company_id = ?"; params.push(companyId); }
  query += " ORDER BY created_at DESC";
  const posts = db.prepare(query).all(...params);
  return NextResponse.json({ posts });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const { company_id, company_name, post_type, scheduled_day, content, status, week_number } = await req.json();
  const result = db.prepare(
    `INSERT INTO posts (company_id, company_name, post_type, scheduled_day, content, status, week_number) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(company_id, company_name, post_type, scheduled_day, content, status || "draft", week_number || null);
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json({ post });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const { id, status, content } = await req.json();
  if (content !== undefined) db.prepare("UPDATE posts SET content = ?, updated_at = datetime('now') WHERE id = ?").run(content, id);
  if (status !== undefined) db.prepare("UPDATE posts SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
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
