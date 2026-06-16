import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { prompt, brandColors, brandTone, brandVisualStyle } = await req.json();
    if (!prompt) return NextResponse.json({ error: "Prompt required" }, { status: 400 });

    const c0 = brandColors?.[0] || "#1A3D4F";
    const c1 = brandColors?.[1] || "#0A0A0A";

    const constructed = `Ultra high quality commercial photography style. Visual aesthetic: ${brandVisualStyle || "premium editorial minimalism"}. Color palette dominated by ${c0} and ${c1}. Mood: ${(brandTone || "modern professional").slice(0, 120)}. Professional LinkedIn marketing asset. No text, no logos, no watermarks. Cinematic lighting, shallow depth of field, premium production quality. ${prompt}`;

    const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: {
        Authorization: `Key ${process.env.FAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: constructed,
        image_size: "square_hd",
        num_inference_steps: 12,
        num_images: 1,
        enable_safety_checker: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Fal error:", err);
      return NextResponse.json({ error: "Image API failed" }, { status: 500 });
    }

    const data = await res.json();
    const url = data.images?.[0]?.url;
    if (!url) return NextResponse.json({ error: "No image returned" }, { status: 500 });

    return NextResponse.json({ url });
  } catch (e) {
    console.error("generate-image error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
