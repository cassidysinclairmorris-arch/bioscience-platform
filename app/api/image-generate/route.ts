import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { getLinkedInTrends } from "@/lib/linkedin-trends";
import { readBrand, getBrandBlock } from "@/lib/brand-context";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(
  company: Record<string, unknown>,
  pillar: Record<string, unknown>,
  visualType: string,
  postContent: string,
  trends: string,
  editRequest?: string
): string {
  const { accent, dark } = readBrand(company);
  const excerpt = (postContent || String(pillar.example || "")).slice(0, 220);

  const typeDir: Record<string, string> = {
    quote:   `Bold typographic quote card. Extract the single most powerful statement from: "${excerpt}". Large display typography — 2–3 key words in ${accent}, rest in the dark/light palette. Premium editorial feel, generous negative space.`,
    stat:    `Data visualisation card. Extract the single most impactful statistic or number from: "${excerpt}". Hero number rendered large in ${accent}. Minimal supporting context beneath. Clean geometric data element (arc, ring, or line).`,
    brand:   `Brand statement card. Core message: "${excerpt}". Dominant typographic layout — bold headline using ${dark} or ${accent}, premium composition. Pure type and colour, no product imagery.`,
    science: `Scientific concept visual. Visualise the mechanism in: "${excerpt}". Abstract biological or molecular geometry — circles, pathways, arrows — in brand palette. Clinical precision, premium design quality.`,
    photo:   `Cinematic, photorealistic professional photograph. Context: "${excerpt}". Premium biotech laboratory or clinical research environment. Warm natural light, shallow depth of field. No text, no logos, no watermarks. Shot like an Apple or Patagonia campaign.`,
  };

  // Shared brand block — stored brand_prompt > dynamic context (same source as SVG route)
  const brandBlock = getBrandBlock(company);

  const base = `${brandBlock}

VISUAL TYPE: ${(typeDir[visualType] || typeDir.brand)}

LINKEDIN FORMAT: Square 1:1, scroll-stopping first frame, bold typographic hierarchy. ${trends ? `CURRENT CONTEXT: ${trends.slice(0, 180)}` : ""}

OUTPUT REQUIREMENTS: Exactly 1 image. Professional LinkedIn B2B quality. No UI chrome, no device frames. Execute the brand brief precisely.`;

  const full = editRequest ? `${base}\n\nSPECIFIC CHANGE REQUEST: ${editRequest}` : base;

  console.log("[image-generate] Full prompt (" + full.length + " chars):\n" + full.slice(0, 600) + (full.length > 600 ? "…" : ""));

  return full;
}

// ── Ideogram v2 ───────────────────────────────────────────────────────────────
async function generateIdeogram(prompt: string): Promise<string> {
  const apiKey = process.env.IDEOGRAM_API_KEY;
  if (!apiKey) throw new Error("IDEOGRAM_API_KEY not set");

  console.log("[Ideogram] Request:", prompt.slice(0, 180));

  const res = await fetch("https://api.ideogram.ai/generate", {
    method: "POST",
    headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      image_request: {
        prompt,
        aspect_ratio: "ASPECT_1_1",
        model: "V_2",
        style_type: "DESIGN",
        magic_prompt_option: "ON",
        negative_prompt: "logo, wordmark, company name as logo, watermark, blurry, low quality, garbled text, illegible text, generic stock photo feel, clip art, template aesthetic",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[Ideogram] HTTP error:", res.status, err);
    throw new Error(`Ideogram ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  console.log("[Ideogram] Response keys:", Object.keys(data), "data[0]:", JSON.stringify(data?.data?.[0]).slice(0, 200));

  const url = data?.data?.[0]?.url;
  if (!url) throw new Error("Ideogram returned no image URL");
  return url as string;
}

// ── Flux 1.1 Pro ──────────────────────────────────────────────────────────────
async function generateFlux(prompt: string): Promise<string> {
  if (!process.env.REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN not set");

  console.log("[Flux] Request:", prompt.slice(0, 180));

  const output = await replicate.run("black-forest-labs/flux-1.1-pro", {
    input: {
      prompt,
      width: 1080,
      height: 1080,
      output_format: "jpg",
      output_quality: 90,
    },
  });

  console.log("[Flux] Output:", JSON.stringify(output).slice(0, 200));

  // output can be a string URL or an array
  const url = Array.isArray(output) ? output[0] : output;
  if (!url || typeof url !== "string") throw new Error("Flux returned no URL");
  return url;
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { company, pillar, visualType, postContent, editRequest } = await req.json();

    const industry = (pillar?.type  as string) || "biotech";
    const audience = (company?.audience as string) || "Life science executives";
    const timezone = (company?.timezone as string) || "EST";

    // Fetch current LinkedIn trends (cached 24h)
    const trends = await getLinkedInTrends(industry, audience, timezone);
    console.log("[image-generate] Trends snippet:", trends.slice(0, 100));

    const prompt = buildPrompt(company, pillar, visualType || "brand", postContent || "", trends, editRequest);

    // Auto-route: science/photo → Flux first; quote/stat/brand → Ideogram first
    const fluxFirst = ["science", "photo"].includes(visualType);

    if (fluxFirst) {
      try {
        const imageUrl = await generateFlux(prompt);
        return NextResponse.json({ imageUrl, provider: "Flux", prompt });
      } catch (e1) {
        console.error("[Flux] primary failed:", e1);
        try {
          const imageUrl = await generateIdeogram(prompt);
          return NextResponse.json({ imageUrl, provider: "Ideogram (fallback)", prompt });
        } catch (e2) {
          console.error("[Ideogram] fallback failed:", e2);
          return NextResponse.json({ error: "Both image providers failed", imageUrl: null }, { status: 502 });
        }
      }
    } else {
      try {
        const imageUrl = await generateIdeogram(prompt);
        return NextResponse.json({ imageUrl, provider: "Ideogram", prompt });
      } catch (e1) {
        console.error("[Ideogram] primary failed:", e1);
        try {
          const imageUrl = await generateFlux(prompt);
          return NextResponse.json({ imageUrl, provider: "Flux (fallback)", prompt });
        } catch (e2) {
          console.error("[Flux] fallback failed:", e2);
          return NextResponse.json({ error: "Both image providers failed", imageUrl: null }, { status: 502 });
        }
      }
    }
  } catch (error) {
    console.error("[image-generate] Unhandled error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
