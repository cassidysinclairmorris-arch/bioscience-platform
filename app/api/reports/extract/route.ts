import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Extract the LinkedIn performance numbers from a single analytics screenshot.
// Returns a map of metric_key -> number (or null when not visible). Never guesses.
// This does not save anything; the studio fills the inputs and the agency saves.
const PROMPT = `Extract LinkedIn analytics numbers from this screenshot.
Return ONLY a JSON object with exactly these keys (use null when a value is not clearly visible, never guess or estimate):
{
  "impressions": number|null,
  "engagement_rate": number|null,
  "follower_growth": number|null,
  "reach": number|null,
  "reactions": number|null,
  "comments": number|null,
  "reposts": number|null,
  "profile_views": number|null
}
"engagement_rate" is a percentage as a plain number (e.g. 4.2 for 4.2%). Strip commas from large numbers.
Output ONLY the JSON object, no markdown fences, no explanation.`;

const IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
type ImageMime = (typeof IMAGE_MIMES)[number];

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image provided." }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image." }, { status: 400 });
    }
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    const media_type: ImageMime = (IMAGE_MIMES as readonly string[]).includes(file.type) ? (file.type as ImageMime) : "image/jpeg";

    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type, data } },
          { type: "text", text: PROMPT },
        ],
      }],
    });
    const raw = resp.content.find(c => c.type === "text")?.text ?? "";
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(jsonStr) as Record<string, number | null>;

    // Only pass through known numeric metric keys; drop anything unexpected.
    const KEYS = ["impressions", "engagement_rate", "follower_growth", "reach", "reactions", "comments", "reposts", "profile_views"];
    const values: Record<string, number | null> = {};
    for (const k of KEYS) {
      const v = parsed[k];
      values[k] = typeof v === "number" && !Number.isNaN(v) ? v : null;
    }
    return NextResponse.json({ values });
  } catch (err) {
    console.error("[reports/extract] error:", err);
    return NextResponse.json({ error: "Could not read the screenshot. Enter the numbers manually." }, { status: 500 });
  }
}
