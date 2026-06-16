import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@/lib/db";
import type { Report } from "@/lib/db";

export const maxDuration = 60;

const aiClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function agencyPrompt(data: Record<string, unknown>, type: string): string {
  const wordCount = type === "weekly" ? "80–100 words" : "300–400 words";
  return `You are an analytics strategist writing an internal agency report for a LinkedIn content team.
Based on this data: ${JSON.stringify(data)}

Write an analytical narrative (${wordCount}) covering:
- Overall performance trends and key wins
- Engagement quality analysis
- 2–3 specific strategic recommendations for the next period
- Any notable patterns in post timing or content type

Write in clear, professional prose. No bullet points. No headers. Just flowing paragraphs.
Output ONLY the narrative text, nothing else.`;
}

function clientPrompt(data: Record<string, unknown>, clientName: string, type: string): string {
  const wordCount = type === "weekly" ? "60–75 words" : "150–200 words";
  return `You are writing a warm, plain-English performance summary for ${clientName}, a business owner reviewing their LinkedIn results.
Based on this data: ${JSON.stringify(data)}

Write a client-facing summary (${wordCount}) covering:
- What went well this ${type === "weekly" ? "week" : "month"} in plain language
- Which content resonated most with their audience
- 2 clear focus areas for the next period (no jargon)

Be encouraging, specific, and accessible. No technical metrics dump. Write in flowing prose.
Output ONLY the narrative text, nothing else.`;
}

export async function POST(req: NextRequest) {
  const db = getDb();
  try {
    const { reportId, force } = await req.json();
    if (!reportId) return NextResponse.json({ error: "reportId required" }, { status: 400 });

    const report = db.prepare("SELECT * FROM reports WHERE id = ?").get(reportId) as Report | null;
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    if (!report.extracted_data) return NextResponse.json({ error: "No extracted data" }, { status: 422 });

    // Skip if narratives already exist unless force=true
    if (!force && report.narrative_agency && report.narrative_client) {
      return NextResponse.json({ narrative_agency: report.narrative_agency, narrative_client: report.narrative_client });
    }

    const data = JSON.parse(report.extracted_data);
    const clientRow = db.prepare("SELECT name FROM clients WHERE id = ?").get(report.client_id) as { name: string } | null;
    const clientName = clientRow?.name ?? "your company";

    const [agencyRes, clientRes] = await Promise.all([
      aiClient.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: agencyPrompt(data, report.type) }],
      }),
      aiClient.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        messages: [{ role: "user", content: clientPrompt(data, clientName, report.type) }],
      }),
    ]);

    const narrativeAgency = agencyRes.content.find(c => c.type === "text")?.text?.trim() ?? "";
    const narrativeClient = clientRes.content.find(c => c.type === "text")?.text?.trim() ?? "";

    db.prepare(
      `UPDATE reports SET narrative_agency = ?, narrative_client = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(narrativeAgency, narrativeClient, reportId);

    return NextResponse.json({ narrative_agency: narrativeAgency, narrative_client: narrativeClient });
  } catch (error) {
    console.error("[generate-narrative] error:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
