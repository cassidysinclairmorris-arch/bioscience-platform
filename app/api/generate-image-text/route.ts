import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { prompt, brandTone, clientName } = await req.json();
    if (!prompt) return NextResponse.json({ error: "Prompt required" }, { status: 400 });

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: 'You are a senior LinkedIn copywriter for B2B brands. Given a topic and brand tone, return ONLY a JSON object with exactly these keys: headline (max 7 words, punchy, no end punctuation), subtext (max 18 words, supporting insight or CTA), tagline (3-4 words, brand-voice statement). No markdown, no explanation, JSON only.',
      messages: [{
        role: "user",
        content: `Topic: ${prompt}. Brand tone: ${(brandTone || "professional and innovative").slice(0, 120)}. Client: ${clientName || "Company"}. Industry: bioscience and life sciences.`,
      }],
    });

    const raw = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text).join("")
      .replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "Parse failed" }, { status: 500 });

    return NextResponse.json(JSON.parse(match[0]));
  } catch (e) {
    console.error("generate-image-text error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
