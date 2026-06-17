import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import fs from "fs";
import path from "path";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const report = await db.prepare("SELECT * FROM reports WHERE id = ?").get(id);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ report });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const body = await req.json();

  const fields: string[] = [];
  const values: unknown[] = [];

  if (body.status !== undefined) {
    fields.push("status = ?");
    values.push(body.status);
    if (body.status === "published") {
      fields.push("published_at = datetime('now')");
    }
  }
  if (body.extracted_data !== undefined) { fields.push("extracted_data = ?"); values.push(body.extracted_data); }
  if (body.narrative_agency !== undefined) { fields.push("narrative_agency = ?"); values.push(body.narrative_agency); }
  if (body.narrative_client !== undefined) { fields.push("narrative_client = ?"); values.push(body.narrative_client); }
  if (body.raw_pdf_url !== undefined) { fields.push("raw_pdf_url = ?"); values.push(body.raw_pdf_url); }

  if (fields.length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  fields.push("updated_at = datetime('now')");
  values.push(id);
  await db.prepare(`UPDATE reports SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  const report = await db.prepare("SELECT * FROM reports WHERE id = ?").get(id);
  return NextResponse.json({ report });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const report = await db.prepare("SELECT * FROM reports WHERE id = ?").get(id) as { raw_pdf_url?: string } | null;
  if (report?.raw_pdf_url) {
    try {
      const filePath = path.join(process.cwd(), "public", report.raw_pdf_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch { /* ignore */ }
  }
  await db.prepare("DELETE FROM reports WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
