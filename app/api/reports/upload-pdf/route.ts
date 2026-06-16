import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@/lib/db";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACTION_PROMPT = `You are extracting LinkedIn analytics data from a screenshot or export.
Return ONLY valid JSON matching this exact shape (use null for missing fields):
{
  "impressions": number|null,
  "reach": number|null,
  "engagementRate": number|null,
  "totalEngagements": number|null,
  "reactions": number|null,
  "comments": number|null,
  "shares": number|null,
  "clicks": number|null,
  "followerCount": number|null,
  "followerGrowth": number|null,
  "followerGrowthPercent": number|null,
  "posts": [
    {
      "date": "YYYY-MM-DD"|null,
      "content": string|null,
      "impressions": number|null,
      "engagementRate": number|null,
      "reactions": number|null,
      "comments": number|null,
      "shares": number|null,
      "clicks": number|null,
      "type": string|null
    }
  ],
  "topPost": {
    "date": "YYYY-MM-DD"|null,
    "content": string|null,
    "impressions": number|null,
    "engagementRate": number|null
  }|null,
  "periodStart": "YYYY-MM-DD"|null,
  "periodEnd": "YYYY-MM-DD"|null
}
Output ONLY the JSON object, no markdown fences, no explanation.`;

export async function POST(req: NextRequest) {
  const db = getDb();
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const clientId = formData.get("clientId") as string;
    const type = (formData.get("type") as string) || "monthly";
    const periodStart = formData.get("periodStart") as string;
    const periodEnd = formData.get("periodEnd") as string;

    if (!file || !clientId || !periodStart || !periodEnd) {
      return NextResponse.json({ error: "file, clientId, periodStart, periodEnd required" }, { status: 400 });
    }

    // Save PDF to public/files/
    const timestamp = Date.now();
    const fileName = `${clientId}_report_${timestamp}.pdf`;
    const filesDir = path.join(process.cwd(), "public", "files");
    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(filesDir, fileName), pdfBuffer);
    const rawPdfUrl = `/files/${fileName}`;

    // Create stub report first
    const insertResult = db.prepare(
      `INSERT INTO reports (client_id, type, period_start, period_end, status, raw_pdf_url)
       VALUES (?, ?, ?, ?, 'draft', ?)`
    ).run(clientId, type, periodStart, periodEnd, rawPdfUrl);
    const reportId = insertResult.lastInsertRowid as number;

    // Extract metrics via Claude
    const pdfBase64 = pdfBuffer.toString("base64");
    let extractedData: string | null = null;
    try {
      const extraction = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
            },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        }],
      });
      const raw = extraction.content.find(c => c.type === "text")?.text ?? "";
      // Strip any accidental markdown fences
      const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      JSON.parse(jsonStr); // validate
      extractedData = jsonStr;
    } catch (e) {
      console.error("[upload-pdf] extraction failed:", e);
    }

    if (extractedData) {
      db.prepare("UPDATE reports SET extracted_data = ?, updated_at = datetime('now') WHERE id = ?")
        .run(extractedData, reportId);
    }

    // Generate narratives asynchronously (fire-and-forget via internal fetch)
    // We call our own generate-narrative endpoint so it doesn't block the upload response
    const host = req.headers.get("host") ?? "localhost:3000";
    const proto = host.startsWith("localhost") ? "http" : "https";
    fetch(`${proto}://${host}/api/reports/generate-narrative`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    }).catch(() => {});

    const report = db.prepare("SELECT * FROM reports WHERE id = ?").get(reportId);
    return NextResponse.json({ report });
  } catch (error) {
    console.error("[upload-pdf] error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
