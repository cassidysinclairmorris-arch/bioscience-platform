import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT = (url: string) => `You are a brand strategist and LinkedIn content expert.

Analyze this company website URL and extract their brand identity: ${url}

Based on the URL domain and any knowledge you have about this company, return a JSON object with exactly these fields:
{
  "name": "Company name",
  "tagline": "Their actual tagline or a 6-8 word description of what they do",
  "audience": "Who their target audience is on LinkedIn — be specific",
  "voice": "3-4 sentences describing their brand voice and tone for LinkedIn posts. Be specific about personality, not generic.",
  "visual_mood": "Describe their visual style — colors used, aesthetic, mood.",
  "accent_color": "#hexcode of their primary brand color",
  "dark_color": "#hexcode of their darkest brand color",
  "light_color": "#hexcode of their lightest brand color",
  "key_phrases": ["phrase1", "phrase2", "phrase3", "phrase4", "phrase5"],
  "badges": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "logo_text": "Company abbreviation or short name"
}

Return ONLY the raw JSON object. No markdown, no explanation, no preamble.`;

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    // Try with web search first
    try {
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{
          role: "user",
          content: `Search for this company website and analyze their brand: ${url}\n\n${PROMPT(url)}`,
        }],
      });

      const text = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map(b => b.text)
        .join("");

      const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ brand: data });
      }
    } catch {
      // Web search unavailable — fall through
    }

    // Fallback: plain generation
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: PROMPT(url) }],
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("");

    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse brand data" }, { status: 500 });
    }

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ brand: data });

  } catch (error) {
    console.error("Brand extract error:", error);
    return NextResponse.json({ error: "Failed to extract brand data" }, { status: 500 });
  }
}