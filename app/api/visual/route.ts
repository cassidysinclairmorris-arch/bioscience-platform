import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getBrandBlock, resolveFonts } from "@/lib/brand-context";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Master brief — applied as system prompt to every generation ───────────────
const MASTER_BRIEF = `
You are the world's foremost LinkedIn visual strategist — a CEO with 10+ years of platform expertise who has studied every algorithm update, scroll-stopping creative pattern, viral post format, and brand identity system that has performed at the highest level on LinkedIn from 2020–2026.

LinkedIn in 2026 rewards: bold typographic hierarchy, clean negative space, brand credibility signals, and visuals that feel like they were made by a premium agency — not a template tool.

QUALITY BAR — every visual must pass all four:
1. Would a C-suite executive be proud to post this?
2. Does it look like it belongs in a premium brand's feed — not a template library?
3. Is the company's identity immediately recognizable within 1 second of scrolling?
4. Does the typography alone carry the visual — even without any imagery?

LINKEDIN ALGORITHM SIGNALS (2026):
- First-frame stop-scroll: hook text must be bold, high contrast, immediately visible
- Brand recognition: consistent fonts, palette, padding grid across every visual in the series
- Emotional contrast: dark background + single white headline, or light field + bold dark type
- No stock imagery: pure typography + color + geometric/abstract elements only — this is the 2026 LinkedIn premium signal
- Seniority signals: restrained color (not rainbow), premium font choices, confident layout (not cluttered), subtle texture (not flat)

LAYOUT RULES:
- 1080×1080px square SVG
- Minimum 48px padding on all sides — LinkedIn compresses visuals, generous margins protect content
- Text hierarchy: LINE 1 = short punchy hook (5–8 words, largest text), LINE 2 = supporting statement, LINE 3 = optional CTA
- Maximum 3 font sizes per visual
- Not flat white — use gradient mesh, subtle grain, geometric pattern, dark luxury, or editorial texture
- The overall impression = a $500/hour creative director made this

FONT RULE: Font families are specified per-brand in the FONT DIRECTIVE section of each request. Always embed them via @import inside <defs><style>. Never use unlisted font families.
`;

// ── Per-company visual style guides ──────────────────────────────────────────
const STYLE_GUIDES: Record<string, string> = {
  cpolar: `
BRAND INPUT — C-POLAR Technologies:
Industry: Ambient protection / antimicrobial technology
Brand Colors: Lime green #91BC07, Near-black #2B2B2B, Off-white #F0F0F0, Warm stone #DCD8CF, Grey #837F7A
Tone: Premium / Authoritative / Quiet confidence
Style direction: Soft neutral stone and grey backgrounds (#DCD8CF, #F0F0F0). Wide open negative space. Clean geometric sans-serif type. Editorial white — think Aesop or Patagonia brand aesthetic.
Accent rule: #91BC07 used ONLY on 2–3 key words — never as background fill. Everything else stays neutral.
The visual principle: The most effective protection works quietly. The design does the same.`,

  oxia: `
BRAND INPUT — Oxia Therapeutics:
Industry: Regenerative medicine / cellular repair
Brand Colors: Signature navy #1A3D4F (PRIMARY BACKGROUND — always use this), Teal #2BBFB0 (accent only), Coral #E8504A (2–3 power words only), White #FFFFFF (all text)
Tone: Bold / Premium / Scientific authority
Style direction: ALWAYS use deep navy #1A3D4F as the primary background — this is Oxia's signature colour. Gradient from #1A3D4F to #0d2233 (darker navy) or #1A3D4F to #2A6B7C (teal-navy). Wide-tracked headline caps in white. Teal #2BBFB0 on borders, rule lines, and geometric accents. Coral #E8504A on 2–3 power words in the headline only.
TEXT RULE: Every word must be white (#FFFFFF). No grey, off-white, or dark text anywhere.
The visual principle: The authority of 30 years of Baylor science. Deep navy signals trust, precision, and seniority.`,

  coregen: `
BRAND INPUT — CoRegen:
Industry: Oncology / cancer immunotherapy
Brand Colors: Red #E8181A, Near-black #0D0D1A, Deep navy #1A1A3E, White #FFFFFF
Tone: Bold / Disruptive / Historic urgency
Style direction: Near-black #0D0D1A and deep navy #1A1A3E backgrounds dominate. ALL TEXT WHITE (#FFFFFF). Bold condensed sans-serif headlines at large scale. Think cinematic — dark, urgent, historic.
Accent rule: Red #E8181A ONLY on the 2–3 most important words — never on body copy, never as background.
TEXT RULE: Every word must be white (#FFFFFF).
The visual principle: The confidence of a company that knows it has something the world has been waiting for.`,

  intrepro: `
BRAND INPUT — IntrePro / Klim-Loc:
Industry: Medical devices / needleless technology
Brand Colors: Teal #2BBFB0, Dark teal #1A3A38, White #FFFFFF, Light teal #EAF8F7
Tone: Authoritative / Precise / Innovative
Style direction: Dark teal #1A3A38 to near-black gradient backgrounds. ALL TEXT WHITE (#FFFFFF). Teal #2BBFB0 as accent on key words, rule lines, and geometric elements. Clinical but confident — think Boston Scientific meets Apple.
TEXT RULE: Every word must be white (#FFFFFF).
The visual principle: Competence and innovation projected simultaneously. Precise, purposeful, never academic.`,

  senvi: `
BRAND INPUT — Senvi:
Industry: Longevity science / senescent cell clearance
Brand Colors: Teal #2BBFB3, Deep dark green #0A2A28, White #FFFFFF, Mid teal #1A8A84
Tone: Premium / Scientific / Forward-looking
Style direction: Dark near-black #0A2A28 to teal #2BBFB3 gradient backgrounds. Huge display typography. White headlines. Molecular/cellular geometry in teal tones as decorative background elements. Think between a Nature paper and a TED talk.
The visual principle: Always elegant. Technically precise, visually stunning.`,
};

