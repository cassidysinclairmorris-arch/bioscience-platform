import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

async function generateBrandPrompt(brandData: Record<string, unknown>, client: Anthropic): Promise<string> {
  const accentColor  = (brandData.accent_color  || "#0066ff") as string;
  const darkColor    = (brandData.dark_color    || "#000000") as string;
  const lightColor   = (brandData.light_color   || "#ffffff") as string;
  const visualMood   = (brandData.visual_mood   || "") as string;
  const hFont        = (brandData.headline_font || brandData.primary_font || "Inter") as string;
  const bFont        = (brandData.body_font     || brandData.secondary_font || hFont) as string;
  const keyPhrases   = ((brandData.key_phrases as string[]) || []).join(", ");
  const badges       = ((brandData.badges as string[]) || []).join(", ");
  const name         = (brandData.name     || "This company") as string;
  const tagline      = (brandData.tagline  || "") as string;
  const voice        = (brandData.voice    || "") as string;
  const audience     = (brandData.audience || "") as string;

  const prompt = `You are a senior creative director at a top-tier branding agency. Write a BRAND PROMPT — a reusable context block prepended to every AI image generation request for this client. Used with Ideogram v2 (DESIGN style) and Flux 1.1 Pro.

CLIENT:
- Company: ${name} — ${tagline}
- Voice: ${voice}
- Audience: ${audience}
- Accent: ${accentColor} · Dark: ${darkColor} · Light: ${lightColor}
- Visual mood: ${visualMood}
- Headline font: ${hFont} · Body font: ${bFont}
- Key phrases: ${keyPhrases}
- Tags: ${badges}

Write exactly these sections (label in caps, content on same line):

IDENTITY: One sentence — who they are and what premium market they occupy.
COLORS: Hex usage rules for each color — when to use, when NOT to use, how much of the composition it should dominate. Be opinionated and precise.
TYPOGRAPHY: ${hFont} and ${bFont} usage rules — scale, tracking, weight, hierarchy. Specific enough to direct a designer.
MOOD: 2-3 sentences in art director vocabulary (negative space, typographic tension, colour temperature). Include 1-2 real-world brand references that match the aesthetic.
STYLE: 2 reference descriptors capturing the visual tier this brand should occupy. Be specific to their market (biotech, medtech, etc.).
AVOID: 6 specific things — colour misuse, compositional clichés for their industry, aesthetic contradictions with the brand.
LINKEDIN COMPOSITION: 3 rules for 1:1 square format — text anchor position, contrast requirements, scroll-stopping first frame.

200-250 words total. Dense and precise. Output the brand prompt only — no preamble.`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    });
    return message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("")
      .trim();
  } catch {
    return "";
  }
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT = (url: string) => `You are a brand strategist and LinkedIn content expert with deep expertise in the 2026 LinkedIn algorithm.

Analyze this company website: ${url}

Use web search to:
1. Find current information about this company — their products, technology, market, founding story
2. Identify their industry and the LinkedIn audience they should be targeting
3. Research LinkedIn 2026 best practices: optimal posting days, times, and content types for their specific audience vertical (biotech, medtech, SaaS, etc.)
4. Inspect the company website to identify the actual fonts they use — look for Google Fonts imports, CSS font-family declarations, or any font references in their page source

Then return a single JSON object with exactly these fields:

{
  "name": "Company name",
  "tagline": "Their actual tagline or a 6-8 word description of what they do",
  "audience": "Who their target audience is on LinkedIn — be specific (job titles, sectors)",
  "voice": "3-4 sentences describing their brand voice and tone for LinkedIn posts. Be specific about personality, not generic.",
  "visual_mood": "Describe their visual style — colors used, aesthetic, mood.",
  "accent_color": "#hexcode of their primary brand color",
  "dark_color": "#hexcode of their darkest brand color",
  "light_color": "#hexcode of their lightest brand color",
  "key_phrases": ["phrase1", "phrase2", "phrase3", "phrase4", "phrase5"],
  "badges": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "logo_text": "Company abbreviation or short name",
  "timezone": "EST or PST or GMT or CET — based on company HQ location",
  "primary_font": "The actual display/headline font used on their website (e.g. 'Inter', 'Helvetica Neue', 'GT Walsheim'). If unknown, infer from brand personality.",
  "secondary_font": "The body/secondary font used on their website (e.g. 'Inter', 'Georgia', 'DM Sans'). If same as primary, still list it.",
  "headline_font": "The bold display font for SVG visual generation — must be a valid Google Fonts name (e.g. 'Inter', 'Plus Jakarta Sans', 'Playfair Display', 'Space Grotesk'). Prioritise what's actually used on the site; fall back to a Google Font that matches the brand aesthetic.",
  "body_font": "The body copy font for SVG visual generation — must be a valid Google Fonts name (e.g. 'Inter', 'DM Sans', 'Source Sans 3'). Can be the same as headline_font if the brand uses one typeface.",
  "pillars": [
    {
      "day": "Tuesday",
      "type": "Science / Tech Insight",
      "color": "#hexcode — a color from the brand palette that matches this pillar's tone",
      "example": "2-3 sentence content direction highly specific to this company. Reference their actual technology, products, or key claims. Make it so specific that only this company could post it."
    },
    {
      "day": "Wednesday",
      "type": "Human Story",
      "color": "#hexcode",
      "example": "Founder journey, team story, or customer impact specific to this company and their mission."
    },
    {
      "day": "Thursday",
      "type": "Industry POV",
      "color": "#hexcode",
      "example": "A bold industry perspective tied to this company's market position. Reference the problem they solve or a systemic issue in their sector."
    },
    {
      "day": "Friday",
      "type": "Proof & Traction",
      "color": "#hexcode",
      "example": "Data, validation, awards, partnerships, or milestones specific to this company. Real numbers and named validators where possible."
    }
  ]
}

PILLAR RULES:
- Days must be 4 of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday
- For B2B biotech/medtech/deeptech: default to Tuesday–Friday
- For medtech with hospital/DoD focus: consider Monday–Friday mix
- Pillar types must rotate: Science/Tech Insight → Human Story → Industry POV → Proof & Traction
- Each example must be so specific to this company that it could not apply to any other — reference real products, real science, real milestones
- Timezone factor: EST companies peak 8–10 AM EST; PST companies peak 9–11 AM PST

Return ONLY the raw JSON object. No markdown, no explanation, no preamble.`;

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    // Try with web search first
    try {
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{
          role: "user",
          content: `Search for this company and analyze their brand and LinkedIn content strategy: ${url}\n\n${PROMPT(url)}`,
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
        // Auto-generate brand prompt in parallel
        const brandPrompt = await generateBrandPrompt(data, client);
        if (brandPrompt) data.brand_prompt = brandPrompt;
        return NextResponse.json({ brand: data });
      }
    } catch {
      // Web search unavailable — fall through
    }

    // Fallback: plain generation
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
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
    const brandPrompt = await generateBrandPrompt(data, client);
    if (brandPrompt) data.brand_prompt = brandPrompt;
    return NextResponse.json({ brand: data });

  } catch (error) {
    console.error("Brand extract error:", error);
    return NextResponse.json({ error: "Failed to extract brand data" }, { status: 500 });
  }
}
