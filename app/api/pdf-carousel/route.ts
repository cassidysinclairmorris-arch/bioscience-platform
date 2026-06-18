import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Objective-driven framing: the chosen business objective sets the angle of the
// entire narrative, not just the copy. Generation is led by strategy.
const OBJECTIVE_FRAMING: Record<string, string> = {
  "Investor Visibility":
    "Frame for investors: market opportunity, differentiated technology, milestones and traction, and the scale of the potential impact. Confident, credible, forward-looking.",
  "Talent Acquisition":
    "Frame for prospective hires: the mission, the hard problem worth solving, the caliber of the science and team, and why exceptional people should join. Aspirational and human.",
  "Scientific Authority":
    "Frame for researchers and peers: rigor, the key finding, the strength of the evidence, and a credible point of view that positions the organization as a leader. Precise, never overstated.",
  "Clinical Trial Recruitment":
    "Frame for patients and referring clinicians: the condition, who may be eligible, why participation matters, and a clear next step. Accurate and compliant. Make no medical promises or guarantees of benefit.",
  "Commercial Growth":
    "Frame for buyers and partners: the problem the offering solves, the differentiated outcome, and the proof. Outcome-led and concrete.",
};

// Rewrites a scientific/biotech document into a LinkedIn-optimized carousel
// narrative (not a page dump), led by the selected business objective.
function buildSystem(documentType: string, chartMode: string, businessObjective: string, format: string): string {
  const objective = OBJECTIVE_FRAMING[businessObjective] ? businessObjective : "";
  const framing = objective
    ? `\n\nPRIMARY BUSINESS OBJECTIVE: "${objective}". ${OBJECTIVE_FRAMING[objective]} Every slide must serve this objective.`
    : "";
  return `You are Linkwright's senior LinkedIn content strategist for biotech, life science, healthcare, and scientific organizations.

Transform the document (classified as "${documentType || "Other"}", target format "${format || "Carousel"}") into a LinkedIn carousel that an executive would be proud to post. Do NOT simply convert pages. Rewrite into a narrative arc:${framing}

Slide 1: Hook  (a scroll-stopping statement, 5 to 9 words)
Slide 2: Problem  (the gap or challenge this work addresses)
Slide 3: Context  (why it matters now, for the audience)
Slide 4: Key Finding  (the single most important result, in plain language)
Slide 5: Evidence  (supporting data or method, simplified, accurate)
Slide 6: Implications  (what this means for the field, patients, investors, or industry)
Slide 7: Call to Action  (a clear next step)

Document-type guidance:
- Scientific Poster / Research Paper: convert Abstract, Methods, Findings, Implications into an executive-friendly, educational arc. Simplify jargon but never overstate or misrepresent results.
- Investor Deck: extract Market opportunity, Technology, Milestones, Impact into a company-visibility / thought-leadership arc.
- White Paper / Industry Report: convert into an industry-education arc with a credible point of view.
- Product Presentation: lead with the problem it solves and the differentiated outcome.

Rules:
- Simplify dense scientific language while preserving accuracy. Never invent data.
- Each slide: a short headline (max ~8 words) and a body (max ~30 words).
- If a slide is best supported by a figure/chart in the document, set "figurePage" to that page number; else null.
- "stat" holds a single standout number for that slide if one exists (e.g. "73% reduction"), else null.
- No em dashes anywhere. No AI filler words (delve, leverage, unlock, seamless, robust).
- Chart handling mode is "${chartMode}". When it is "summary" or "both", make figure-backed slides carry the key stat in "stat". When it is "original" or "both", still set "figurePage" so the original figure can be shown.

Return ONLY valid JSON (no markdown fences) of this exact shape:
{
  "slides": [
    { "role": "Hook"|"Problem"|"Context"|"Key Finding"|"Evidence"|"Implications"|"Call to Action",
      "headline": string, "body": string, "stat": string|null, "figurePage": number|null }
  ],
  "post": { "copy": string, "headline": string, "cta": string } | null,
  "figures": [{ "page": number, "label": string }]
}`;
}

// Platform writing rule: no em/en dashes anywhere. Strip them from every string
// in the parsed result before persistence, matching /api/generate.
function stripDashes<T>(value: T): T {
  if (typeof value === "string") {
    return value.replace(/—/g, ",").replace(/–/g, ",") as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => stripDashes(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = stripDashes(v);
    return out as T;
  }
  return value;
}

// Tolerant JSON extraction: strips markdown fences and any prose around the
// object, then parses the first complete top-level {...} found.
function extractJson(raw: string): unknown {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    /* fall through to brace-scan */
  }
  const start = cleaned.indexOf("{");
  if (start === -1) return undefined;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(cleaned.slice(start, i + 1)); }
        catch { return undefined; }
      }
    }
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { pdfUrl, mode, chartMode, documentType, businessObjective, format } = await req.json();
    if (!pdfUrl) return NextResponse.json({ error: "pdfUrl is required." }, { status: 400 });
    const wantPost = mode === "post_carousel";

    const res = await fetch(pdfUrl);
    if (!res.ok) return NextResponse.json({ error: "Could not fetch the PDF." }, { status: 400 });
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 30 * 1024 * 1024) {
      return NextResponse.json({ error: "PDF is too large (max 30MB)." }, { status: 400 });
    }
    const data = buf.toString("base64");

    const instruction = wantPost
      ? "Produce the carousel slides AND a LinkedIn post: set \"post\" with copy (the post text), a suggested headline, and a CTA."
      : "Produce the carousel slides. Set \"post\" to null.";

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: buildSystem(documentType, chartMode || "summary", businessObjective || "", format || "Carousel"),
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data } },
            { type: "text", text: instruction },
          ],
        },
      ],
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    const result = extractJson(text);
    if (result === undefined) {
      return NextResponse.json(
        { error: "Could not parse carousel.", stopReason: message.stop_reason, raw: text },
        { status: 502 }
      );
    }
    return NextResponse.json(stripDashes(result));
  } catch (err) {
    console.error("PDF carousel error:", err);
    return NextResponse.json({ error: "Carousel generation failed." }, { status: 500 });
  }
}
