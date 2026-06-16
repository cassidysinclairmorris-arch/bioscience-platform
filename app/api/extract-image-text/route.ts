import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are analysing a marketing image. Return ONLY a JSON array of text elements found in the image. Each element: { text: string, approximate_position: 'top' | 'top-left' | 'top-right' | 'center' | 'bottom' | 'bottom-left' | 'bottom-right', size: 'large' | 'medium' | 'small', style: 'bold' | 'regular' | 'italic' | 'light', color: hex string best approximation }. If no text found return empty array. No markdown, no explanation, JSON only.`;

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) return NextResponse.json({ error: "imageUrl required" }, { status: 400 });

    // Fetch image and convert to base64
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });

    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const mediaType = (contentType.includes("png") ? "image/png"
      : contentType.includes("webp") ? "image/webp"
      : contentType.includes("gif")  ? "image/gif"
      : "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

    const buf = await imgRes.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");

    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{
        role: "user",
        content: [{
          type: "image",
          source: { type: "base64", media_type: mediaType, data: b64 },
        }, {
          type: "text",
          text: "List all text elements visible in this image.",
        }],
      }],
    });

    const raw = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text).join("")
      .replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return NextResponse.json([]);

    return NextResponse.json(JSON.parse(match[0]));
  } catch (err) {
    console.error("[extract-image-text] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
