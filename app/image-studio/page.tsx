"use client";

import { useState, useEffect } from "react";
import { extractBrand, loadBrandProfile, BrandProfile } from "@/lib/brandExtractor";
import { generateBrandImage } from "@/lib/generateBrandImage";

function Spinner() {
  return (
    <span style={{ width: 14, height: 14, border: "1.5px solid rgba(26,26,26,0.14)", borderTopColor: "#1A1A1A", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block", flexShrink: 0 }} />
  );
}

function ColorSwatch({ color }: { color: string }) {
  return (
    <span title={color} style={{ display: "inline-block", width: 20, height: 20, borderRadius: 4, background: color, border: "1px solid rgba(26,26,26,0.10)", flexShrink: 0 }} />
  );
}

function BrandPanel({ brand }: { brand: BrandProfile | null }) {
  if (!brand) {
    return (
      <div style={{ padding: "20px 18px", color: "rgba(26,26,26,0.38)", fontSize: 13, lineHeight: 1.6 }}>
        No brand profile loaded. Enter a website URL above to extract one.
      </div>
    );
  }
  return (
    <div style={{ padding: "20px 18px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(26,26,26,0.40)", marginBottom: 8 }}>Visual Style</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A" }}>{brand.visualStyle}</div>
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(26,26,26,0.40)", marginBottom: 8 }}>Primary Colors</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {brand.primaryColors.map(c => <ColorSwatch key={c} color={c} />)}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
          {brand.primaryColors.map(c => <span key={c} style={{ fontSize: 10, color: "rgba(26,26,26,0.45)", fontFamily: "monospace" }}>{c}</span>)}
        </div>
      </div>
      {brand.secondaryColors.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(26,26,26,0.40)", marginBottom: 8 }}>Secondary Colors</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {brand.secondaryColors.map(c => <ColorSwatch key={c} color={c} />)}
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(26,26,26,0.40)", marginBottom: 5 }}>Tone</div>
          <span style={{ fontSize: 12, fontWeight: 500, color: "#1A1A1A", background: "rgba(26,26,26,0.05)", padding: "3px 9px", borderRadius: 20, border: "1px solid rgba(26,26,26,0.10)" }}>{brand.tone}</span>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(26,26,26,0.40)", marginBottom: 5 }}>Font</div>
          <span style={{ fontSize: 12, fontWeight: 500, color: "#1A1A1A", background: "rgba(26,26,26,0.05)", padding: "3px 9px", borderRadius: 20, border: "1px solid rgba(26,26,26,0.10)" }}>{brand.fontStyle}</span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(26,26,26,0.40)", marginBottom: 5 }}>Logo</div>
        <div style={{ fontSize: 12, color: "rgba(26,26,26,0.65)", lineHeight: 1.5 }}>{brand.logoDescription}</div>
      </div>
    </div>
  );
}

export default function ImageStudio() {
  const [urlInput, setUrlInput] = useState("");
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [extractSuccess, setExtractSuccess] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [genError, setGenError] = useState("");

  useEffect(() => {
    setBrand(loadBrandProfile());
  }, []);

  async function handleExtract() {
    if (!urlInput.trim()) return;
    setExtracting(true);
    setExtractError("");
    setExtractSuccess(false);
    try {
      const profile = await extractBrand(urlInput.trim());
      setBrand(profile);
      setExtractSuccess(true);
    } catch {
      setExtractError("Could not extract brand. Check the URL and try again.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setGenError("");
    setImageUrl("");
    try {
      const url = await generateBrandImage(prompt.trim());
      setImageUrl(url);
    } catch {
      setGenError("Image generation failed. Make sure FAL_API_KEY is configured.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ minHeight: "100vh", background: "#F7F6F4", fontFamily: "var(--font-dm-sans, system-ui, sans-serif)" }}>

        {/* Header */}
        <div style={{ borderBottom: "1px solid rgba(26,26,26,0.08)", background: "#FFFFFF", padding: "0 32px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18, fontWeight: 400, color: "#1A1A1A", letterSpacing: "-0.02em" }}>Image Studio</span>
            <span style={{ fontSize: 12, color: "rgba(26,26,26,0.38)", fontWeight: 400 }}>Brand-aware generation</span>
          </div>
        </div>

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px", display: "grid", gridTemplateColumns: "240px 1fr", gap: 20, alignItems: "start" }}>

          {/* Sidebar — Brand Profile */}
          <div style={{ background: "#FFFFFF", border: "1px solid rgba(26,26,26,0.08)", borderRadius: 12, overflow: "hidden", position: "sticky", top: 28 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(26,26,26,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.50)" }}>Brand Profile</span>
              {brand && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2D8A4E", display: "inline-block" }} />}
            </div>
            <BrandPanel brand={brand} />
          </div>

          {/* Main */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Brand Extractor */}
            <div style={{ background: "#FFFFFF", border: "1px solid rgba(26,26,26,0.08)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(26,26,26,0.07)" }}>
                <span style={{ fontSize: 11, fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.50)" }}>Brand Source</span>
              </div>
              <div style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={e => { setUrlInput(e.target.value); setExtractSuccess(false); setExtractError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleExtract()}
                    placeholder="https://example.com"
                    style={{ flex: 1, height: 38, padding: "0 12px", border: "1px solid rgba(26,26,26,0.14)", borderRadius: 8, fontSize: 13, color: "#1A1A1A", outline: "none", background: "#FAFAFA", fontFamily: "inherit" }}
                  />
                  <button
                    onClick={handleExtract}
                    disabled={extracting || !urlInput.trim()}
                    style={{ height: 38, padding: "0 16px", background: extracting ? "rgba(26,26,26,0.06)" : "#1A1A1A", color: extracting ? "rgba(26,26,26,0.40)" : "#FFFFFF", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: extracting || !urlInput.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", fontFamily: "inherit" }}
                  >
                    {extracting && <Spinner />}
                    {extracting ? "Extracting..." : "Extract Brand"}
                  </button>
                </div>
                {extractError && <div style={{ marginTop: 10, fontSize: 12, color: "#C0392B" }}>{extractError}</div>}
                {extractSuccess && brand && (
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "#2D8A4E", fontWeight: 500 }}>Brand extracted — {brand.visualStyle}</span>
                    <div style={{ display: "flex", gap: 5 }}>
                      {brand.primaryColors.map(c => <ColorSwatch key={c} color={c} />)}
                      {brand.secondaryColors.map(c => <ColorSwatch key={c} color={c} />)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Image Generator */}
            <div style={{ background: "#FFFFFF", border: "1px solid rgba(26,26,26,0.08)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(26,26,26,0.07)" }}>
                <span style={{ fontSize: 11, fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.50)" }}>Generate Image</span>
              </div>
              <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                {brand && (
                  <div style={{ fontSize: 12, color: "rgba(26,26,26,0.50)", background: "rgba(26,26,26,0.03)", border: "1px solid rgba(26,26,26,0.07)", borderRadius: 8, padding: "8px 12px", lineHeight: 1.5 }}>
                    Brand context will be prepended: <em style={{ color: "rgba(26,26,26,0.65)" }}>"{brand.visualStyle} style, {brand.primaryColors.slice(0,2).join(" + ")} palette, {brand.tone} tone"</em>
                  </div>
                )}
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="Describe the image you want to generate..."
                  rows={4}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid rgba(26,26,26,0.14)", borderRadius: 8, fontSize: 13, color: "#1A1A1A", outline: "none", background: "#FAFAFA", fontFamily: "inherit", resize: "vertical", lineHeight: 1.55, boxSizing: "border-box" }}
                />
                <div>
                  <button
                    onClick={handleGenerate}
                    disabled={generating || !prompt.trim()}
                    style={{ height: 40, padding: "0 20px", background: generating ? "rgba(26,26,26,0.06)" : "#1A1A1A", color: generating ? "rgba(26,26,26,0.40)" : "#FFFFFF", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: generating || !prompt.trim() ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "inherit" }}
                  >
                    {generating && <Spinner />}
                    {generating ? "Generating..." : "Generate Image"}
                  </button>
                </div>
                {genError && <div style={{ fontSize: 12, color: "#C0392B" }}>{genError}</div>}
              </div>
            </div>

            {/* Result */}
            {(imageUrl || generating) && (
              <div style={{ background: "#FFFFFF", border: "1px solid rgba(26,26,26,0.08)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(26,26,26,0.07)" }}>
                  <span style={{ fontSize: 11, fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.50)" }}>Result</span>
                </div>
                <div style={{ padding: 20 }}>
                  {generating && !imageUrl && (
                    <div style={{ height: 320, background: "rgba(26,26,26,0.03)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "rgba(26,26,26,0.40)", fontSize: 13 }}>
                      <Spinner /> Generating image...
                    </div>
                  )}
                  {imageUrl && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <img
                        src={imageUrl}
                        alt="Generated"
                        style={{ width: "100%", maxWidth: 560, borderRadius: 8, border: "1px solid rgba(26,26,26,0.08)", display: "block" }}
                      />
                      <a
                        href={imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 12, color: "rgba(26,26,26,0.50)", textDecoration: "underline", cursor: "pointer" }}
                      >
                        Open full size
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
