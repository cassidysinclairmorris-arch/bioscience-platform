// System prompts assembled from a client's Brand Center.
//
// The five Brand Center fields live on the client's brand_kits row and are
// written in the studio's Brand tab. Any field left blank is shown to the model
// as "(Not yet defined)" rather than being dropped, so the model can see what
// guidance it does not have instead of silently inventing it.

export interface BrandKitFields {
  voice_guide?: string | null;
  post_guidelines?: string | null;
  target_audiences?: string | null;
  competitor_analysis?: string | null;
  messaging_priorities?: string | null;
}

export interface PromptCompany {
  name?: string | null;
  tagline?: string | null;
  voice?: string | null;
  audience?: string | null;
}

export interface PromptPillar {
  type?: string | null;
  day?: string | null;
  example?: string | null;
}

export const NOT_DEFINED = "(Not yet defined)";

/**
 * The Brand Center fields for a client. A client with no brand_kits row, or a
 * database that has not run the Brand Center migration yet, both read back as
 * an empty object so generation never fails for want of a brand kit.
 */
export async function loadBrandKit(clientId: string | null | undefined): Promise<BrandKitFields> {
  if (!clientId) return {};
  try {
    const { getDb } = await import("./db");
    const row = await getDb()
      .prepare(
        `SELECT voice_guide, post_guidelines, target_audiences, competitor_analysis, messaging_priorities
           FROM brand_kits WHERE client_id = ?`
      )
      .get(clientId) as BrandKitFields | undefined;
    return row ?? {};
  } catch (err) {
    console.error("Brand kit lookup failed, continuing without it:", err);
    return {};
  }
}

function field(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  return v.length ? v : NOT_DEFINED;
}

/**
 * Just the five Brand Center sections, with no preamble, for embedding in a
 * system prompt that already has its own role framing (the visual routes).
 * Returns an empty string when nothing has been filled in, so a client with no
 * brand kit adds no noise to those prompts.
 */
export function brandKitBlock(brandKit: BrandKitFields | null | undefined): string {
  const kit = brandKit ?? {};
  const filled = [
    kit.voice_guide, kit.post_guidelines, kit.target_audiences,
    kit.competitor_analysis, kit.messaging_priorities,
  ].some(v => (v ?? "").trim().length > 0);
  if (!filled) return "";

  return `## BRAND CENTER

### Voice and tone
${field(kit.voice_guide)}

### Post guidelines
${field(kit.post_guidelines)}

### Target audiences
${field(kit.target_audiences)}

### Competitors and positioning
${field(kit.competitor_analysis)}

### Messaging priorities
${field(kit.messaging_priorities)}`;
}

/**
 * A compact brief for image models, which take a single prompt string and have
 * no system channel. Voice and competitor detail do not help a diffusion model,
 * so only audience and messaging guidance are carried through.
 */
export function brandKitImageNotes(brandKit: BrandKitFields | null | undefined): string {
  const kit = brandKit ?? {};
  const parts: string[] = [];
  const aud = (kit.target_audiences ?? "").trim();
  const msg = (kit.messaging_priorities ?? "").trim();
  const rules = (kit.post_guidelines ?? "").trim();
  if (aud) parts.push(`AUDIENCE: ${aud.slice(0, 240)}`);
  if (msg) parts.push(`MESSAGING PRIORITIES: ${msg.slice(0, 240)}`);
  if (rules) parts.push(`BRAND RULES: ${rules.slice(0, 240)}`);
  return parts.length ? parts.join("\n") : "";
}

/**
 * The system prompt for post generation: who the client is, how they sound,
 * and the pillar this post belongs to.
 *
 * `brandKit` may be null or an empty object when a client has no brand_kits row
 * yet; every field then reads as "(Not yet defined)".
 */
export function getBrandKitSystemPrompt(
  company: PromptCompany,
  brandKit: BrandKitFields | null | undefined,
  pillar: PromptPillar | null | undefined,
): string {
  const kit = brandKit ?? {};
  const name = field(company?.name);

  return `You are an expert science communicator and LinkedIn strategist writing for ${name}, a bioscience company.

Everything below is ${name}'s brand guidance, maintained by their agency. Treat it as authoritative. Where a section reads "${NOT_DEFINED}", you have no guidance on that point: fall back to the company details and write conservatively rather than inventing a position.

## COMPANY
Name: ${name}
Tagline: ${field(company?.tagline)}
Stated voice: ${field(company?.voice)}
Stated audience: ${field(company?.audience)}

## VOICE AND TONE
${field(kit.voice_guide)}

## POST GUIDELINES
${field(kit.post_guidelines)}

## TARGET AUDIENCES
${field(kit.target_audiences)}

## COMPETITORS AND POSITIONING
${field(kit.competitor_analysis)}

## MESSAGING PRIORITIES
${field(kit.messaging_priorities)}

## THIS POST
Content pillar: ${field(pillar?.type)}
Scheduled day: ${field(pillar?.day)}
Direction for this pillar: ${field(pillar?.example)}

When the brand guidance above conflicts with the stated voice or audience in the company block, follow the brand guidance. It is more specific and more recent.`;
}
