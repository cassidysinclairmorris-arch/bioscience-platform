/**
 * Shared brand kit reader — used by both the SVG visual route and the AI
 * image-generate route so both pipelines always get identical brand context.
 *
 * Handles both naming conventions:
 *   • camelCase  — lib/companies.ts static companies (accentColor, darkColor, visualMood, keyPhrases)
 *   • snake_case — DB clients returned by /api/clients  (accent_color, dark_color, visual_mood, key_phrases)
 */

export interface BrandTokens {
  accent: string;
  dark: string;
  light: string;
  mood: string;
  hFont: string;
  bFont: string;
  phrases: string[];
  storedPrompt: string;
  voice: string;
  tagline: string;
  name: string;
}

export function readBrand(company: Record<string, unknown>): BrandTokens {
  const brand = (company.brand || {}) as Record<string, unknown>;

  const accent  = (brand.accent_color  || brand.accentColor  || company.color || "#0066ff") as string;
  const dark    = (brand.dark_color    || brand.darkColor    || brand.colorDark    || "#000000") as string;
  const light   = (brand.light_color   || brand.lightColor   || brand.colorLight   || "#ffffff") as string;
  const mood    = (brand.visual_mood   || brand.visualMood   || "") as string;
  const hFont   = (brand.headline_font || brand.primary_font || "") as string;
  const bFont   = (brand.body_font     || brand.secondary_font || hFont) as string;

  const rawPhrases = (brand.key_phrases || brand.keyPhrases || []) as string[];
  const phrases = Array.isArray(rawPhrases) ? rawPhrases.filter(Boolean) : [];

  const storedPrompt = (brand.brand_prompt || "") as string;
  const voice   = (company.voice    || "") as string;
  const tagline = (company.tagline  || "") as string;
  const name    = (company.name     || "this company") as string;

  return { accent, dark, light, mood, hFont, bFont, phrases, storedPrompt, voice, tagline, name };
}

/**
 * Builds a rich brand context block used when no stored brand_prompt exists.
 * Includes explicit hex usage rules, fonts, mood, key phrases, and voice.
 */
export function buildBrandContext(company: Record<string, unknown>): string {
  const { accent, dark, light, mood, hFont, bFont, phrases, voice, tagline, name } = readBrand(company);

  const fontLine = hFont
    ? `TYPOGRAPHY: "${hFont}" for all display headlines — large scale, tight tracking. ${
        bFont && bFont !== hFont ? `"${bFont}" for body copy.` : "Same typeface for body at smaller scale."
      }`
    : `TYPOGRAPHY: Clean modern sans-serif headlines at large scale. Body in a complementary weight.`;

  const phraseLine = phrases.length > 0
    ? `KEY PHRASES TO CONSIDER: ${phrases.slice(0, 4).join(" · ")}`
    : "";

  const voiceLine = voice
    ? `BRAND PERSONALITY: ${voice.slice(0, 120)}`
    : "";

  const moodLine = mood
    ? `VISUAL STYLE: ${mood}`
    : `VISUAL STYLE: Premium B2B biotech — editorial minimalism, high contrast, generous negative space.`;

  return [
    `BRAND: ${name}${tagline ? ` — ${tagline}` : ""}`,
    `PRIMARY ACCENT COLOR: ${accent} — use on 2–3 key words or one geometric accent element ONLY. Never as a full background fill.`,
    `DARK COLOR: ${dark} — use for backgrounds, dark typographic elements, contrast areas.`,
    `LIGHT COLOR: ${light} — use for backgrounds, breathing space, light text on dark.`,
    moodLine,
    fontLine,
    voiceLine,
    phraseLine,
    `AESTHETIC: Looks like it was made by a $500/hour creative director. Premium, bespoke, no template feel.`,
    `FORBIDDEN: no logo, no wordmark, no company name as a graphic element, no generic stock photo clichés, no clip art, no gradient ramps that look like PowerPoint.`,
  ].filter(Boolean).join("\n");
}

/**
 * Returns the best available brand block for a company:
 *   1. Stored brand_prompt  (Claude-authored, prompt-optimised)
 *   2. Dynamic context      (built from raw brand kit tokens)
 *
 * Pass an optional hardcoded styleGuide string (e.g. from STYLE_GUIDES lookup)
 * to merge it into the dynamic fallback when no brand_prompt exists.
 */
export function getBrandBlock(
  company: Record<string, unknown>,
  hardcodedStyleGuide?: string,
): string {
  const { storedPrompt } = readBrand(company);

  if (storedPrompt) {
    return `=== BRAND CREATIVE BRIEF ===\n${storedPrompt}\n=== END BRIEF ===`;
  }

  if (hardcodedStyleGuide) {
    // Enrich the hardcoded style guide with dynamic tokens (key phrases, voice,
    // tagline) that aren't in the hardcoded text.
    const { phrases, voice, tagline, name, hFont, bFont } = readBrand(company);
    const extras: string[] = [];
    if (phrases.length > 0) extras.push(`KEY PHRASES: ${phrases.slice(0, 4).join(" · ")}`);
    if (voice)   extras.push(`BRAND PERSONALITY: ${voice.slice(0, 120)}`);
    if (tagline) extras.push(`TAGLINE: ${tagline}`);
    const fontNote = hFont
      ? `TYPOGRAPHY: "${hFont}" for headlines${bFont && bFont !== hFont ? `, "${bFont}" for body.` : "."}`
      : "";
    if (fontNote) extras.push(fontNote);
    const header = `BRAND: ${name}${tagline ? ` — ${tagline}` : ""}`;
    return [header, hardcodedStyleGuide, ...extras].filter(Boolean).join("\n");
  }

  return buildBrandContext(company);
}

/**
 * Resolves the headline and body font names, handling both naming conventions.
 * Falls back to "Inter" when no font is specified.
 */
export function resolveFonts(company: Record<string, unknown>): { headlineFont: string; bodyFont: string } {
  const { hFont, bFont } = readBrand(company);
  const headlineFont = hFont || "Inter";
  const bodyFont     = bFont || headlineFont;
  return { headlineFont, bodyFont };
}
