import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getLinkedInTrends } from "@/lib/linkedin-trends";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT = (company: Record<string, unknown>, pillar: Record<string, unknown>, trends: string) => `You are an expert science communicator and LinkedIn strategist for bioscience companies.

Write a single LinkedIn post for ${company.name}.

Company: ${company.name}
Tagline: ${company.tagline}
Brand voice: ${company.voice}
Target audience: ${company.audience}
Post type: ${pillar.type}
Scheduled day: ${pillar.day}
Content direction: ${pillar.example}
Key brand phrases: ${(company.brand as { keyPhrases?: string[] })?.keyPhrases?.join(" / ") ?? ""}

CURRENT LINKEDIN ALGORITHM CONTEXT (April 2026):
${trends}

Rules:
- 150-220 words
- No external links in the post body
- 3-4 targeted hashtags at the end
- Hook in the FIRST 2 LINES before the LinkedIn "see more" cutoff — this must stop the scroll. Use the algorithm context above to craft a hook style that is currently performing well.
- End with a genuine, specific open question that invites real professional comment
- Stay completely true to the brand voice described above
- Apply the current LinkedIn best practices from the context above
- Write only the post text — no preamble, no quotes around it, no subject line`;

export async function POST(req: NextRequest) {
  try {
    const { company, pillar } = await req.json();

    const industry = (pillar?.type as string) || "biotech";
    const audience = (company?.audience as string) || "Life science executives";
    const timezone = (company?.timezone as string) || "EST";

    // Fetch current LinkedIn trends (24h cached)
    const trends = await getLinkedInTrends(industry, audience, timezone);

    // Try with web search first; fall back to plain generation if unavailable
    try {
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{
          role: "user",
          content: `You are an expert science communicator and LinkedIn strategist for bioscience companies. Use web search to find any recent news, studies, or developments relevant to this company and topic — then weave that current context naturally into the post if it adds credibility.\n\n${PROMPT(company, pillar, trends)}`,
        }],
      });

      const content = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map(b => b.text)
        .join("");

      return NextResponse.json({ content });
    } catch {
      // Web search not available — fall back to standard generation
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: PROMPT(company, pillar, trends) }],
      });

      const content = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map(b => b.text)
        .join("");

      return NextResponse.json({ content });
    }
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
