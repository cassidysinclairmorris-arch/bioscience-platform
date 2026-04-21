import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { company, pillar, currentPost, request } = await req.json();

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `You are an expert LinkedIn strategist editing a post for ${company.name}.

ORIGINAL POST:
${currentPost}

BRAND VOICE: ${company.voice}
TARGET AUDIENCE: ${company.audience}
POST TYPE: ${pillar.type}
KEY BRAND PHRASES: ${company.brand?.keyPhrases?.join(" / ") ?? ""}

EDIT REQUEST: ${request}

Instructions:
- Apply the edit request faithfully
- Keep the same brand voice and audience in mind
- Maintain 150-220 words unless the request specifically asks for a length change
- Keep hashtags at the end (3-4)
- Keep the strong hook in the first 2 lines
- Write only the revised post text — no preamble, no explanation of changes`,
      }],
    });

    const content = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("");

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Refine error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
