import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) return NextResponse.json({ error: "Prompt required" }, { status: 400 });

    const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: {
        Authorization: `Key ${process.env.FAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_size: "square_hd",
        num_inference_steps: 4,
        num_images: 1,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Fal.ai error:", err);
      return NextResponse.json({ error: "Fal.ai request failed" }, { status: 500 });
    }

    const data = await res.json();
    const imageUrl = data.images?.[0]?.url;
    if (!imageUrl) return NextResponse.json({ error: "No image returned" }, { status: 500 });

    return NextResponse.json({ url: imageUrl });
  } catch (error) {
    console.error("Fal image error:", error);
    return NextResponse.json({ error: "Image generation failed" }, { status: 500 });
  }
}
