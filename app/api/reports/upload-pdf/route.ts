import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACTION_PROMPT = `You are extracting LinkedIn analytics data from one or more files (PDF exports and/or screenshots) that all describe the SAME reporting period. Read every file and merge them into a single result. If the same metric appears in more than one file, prefer the most complete or most recent value. Combine every post found across all files into the "posts" array.
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

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ImageMime = (typeof IMAGE_MIMES)[number];

// Claude content blocks for the extraction call. PDFs go in as documents,
// screenshots as images, all in one message so they are read together.
type Block =
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
  | { type: "image"; source: { type: "base64"; media_type: ImageMime; data: string } }
  | { type: "text"; text: string };

export async function POST(req: NextRequest) {
  const db = getDb();
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "Blob storage is not configured. Set BLOB_READ_WRITE_TOKEN." }, { status: 500 });
    }

    const formData = await req.formData();
    // Accept multiple files under "files"; fall back to a single "file" for
    // backward compatibility with any older caller.
    let files = formData.getAll("files").filter((f): f is File => f instanceof File);
    const single = formData.get("file");
    if (files.length === 0 && single instanceof File) files = [single];

    const clientId = formData.get("clientId") as string;
    const type = (formData.get("type") as string) || "monthly";
    const periodStart = formData.get("periodStart") as string;
    const periodEnd = formData.get("periodEnd") as string;

    if (files.length === 0 || !clientId || !periodStart || !periodEnd) {
      return NextResponse.json({ error: "files, clientId, periodStart, periodEnd required" }, { status: 400 });
    }

    // Validate every file is a PDF or a supported image before doing any work.
    for (const f of files) {
      const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
      const isImg = (IMAGE_MIMES as readonly string[]).includes(f.type) || /\.(jpe?g|png|webp|gif)$/i.test(f.name);
      if (!isPdf && !isImg) {
        return NextResponse.json({ error: `Unsupported file: ${f.name}. Upload PDF or image (JPEG, PNG) files.` }, { status: 400 });
      }
    }

    // Store every file in Vercel Blob (never the local filesystem, which is
    // read-only on Vercel) and build the combined extraction request.
    const ts = Date.now();
    const blocks: Block[] = [];
    let firstUrl: string | null = null;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const buffer = Buffer.from(await f.arrayBuffer());
      const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
      const safeName = (f.name || "report").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-50);
      const key = `reports/${clientId}_${ts}_${i}_${safeName}`;

      if (isPdf) {
        const blob = await put(key, buffer, { access: "public", contentType: "application/pdf" });
        if (!firstUrl) firstUrl = blob.url;
        blocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") } });
      } else {
        const mime: ImageMime = (IMAGE_MIMES as readonly string[]).includes(f.type) ? (f.type as ImageMime) : "image/jpeg";
        const blob = await put(key, buffer, { access: "public", contentType: mime });
        if (!firstUrl) firstUrl = blob.url;
        blocks.push({ type: "image", source: { type: "base64", media_type: mime, data: buffer.toString("base64") } });
      }
    }
    blocks.push({ type: "text", text: EXTRACTION_PROMPT });

    // Create the stub report first (raw_pdf_url points at the first uploaded file).
    const insertResult = await db.prepare(
      `INSERT INTO reports (client_id, type, period_start, period_end, status, raw_pdf_url)
       VALUES (?, ?, ?, ?, 'draft', ?)`
    ).run(clientId, type, periodStart, periodEnd, firstUrl);
    const reportId = insertResult.lastInsertRowid as number;

    // Extract merged metrics from all files in a single Claude call.
    let extractedData: string | null = null;
    try {
      const extraction = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [{ role: "user", content: blocks as Anthropic.MessageParam["content"] }],
      });
      const raw = extraction.content.find(c => c.type === "text")?.text ?? "";
      const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      JSON.parse(jsonStr); // validate
      extractedData = jsonStr;
    } catch (e) {
      console.error("[upload-pdf] extraction failed:", e);
    }

    if (extractedData) {
      await db.prepare("UPDATE reports SET extracted_data = ?, updated_at = datetime('now') WHERE id = ?")
        .run(extractedData, reportId);
    }

    // Generate narratives without blocking the upload response.
    const host = req.headers.get("host") ?? "localhost:3000";
    const proto = host.startsWith("localhost") ? "http" : "https";
    fetch(`${proto}://${host}/api/reports/generate-narrative`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    }).catch(() => {});

    const report = await db.prepare("SELECT * FROM reports WHERE id = ?").get(reportId);
    return NextResponse.json({ report });
  } catch (error) {
    console.error("[upload-pdf] error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
