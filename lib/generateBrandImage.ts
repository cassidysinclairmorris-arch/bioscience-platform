import { loadBrandProfile } from "./brandExtractor";

export async function generateBrandImage(userPrompt: string): Promise<string> {
  const brand = loadBrandProfile();

  const prompt = brand
    ? `Image in the visual style of ${brand.visualStyle}, using color palette ${brand.primaryColors.join(", ")}, ${brand.tone} tone. ${userPrompt}`
    : userPrompt;

  const res = await fetch("/api/fal-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) throw new Error("Image generation failed");
  const { url } = await res.json();
  return url;
}
