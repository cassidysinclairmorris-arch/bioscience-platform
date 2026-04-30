import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { currentSvg, editRequest, company } = await req.json();

    if (!currentSvg || !editRequest) {
      return NextResponse.json({ error: "currentSvg and editRequest required" }, { status: 400 });
    }

    const accentColor = company?.brand?.accent_color || company?.color || "#0066ff";
    const headlineFont = company?.brand?.headline_font || "Inter";
    const bodyFont = company?.brand?.body_font || headlineFont;

    const prompt = `You are a world-class LinkedIn visual designer. A user has generated an SVG visual and wants to refine it.

Current SVG:
${currentSvg}

Edit request: "${editRequest}"

Apply the edit precisely. Rules:
- Preserve ALL brand colors (especially: ${accentColor})
- Preserve ALL Google Fonts @import statements exactly as-is (fonts: ${headlineFont}, ${bodyFont})
- Preserve the 1080×1080 viewport and dimensions
- Preserve all text content unless the edit explicitly changes it
- Only change what was specifically requested — nothing else
- The result must still pass the quality bar: premium, C-suite worthy, brand-consistent

Return ONLY the raw SVG code starting with <svg and ending with </svg>. No markdown, no explanation, no preamble.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: "You are a world-class LinkedIn visual designer. You apply precise surgical edits to SVG visuals while preserving all brand identity, fonts, and dimensions.",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const svg = raw.trim().replace(/```[\w]*\n?/g, "").replace(/```/g, "").trim();

    return NextResponse.json({ svg });
  } catch (error) {
    console.error("Visual refine error:", error);
    return NextResponse.json({ error: "Visual refine failed" }, { status: 500 });
  }
}
