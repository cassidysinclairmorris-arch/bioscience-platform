import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@/lib/db";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildGenerationPrompt(brand: Record<string, unknown>, company: Record<string, unknown>): string {
  const accentColor  = (brand.accent_color  || company.color || "#0066ff") as string;
  const darkColor    = (brand.dark_color    || "#000000") as string;
  const lightColor   = (brand.light_color   || "#ffffff") as string;
  const visualMood   = (brand.visual_mood   || "") as string;
  const hFont        = (brand.headline_font || brand.primary_font || "Inter") as string;
  const bFont        = (brand.body_font     || brand.secondary_font || hFont) as string;
  const keyPhrases   = JSON.parse((brand.key_phrases as string) || "[]") as string[];
  const badges       = JSON.parse((brand.badges as string) || "[]") as string[];
  const voice        = (company.voice       || "") as string;
  const audience     = (company.audience    || "") as string;
  const name         = (company.name        || "This company") as string;
  const tagline      = (company.tagline     || "") as string;

  return `You are a senior creative director at a top-tier branding agency. Your specialty is writing generative AI image prompts that produce output at the quality level of Bloom.ai, Canva's Magic Design, or a $500/hour freelance creative director.

You are writing a BRAND PROMPT — a reusable context block that gets prepended to every image generation request for this client. It will be used with Ideogram v2 (DESIGN style) and Flux 1.1 Pro.

CLIENT DATA:
- Company: ${name}
- Tagline: ${tagline}
- Brand voice: ${voice}
- Target audience: ${audience}
- Primary accent: ${accentColor}
- Dark: ${darkColor}
- Light: ${lightColor}
- Visual mood: ${visualMood}
- Headline font: ${hFont}
- Body font: ${bFont}
- Key phrases: ${keyPhrases.join(", ")}
- Brand tags: ${badges.join(", ")}

Write a brand prompt that includes ALL of the following sections, each on its own line with the section label in caps:

IDENTITY: One sentence describing exactly who this brand is and what premium market they occupy.

COLORS: Exact hex usage rules. For each color, specify: when to use it, where NOT to use it, and how much of the composition it should dominate (e.g. "${accentColor} on 2-3 accent words or a single geometric element only — never as a background fill unless it's a full bleed dark treatment"). Be precise and opinionated.

TYPOGRAPHY: Exact font usage rules. "${hFont} for headlines at large scale — tight tracking, high optical weight. ${bFont} for supporting copy — generous line height, small caps for labels." Include specific guidance on sizing relationships.

MOOD: A precise design language description in 2-3 sentences. Reference real-world design references (e.g. "Aesop editorial minimalism meets clinical precision", "Apple Health campaign aesthetics", "Nature journal cover design language"). Use vocabulary a senior art director would use: negative space, typographic tension, colour temperature, optical balance.

STYLE: 2-3 reference descriptors that capture the visual tier. Examples: "looks like a bespoke brand campaign from a top-10 biotech creative agency", "could appear in Wallpaper* or Fast Company", "the visual language of a Series B pitch deck designed by Base Design". Be specific to this brand's market position.

AVOID: A concise list of 6-8 specific things to never include. Make them specific to this brand — not generic. Include: specific colour misuse, specific compositional clichés for this industry, text placement errors, aesthetic contradictions with the brand.

LINKEDIN COMPOSITION: 3-4 specific rules for LinkedIn 1:1 square format. Include: where the primary text anchor should sit, contrast ratio requirements, how much of the frame text should occupy, and the single most important thing to do in the first visual frame to stop the scroll.

The output should be 200-280 words total — dense and precise, no filler. Write it as a single continuous block (not a JSON object), ready to be copy-pasted directly into a prompt. Do not include any preamble or explanation — just the brand prompt itself.`;
}

export async function POST(req: NextRequest) {
  try {
    const { clientId, brand, company } = await req.json();

    const brandData   = brand   as Record<string, unknown>;
    const companyData = company as Record<string, unknown>;

    const prompt = buildGenerationPrompt(brandData, companyData);

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const brandPrompt = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("")
      .trim();

    // Persist to DB if clientId provided
    if (clientId) {
      const db = getDb();
      const existing = db.prepare("SELECT id FROM brand_kits WHERE client_id = ?").get(clientId);
      if (existing) {
        db.prepare("UPDATE brand_kits SET brand_prompt = ?, updated_at = datetime('now') WHERE client_id = ?")
          .run(brandPrompt, clientId);
      }
    }

    return NextResponse.json({ brandPrompt });
  } catch (error) {
    console.error("[brand-prompt] Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
