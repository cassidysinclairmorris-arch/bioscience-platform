import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Per-company visual style guides
const STYLE_GUIDES: Record<string, string> = {
  cpolar: `
VISUAL IDENTITY — C-POLAR Technologies:
Palette: Lime green #91BC07, Near-black #2B2B2B, Off-white #F0F0F0, Warm stone #DCD8CF, Grey #837F7A, White #FFFFFF
Style: Quiet premium. Soft neutral stone and grey backgrounds (#DCD8CF, #F0F0F0). Wide open negative space. Clean geometric sans-serif type.
Accent rule: #91BC07 used ONLY on 2–3 key words — never as a background fill. All other elements stay neutral.
Mood: The most effective protection works quietly. Never alarming. Never loud. Warmly precise.`,

  oxia: `
VISUAL IDENTITY — Oxia Therapeutics:
Palette: Teal #2BBFB0, Dark navy #1A3D4F, Coral/salmon #E8504A, Warm off-white #F5F2EE, White #FFFFFF, Deep teal #2A6B7C
Style: Elegant scientific. Dark teal-to-navy gradient backgrounds. ALL TEXT MUST BE WHITE (#FFFFFF). Wide-tracked headline caps in white. Coral #E8504A on 2–3 power words only.
TEXT COLOR RULE: Every word in this image must be white (#FFFFFF) — no dark text, no navy text, no grey text.
Mood: Scientific confidence meets human warmth. Refined, never loud. Wide letter-spacing on headlines.`,

  coregen: `
VISUAL IDENTITY — CoRegen:
Palette: Red #E8181A, Near-black #0D0D1A, Deep navy #1A1A3E, White #FFFFFF, Off-white #F5F5F7, Dark navy #2A2A4A
Style: Dark cinematic bold. Near-black #0D0D1A and deep navy #1A1A3E backgrounds dominate. ALL TEXT MUST BE WHITE (#FFFFFF). Bold condensed white sans-serif headlines at large scale.
TEXT COLOR RULE: Every word in this image must be white (#FFFFFF). Red #E8181A on 2–3 key words only — never on body copy, never as background.
Mood: Historic and urgent. The confidence of a company that knows it has something the world has been waiting for.`,

  intrepro: `
VISUAL IDENTITY — IntrePro / Klim-Loc:
Palette: Teal #2BBFB0, Dark teal #1A3A38, White #FFFFFF, Light teal #EAF8F7, Deep teal #2A5A55, Bright teal #00A896
Style: Clean medtech. Dark teal #1A3A38 to near-black gradient backgrounds. ALL TEXT MUST BE WHITE (#FFFFFF). Teal #2BBFB0 as accent on key words, borders, and icons.
TEXT COLOR RULE: Every word in this image must be white (#FFFFFF) — no dark text on dark backgrounds.
Mood: Clinical but accessible. Projects competence and innovation simultaneously. Precise, purposeful, never academic.`,

  senvi: `
VISUAL IDENTITY — Senvi:
Palette: Teal #2BBFB3, Deep dark green #0A2A28, White #FFFFFF, Light teal #E0F9F7, Mid teal #1A8A84, Near-black #000D0C
Style: Teal cinematic scientific. Either (A) dark near-black #0A2A28 to teal #2BBFB3 gradient backgrounds with huge display type and white headlines, OR (B) clean white backgrounds with teal #2BBFB3 headlines and black body copy. Molecular/cellular imagery in teal tones.
Mood: Always elegant. Sits between a Nature paper and a TED talk. Technically precise, visually stunning.`,
};

export async function POST(req: NextRequest) {
  try {
    const { company, pillar, visualType, postContent } = await req.json();

    const b = company.brand;
    const excerpt = postContent?.slice(0, 150) || pillar.example.slice(0, 150);
    const styleGuide = STYLE_GUIDES[company.id] || `BRAND: ${company.name}\nVisual style: ${b.visualMood}`;

    const noLogo = `CRITICAL: Do NOT include any logo, company name as a logo mark, wordmark, or logo text anywhere in the image. The logo will be overlaid separately as an HTML element.`;

    const baseStyle = `
${styleGuide}
Post type: ${pillar.type} — ${pillar.day}
Content direction: ${excerpt}
${noLogo}`;

    const prompts: Record<string, string> = {
      quote: `Create a 1080x1080 SVG quote card for ${company.name} that perfectly matches their brand style.
${baseStyle}

Design requirements:
- Background: use brand colors as specified in the style guide
- Extract or derive a powerful short quote (max 18 words) from the content direction
- Quote in large bold display text using brand palette
- Large decorative quotation mark in accent color
- 2–3 key words highlighted in accent color per brand rules
- All typography and shapes use only the brand palette above
- Feels like it belongs on their LinkedIn page — perfectly on-brand
- SVG only, no external images, pure shapes and text`,

      stat: `Create a 1080x1080 SVG data graphic for ${company.name} that matches their brand exactly.
${baseStyle}

Design requirements:
- Feature one powerful statistic, number or fact from the content direction as the hero element
- Huge bold number using accent color per brand palette
- Descriptive label text below in brand colors
- Secondary supporting context line
- Simple data visualization element (circle, bar, or progress arc) in brand colors
- Background in brand style as specified in the style guide
- Clean, data-journalism feel — LinkedIn professionals should immediately trust it
- SVG only, pure shapes and text`,

      brand: `Create a 1080x1080 SVG brand statement card for ${company.name}.
${baseStyle}

Design requirements:
- Large display typography hero: company tagline or a key brand phrase from the content direction
- Background and colors strictly from the brand palette above
- 2–3 words in accent color as per brand accent rules
- Minimal, confident, premium — no clutter
- Feels like an official brand announcement card
- SVG only, pure shapes and text`,

      science: `Create a 1080x1080 SVG science explainer graphic for ${company.name}.
${baseStyle}

Design requirements:
- Visual diagram explaining the science concept using abstract shapes, arrows, labels
- All brand colors from palette above throughout — accent color on key elements
- Clear visual hierarchy: headline concept, visual explanation, supporting detail
- Scientific but accessible — a LinkedIn professional understands in 5 seconds
- Geometric shapes represent biological/technical concepts (circles for cells, arrows for pathways, etc.)
- Background in brand style as specified
- SVG only, pure shapes, paths, and text`,
    };

    const prompt = (prompts[visualType] || prompts.brand) +
      "\n\nReturn ONLY the raw SVG code starting with <svg and ending with </svg>. No markdown, no explanation.";

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const svg = raw.trim().replace(/```[\w]*\n?/g, "").replace(/```/g, "").trim();

    return NextResponse.json({ svg });
  } catch (error) {
    console.error("Visual error:", error);
    return NextResponse.json({ error: "Visual generation failed" }, { status: 500 });
  }
}