// Build a Google Fonts @import URL for one or two font families
function googleFontsImport(headline: string, body: string): string {
  const encode = (f: string) => f.trim().replace(/ /g, "+");
  const families: string[] = [];
  families.push(`family=${encode(headline)}:wght@400;600;700;800;900`);
  if (body && body.toLowerCase() !== headline.toLowerCase()) {
    families.push(`family=${encode(body)}:wght@400;500;600`);
  }
  return `@import url('https://fonts.googleapis.com/css2?${families.join("&")}&display=swap');`;
}

export async function POST(req: NextRequest) {
  try {
    const { company, pillar, visualType, postContent } = await req.json();

    const excerpt = postContent?.slice(0, 200) || pillar.example.slice(0, 200);

    // Shared brand context — stored brand_prompt > hardcoded style guide > dynamic context
    // getBrandBlock uses the same source as the AI image route (lib/brand-context)
    const brandBlock = getBrandBlock(company, STYLE_GUIDES[company.id]);

    // Resolve fonts — handles both camelCase (static) and snake_case (DB) naming
    const { headlineFont, bodyFont } = resolveFonts(company);
    const fontImport = googleFontsImport(headlineFont, bodyFont);

    const fontDirective = `FONT DIRECTIVE — MANDATORY:
Headline/display font: "${headlineFont}"
Body/supporting font:  "${bodyFont}"
Embed these fonts as the FIRST rule inside your <defs><style> block:
  ${fontImport}
Use font-family="${headlineFont}" on ALL headlines, hero text, and large typographic elements.
Use font-family="${bodyFont}" on ALL body copy, sub-headings, captions, and supporting text.
Do NOT use any other font families.`;

    const noLogo = `CRITICAL: Do NOT include any logo, wordmark, or company name rendered as a logo anywhere in the SVG. The logo is overlaid as a separate HTML element and must not appear inside the generated image.`;

    const typePrompts: Record<string, string> = {
      quote: `Visual type: QUOTE CARD
Extract the single most powerful quote or statement (max 18 words) from the content direction below and make it the hero typographic element. Large decorative quotation mark in accent color. Attribution line smaller below. 2–3 key words in accent color.`,

      stat: `Visual type: DATA / STAT GRAPHIC
Identify the single most powerful statistic, number, or fact from the content direction. Make it the hero — huge bold number or percentage in accent color. Short label beneath. One supporting context line. Include a minimal geometric data element (arc, bar, or circle) in brand colors.`,

      brand: `Visual type: BRAND STATEMENT CARD
Use the company tagline or a key brand phrase from the content direction as the hero typographic element. Large, dominant, unapologetic. Supporting line beneath. Feels like an official brand announcement — minimal, confident, premium.`,

      science: `Visual type: SCIENCE EXPLAINER
Create a visual diagram explaining the core science concept using abstract geometric shapes, arrows, and labels. Circles for cells/molecules, arrows for pathways/mechanisms, labels for key terms. Scientific but accessible — a LinkedIn professional grasps it in 5 seconds. Clear hierarchy: headline concept → visual mechanism → key outcome.`,
    };

    const prompt = `${MASTER_BRIEF}

---

${brandBlock}

Post type: ${pillar.type} — ${pillar.day}
Content direction: ${excerpt}

${typePrompts[visualType] || typePrompts.brand}

${fontDirective}

${noLogo}

Produce a single 1080×1080 SVG that passes all four quality criteria in the master brief. Use the brand palette exclusively. The font @import above MUST appear inside <defs><style> before any other CSS rules. Pure shapes, paths, and text — no external image references.

Return ONLY the raw SVG code starting with <svg and ending with </svg>. No markdown, no explanation, no preamble.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: "You are a world-class LinkedIn visual designer and brand strategist. You produce premium SVG visuals that look like they were made by a $500/hour creative director. You follow brand guidelines with precision and never compromise on visual quality.",
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
