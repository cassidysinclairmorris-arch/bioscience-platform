export type BrandProfile = {
  primaryColors: string[];
  secondaryColors: string[];
  fontStyle: "serif" | "sans-serif" | "geometric";
  tone: "clinical" | "modern" | "warm" | "editorial";
  logoDescription: string;
  visualStyle: string;
};

export async function extractBrand(url: string): Promise<BrandProfile> {
  const res = await fetch("/api/brand-image-extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error("Failed to extract brand");
  const profile: BrandProfile = await res.json();
  localStorage.setItem("brandProfile", JSON.stringify(profile));
  return profile;
}

export function loadBrandProfile(): BrandProfile | null {
  try {
    const stored = localStorage.getItem("brandProfile");
    return stored ? (JSON.parse(stored) as BrandProfile) : null;
  } catch {
    return null;
  }
}
