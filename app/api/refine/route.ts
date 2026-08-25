import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getLinkedInTrends } from "@/lib/linkedin-trends";
import { getBrandKitSystemPrompt, loadBrandKit } from "@/lib/system-prompts";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { company, pillar, currentPost, request, clientId } = await req.json();

    const industry = (pillar?.type as string) || "biotech";
    const audience = (company?.audience as string) || "Life science executives";
    const timezone = (company?.timezone as string) || "EST";

    const trends = await getLinkedInTrends(industry, audience, timezone);

    // Who the client is and how they sound comes from their Brand Center, in the
    // system prompt. The user message carries only the post and the edit.
    const id = (clientId as string) || (company?.id as string) || null;
    const systemPrompt = getBrandKitSystemPrompt(
      { name: company?.name, tagline: company?.tagline, voice: company?.voice, audience: company?.audience },
      await loadBrandKit(id),
      pillar,
    );

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: `Edit this LinkedIn post for ${company.name}.

ORIGINAL POST:
${currentPost}

KEY BRAND PHRASES: ${company.brand?.keyPhrases?.join(" / ") ?? ""}

CURRENT LINKEDIN ALGORITHM CONTEXT (April 2026):
${trends}

EDIT REQUEST: ${request}

Instructions:
- Apply the edit request faithfully
- Keep the brand voice, guidelines, and audience from the system prompt
- Maintain 150-220 words unless the request specifically asks for a length change
- Keep hashtags at the end (3-4)
- Keep the strong hook in the first 2 lines
- Apply current LinkedIn best practices where relevant
- Write only the revised post text — no preamble, no explanation of changes
- CRITICAL FORMATTING RULE: Never use em dashes (—) anywhere in the post. This is absolute. Use alternative punctuation instead — commas, periods, colons, or restructure the sentence. Zero em dashes in any generated post.`,
      }],
    });

    const raw = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("");
    const content = raw.replace(/—/g, ",").replace(/–/g, ",");

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Refine error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
