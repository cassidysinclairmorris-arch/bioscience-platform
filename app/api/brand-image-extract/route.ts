import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT = (url: string) => `Analyze the brand at ${url}. Use web search if needed to find their visual identity.

Return ONLY a raw JSON object with exactly these fields — no markdown, no explanation:
{
  "primaryColors": ["#hex1", "#hex2"],
  "secondaryColors": ["#hex1", "#hex2"],
  "fontStyle": "serif" or "sans-serif" or "geometric",
  "tone": "clinical" or "modern" or "warm" or "editorial",
  "logoDescription": "brief 1-sentence description of their logo style",
  "visualStyle": "2-3 word summary of their visual style"
}`;

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    const extract = async (useSearch: boolean) => {
      const params: Anthropic.MessageCreateParamsNonStreaming = {
        model: "claude-sonnet-4-6",
        max_tokens: 800,
        messages: [{ role: "user", content: PROMPT(url) }],
      };
      if (useSearch) {
        (params as unknown as Record<string, unknown>).tools = [{ type: "web_search_20250305", name: "web_search" }];
      }
      const msg = await client.messages.create(params);
      const text = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map(b => b.text)
        .join("")
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found");
      return JSON.parse(match[0]);
    };

    try {
      const data = await extract(true);
      return NextResponse.json(data);
    } catch {
      const data = await extract(false);
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error("Brand image extract error:", error);
    return NextResponse.json({ error: "Failed to extract brand" }, { status: 500 });
  }
}
