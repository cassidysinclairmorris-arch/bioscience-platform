import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const status = searchParams.get("status");

  let query = "SELECT * FROM reports WHERE 1=1";
  const params: (string | number)[] = [];
  if (clientId) { query += " AND client_id = ?"; params.push(clientId); }
  if (status) { query += " AND status = ?"; params.push(status); }
  query += " ORDER BY period_start DESC";

  const reports = db.prepare(query).all(...params);
  return NextResponse.json({ reports });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const { client_id, type, period_start, period_end } = await req.json();
  if (!client_id || !period_start || !period_end) {
    return NextResponse.json({ error: "client_id, period_start, period_end required" }, { status: 400 });
  }
  const result = db.prepare(
    `INSERT INTO reports (client_id, type, period_start, period_end, status)
     VALUES (?, ?, ?, ?, 'draft')`
  ).run(client_id, type ?? "monthly", period_start, period_end);
  const report = db.prepare("SELECT * FROM reports WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json({ report });
}
