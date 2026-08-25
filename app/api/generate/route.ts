import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getLinkedInTrends } from "@/lib/linkedin-trends";
import { getBrandKitSystemPrompt, loadBrandKit } from "@/lib/system-prompts";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// The task for this specific post. Who the company is and how they sound now
// lives in the system prompt, built from their Brand Center.
const TASK = (company: Record<string, unknown>, pillar: Record<string, unknown>, trends: string) => `Write a single LinkedIn post for ${company.name}.

Key brand phrases: ${(company.brand as { keyPhrases?: string[] })?.keyPhrases?.join(" / ") ?? "(none provided)"}

CURRENT LINKEDIN ALGORITHM CONTEXT (April 2026):
${trends}

Rules:
- 150-220 words
- No external links in the post body
- 3-4 targeted hashtags at the end
- Hook in the FIRST 2 LINES before the LinkedIn "see more" cutoff — this must stop the scroll. Use the algorithm context above to craft a hook style that is currently performing well.
- End with a genuine, specific open question that invites real professional comment
- Stay completely true to the brand voice and guidelines in the system prompt
- Apply the current LinkedIn best practices from the context above
- Write only the post text — no preamble, no quotes around it, no subject line
- CRITICAL FORMATTING RULE: Never use em dashes (—) anywhere in the post. This is absolute. Use alternative punctuation instead — commas, periods, colons, or restructure the sentence. Zero em dashes in any generated post.`;

export async function POST(req: NextRequest) {
  try {
    const { company, pillar, clientId } = await req.json();

    const industry = (pillar?.type as string) || "biotech";
    const audience = (company?.audience as string) || "Life science executives";
    const timezone = (company?.timezone as string) || "EST";

    // The studio posts the whole company object; clientId is accepted too so the
    // route can be called with just an id.
    const id = (clientId as string) || (company?.id as string) || null;
    const brandKit = await loadBrandKit(id);

    const systemPrompt = getBrandKitSystemPrompt(
      { name: company?.name, tagline: company?.tagline, voice: company?.voice, audience: company?.audience },
      brandKit,
      pillar,
    );

    // Fetch current LinkedIn trends (24h cached)
    const trends = await getLinkedInTrends(industry, audience, timezone);
    const task = TASK(company ?? {}, pillar ?? {}, trends);

    // Try with web search first; fall back to plain generation if unavailable
    try {
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{
          role: "user",
          content: `Use web search to find any recent news, studies, or developments relevant to this company and topic, then weave that current context naturally into the post if it adds credibility.\n\n${task}`,
        }],
      });

      const raw = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map(b => b.text)
        .join("");
      const content = raw.replace(/—/g, ",").replace(/–/g, ",");

      return NextResponse.json({ content });
    } catch {
      // Web search not available — fall back to standard generation
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: task }],
      });

      const raw = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map(b => b.text)
        .join("");
      const content = raw.replace(/—/g, ",").replace(/–/g, ",");

      return NextResponse.json({ content });
    }
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
