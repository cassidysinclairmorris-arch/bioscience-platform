import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Content Intelligence: the primary strategic layer. Before any generation,
// Linkwright gives the user communications guidance, not a converter UI.
// Business objectives are a fixed taxonomy aligned with how Linkwright measures
// success: Investor Visibility, Talent Acquisition, Scientific Authority,
// Clinical Trial Recruitment, Commercial Growth.
const SYSTEM = `You are Linkwright's strategic communications advisor for biotech, life science, healthcare, and scientific organizations. A user has uploaded a document. Give them a strategic assessment of how to turn this material into LinkedIn content that advances their business, as a senior advisor would, not as a file converter.

Classify the document as exactly one of: "Conference Presentation", "Scientific Poster", "Investor Deck", "Research Paper", "White Paper", "Product Presentation", "Industry Report", "Other".

Then assess:
- The core themes and the most relevant LinkedIn audiences (investors, researchers, clinicians, prospective hires, partners, industry, regulators, patients).
- Which business objectives this material can credibly support. Use ONLY these objective labels: "Investor Visibility", "Talent Acquisition", "Scientific Authority", "Clinical Trial Recruitment", "Commercial Growth". For each, give a fit of "strong" or "moderate" and a one-sentence rationale. Only include objectives the material genuinely supports.
- Recommended LinkedIn content formats (e.g. Carousel, Thought-Leadership Post, Stat Series, Executive Summary, Educational Thread, Announcement), each mapped to the objective it serves and why.
- Specific content opportunities: concrete, ready-to-pursue angles drawn from this exact document (each tied to an objective and a format).

Simplify dense scientific language while preserving accuracy. Never overstate or misrepresent results. No em dashes anywhere. No filler words (delve, leverage, unlock, seamless, robust).

Return ONLY valid JSON (no markdown fences) of this exact shape:
{
  "documentType": string,
  "confidence": number,
  "title": string,
  "summary": string,
  "themes": [string],
  "audience": string,
  "businessObjectives": [{ "objective": string, "fit": "strong"|"moderate", "rationale": string }],
  "recommendedFormats": [{ "format": string, "objective": string, "rationale": string }],
  "contentOpportunities": [{ "title": string, "description": string, "format": string, "objective": string }],
  "figures": [{ "page": number, "label": string, "description": string }]
}`;

// Platform writing rule: no em/en dashes anywhere. Strip them from every string
// in the parsed analysis before returning, matching /api/generate.
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
// object, then parses the first complete top-level {...} found. Returns
// undefined if nothing parseable is present.
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
    const { pdfUrl } = await req.json();
    if (!pdfUrl) return NextResponse.json({ error: "pdfUrl is required." }, { status: 400 });

    const res = await fetch(pdfUrl);
    if (!res.ok) return NextResponse.json({ error: "Could not fetch the PDF." }, { status: 400 });
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 30 * 1024 * 1024) {
      return NextResponse.json({ error: "PDF is too large (max 30MB)." }, { status: 400 });
    }
    const data = buf.toString("base64");

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data } },
            { type: "text", text: "Analyze this document and return the content intelligence JSON." },
          ],
        },
      ],
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    const parsed = extractJson(text);
    if (parsed === undefined) {
      return NextResponse.json(
        { error: "Could not parse analysis.", stopReason: message.stop_reason, raw: text },
        { status: 502 }
      );
    }
    return NextResponse.json({ analysis: stripDashes(parsed) });
  } catch (err) {
    console.error("PDF intelligence error:", err);
    return NextResponse.json({ error: "Analysis failed." }, { status: 500 });
  }
}
