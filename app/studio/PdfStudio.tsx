"use client";

import { useRef, useState } from "react";
import type { Company, Pillar } from "@/lib/companies";
import { rasterizePdfPage } from "@/lib/pdf-raster";

// ── Brand tokens (kept local so this component is self-contained) ──
const RED = "#E30000";
const INK = "#0A0A0A";
const BG = "#F5F5F5";
const BORDER = "#E5E5E5";
const MUTED = "#999999";
const DISPLAY = "var(--font-raleway), sans-serif";

// The fixed business-objective taxonomy. Generation is led by the user's choice.
const OBJECTIVES = [
  "Investor Visibility",
  "Talent Acquisition",
  "Scientific Authority",
  "Clinical Trial Recruitment",
  "Commercial Growth",
] as const;

const FORMATS = ["Carousel", "Carousel + Post"] as const;

// Production upload ceiling: Vercel serverless functions cap the request body at
// ~4.5MB. Guard below that so the user gets a clear message instead of an opaque
// upload failure. (Lifting this needs direct-to-Blob upload, deferred.)
const MAX_PDF_BYTES = 4.4 * 1024 * 1024;

type Fit = "strong" | "moderate";
type Analysis = {
  documentType: string;
  confidence: number;
  title: string;
  summary: string;
  themes: string[];
  audience: string;
  businessObjectives: { objective: string; fit: Fit; rationale: string }[];
  recommendedFormats: { format: string; objective: string; rationale: string }[];
  contentOpportunities: { title: string; description: string; format: string; objective: string }[];
  figures: { page: number; label: string; description: string }[];
};
type Slide = {
  role: string;
  headline: string;
  body: string;
  stat: string | null;
  figurePage: number | null;
};
type Carousel = {
  slides: Slide[];
  post: { copy: string; headline: string; cta: string } | null;
  figures: { page: number; label: string }[];
};

export type GeneratedAsset = {
  kind: "image" | "svg";
  source: "generated" | "uploaded";
  previewUrl: string;
  blobUrl?: string;
  mime?: string;
  assetTitle?: string;
};

type Stage = "idle" | "uploading" | "analyzing" | "analyzed" | "generating";

function visualTypeForRole(role: string, hasStat: boolean): "quote" | "stat" | "brand" | "science" | "photo" {
  if (hasStat && (role === "Key Finding" || role === "Evidence")) return "stat";
  if (role === "Hook" || role === "Call to Action") return "quote";
  if (role === "Key Finding" || role === "Evidence") return "science";
  return "brand";
}

export default function PdfStudio({
  company,
  pillar,
  onAddAssets,
  onPostCopy,
  notify,
  remainingSlots,
}: {
  company: Company;
  pillar: Pillar;
  onAddAssets: (assets: GeneratedAsset[]) => void;
  onPostCopy: (copy: string) => void;
  notify: (m: string, t?: "default" | "success" | "error") => void;
  remainingSlots: number;
}) {
  const [stage, setStage] = useState<Stage>("idle");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [objective, setObjective] = useState<string>("");
  const [format, setFormat] = useState<(typeof FORMATS)[number]>("Carousel");
  const [chartMode, setChartMode] = useState<"original" | "summary" | "both">("summary");
  const [progress, setProgress] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const busy = stage === "uploading" || stage === "analyzing" || stage === "generating";

  const reset = () => {
    setStage("idle"); setPdfUrl(""); setPdfName(""); setAnalysis(null);
    setObjective(""); setFormat("Carousel"); setChartMode("summary"); setProgress("");
  };

  // 1) Upload → 2) Content Intelligence (the primary experience).
  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== "application/pdf") { notify("Please upload a PDF.", "error"); return; }
    if (file.size > MAX_PDF_BYTES) {
      notify(
        `This PDF is ${(file.size / 1024 / 1024).toFixed(1)}MB. Uploads are currently limited to about 4MB. Please compress or split the document and try again.`,
        "error"
      );
      return;
    }
    try {
      setStage("uploading"); setProgress("Uploading document…");
      const fd = new FormData(); fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const upd = await up.json();
      if (!up.ok || !upd.url) { notify(upd.error || "Upload failed", "error"); setStage("idle"); return; }
      setPdfUrl(upd.url); setPdfName(file.name);

      setStage("analyzing"); setProgress("Reading the document and assessing strategy…");
      const an = await fetch("/api/pdf-intelligence", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl: upd.url }),
      });
      const data = await an.json();
      if (!an.ok || !data.analysis) { notify(data.error || "Analysis failed", "error"); setStage("idle"); return; }
      const a = data.analysis as Analysis;
      setAnalysis(a);
      // Pre-select the strongest supported objective; user can override.
      const strong = a.businessObjectives?.find((o) => o.fit === "strong") || a.businessObjectives?.[0];
      setObjective(strong?.objective || OBJECTIVES[0]);
      setStage("analyzed");
      setProgress("");
    } catch {
      notify("Something went wrong analyzing the document.", "error");
      setStage("idle");
    }
  };

  // 3) Objective-driven generation → branded SVG slides (+ optional original figures) → tray.
  const generate = async () => {
    if (!analysis || !pdfUrl) return;
    try {
      setStage("generating"); setProgress("Writing the narrative…");
      const car = await fetch("/api/pdf-carousel", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfUrl,
          mode: format === "Carousel + Post" ? "post_carousel" : "carousel",
          chartMode,
          documentType: analysis.documentType,
          businessObjective: objective,
          format,
        }),
      });
      const cd = await car.json();
      if (!car.ok || !Array.isArray(cd.slides)) { notify(cd.error || "Generation failed", "error"); setStage("analyzed"); return; }
      const carousel = cd as Carousel;

      // Render each slide. chartMode decides whether a figure slide shows the
      // branded summary (SVG), the original figure (rasterized), or both.
      // We track failures so a partial carousel is never created silently.
      const assets: GeneratedAsset[] = [];
      let failed = 0; // intended slide visuals that did not render
      for (let i = 0; i < carousel.slides.length; i++) {
        const s = carousel.slides[i];
        setProgress(`Designing slide ${i + 1} of ${carousel.slides.length}…`);
        const showOriginal = s.figurePage != null && (chartMode === "original" || chartMode === "both");
        const showSummary = !(s.figurePage != null && chartMode === "original");

        if (showSummary) {
          const svg = await renderSlideSvg(company, pillar, s);
          if (svg) {
            assets.push({
              kind: "svg", source: "generated",
              previewUrl: `data:image/svg+xml,${encodeURIComponent(svg)}`,
              assetTitle: `${s.role}: ${s.headline}`.slice(0, 80),
            });
          } else {
            failed++;
          }
        }
        if (showOriginal && s.figurePage != null) {
          try {
            const raster = await rasterizePdfPage(pdfUrl, s.figurePage, { maxEdge: 1600 });
            if (raster) {
              assets.push({
                kind: "image", source: "generated",
                previewUrl: raster.dataUrl, mime: "image/png",
                assetTitle: `Figure (p.${s.figurePage})`,
              });
            } else {
              failed++;
            }
          } catch { failed++; }
        }
      }

      if (assets.length === 0) {
        notify("No slides rendered. Please try generating again.", "error");
        setStage("analyzed"); setProgress("");
        return;
      }

      const capped = assets.slice(0, Math.max(0, remainingSlots));
      const droppedForLimit = assets.length - capped.length;
      onAddAssets(capped);
      if (carousel.post?.copy) onPostCopy(carousel.post.copy);

      const intended = assets.length + failed;
      if (failed > 0 || droppedForLimit > 0) {
        const reasons: string[] = [];
        if (failed > 0) reasons.push(`${failed} failed to render`);
        if (droppedForLimit > 0) reasons.push(`${droppedForLimit} dropped (10-asset limit)`);
        // Warn, not silent: the user must know the carousel is incomplete.
        notify(
          `Added ${capped.length} of ${intended} slides — ${reasons.join("; ")}. Review the tray before saving, or regenerate.`,
          "error"
        );
      } else {
        notify(`Added ${capped.length} slides to Visual Assets.`, "success");
      }
      setStage("analyzed");
      setProgress("");
    } catch {
      notify("Slide generation failed.", "error");
      setStage("analyzed");
    }
  };

  async function renderSlideSvg(c: Company, p: Pillar, s: Slide): Promise<string | null> {
    const postContent = [s.headline, s.body, s.stat].filter(Boolean).join(" — ").replace(/—/g, ",");
    const r = await fetch("/api/visual", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: c, pillar: p,
        visualType: visualTypeForRole(s.role, !!s.stat),
        postContent,
      }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.svg || null;
  }

  // ── Render ──
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Upload zone */}
      {stage === "idle" || !analysis ? (
        <button
          onClick={() => !busy && fileRef.current?.click()}
          disabled={busy}
          style={{
            border: `1.5px dashed ${BORDER}`, borderRadius: 14, background: "#fff",
            padding: "44px 24px", cursor: busy ? "default" : "pointer", textAlign: "center",
            fontFamily: "inherit", transition: "border-color .15s, background .15s",
          }}
          onMouseEnter={(e) => { if (!busy) e.currentTarget.style.borderColor = RED; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; }}
        >
          <div style={{ fontFamily: DISPLAY, fontWeight: 300, fontSize: 18, color: INK, marginBottom: 6 }}>
            {busy ? progress : "Upload a document"}
          </div>
          <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.6 }}>
            {busy ? "One moment…" : "Drop a poster, paper, deck, white paper, or report (PDF). We assess it before generating anything."}
          </div>
          <input
            ref={fileRef} type="file" accept="application/pdf,.pdf" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; handleFile(f || undefined); }}
          />
        </button>
      ) : null}

      {/* CONTENT INTELLIGENCE — the primary experience */}
      {analysis && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Header / classification */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: RED, marginBottom: 8 }}>
                Content Intelligence
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ fontFamily: DISPLAY, fontWeight: 300, fontSize: 22, color: INK }}>{analysis.documentType}</span>
                <span style={{ fontSize: 11, color: MUTED }}>{Math.round((analysis.confidence || 0) * 100)}% confidence</span>
              </div>
              {analysis.title ? <div style={{ fontSize: 13, color: INK, marginBottom: 4 }}>{analysis.title}</div> : null}
              {pdfName ? <div style={{ fontSize: 11, color: MUTED }}>{pdfName}</div> : null}
            </div>
            <button onClick={reset} disabled={busy}
              style={{ fontSize: 11, color: MUTED, background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 10px", cursor: busy ? "default" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              ↺ New document
            </button>
          </div>

          {analysis.summary ? (
            <p style={{ fontSize: 13, lineHeight: 1.7, color: "#444", margin: 0 }}>{analysis.summary}</p>
          ) : null}

          {/* Audience + themes */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {analysis.audience ? (
              <span style={{ fontSize: 11, color: INK }}>
                <span style={{ color: MUTED }}>Audience: </span>{analysis.audience}
              </span>
            ) : null}
            {(analysis.themes || []).map((t) => (
              <span key={t} style={{ fontSize: 10, padding: "3px 9px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 5, color: "#555", letterSpacing: "0.04em" }}>{t}</span>
            ))}
          </div>

          {/* Business objectives this can serve */}
          {analysis.businessObjectives?.length ? (
            <Section label="What this can do for you">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {analysis.businessObjectives.map((o) => (
                  <div key={o.objective} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                    <span style={{ width: 5, height: 5, borderRadius: 9, background: o.fit === "strong" ? RED : "#C9C9C9", flexShrink: 0, transform: "translateY(-1px)" }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 12.5, color: INK }}>{o.objective}</span>
                      <span style={{ fontSize: 10, color: o.fit === "strong" ? RED : MUTED, marginLeft: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>{o.fit}</span>
                      <div style={{ fontSize: 11.5, color: "#666", lineHeight: 1.55, marginTop: 2 }}>{o.rationale}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {/* Concrete content opportunities */}
          {analysis.contentOpportunities?.length ? (
            <Section label="Content opportunities">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {analysis.contentOpportunities.map((c, i) => (
                  <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 9, padding: "10px 12px", background: "#fff" }}>
                    <div style={{ fontSize: 12.5, color: INK, marginBottom: 3 }}>{c.title}</div>
                    <div style={{ fontSize: 11.5, color: "#666", lineHeight: 1.55, marginBottom: 6 }}>{c.description}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Tag>{c.format}</Tag><Tag accent>{c.objective}</Tag>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {/* GENERATE — objective + format driven */}
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: INK }}>Generate</div>

            <Field label="Business objective">
              <Select value={objective} onChange={setObjective}
                options={OBJECTIVES.map((o) => ({ value: o, label: o, recommended: analysis.businessObjectives?.some((b) => b.objective === o && b.fit === "strong") }))} />
            </Field>

            <Field label="Format">
              <Select value={format} onChange={(v) => setFormat(v as (typeof FORMATS)[number])}
                options={FORMATS.map((f) => ({ value: f, label: f }))} />
            </Field>

            {analysis.figures?.length ? (
              <Field label="Figures & charts">
                <div style={{ display: "flex", gap: 2, background: BG, border: `1px solid ${BORDER}`, borderRadius: 9, padding: 3, width: "fit-content" }}>
                  {(["summary", "original", "both"] as const).map((m) => (
                    <button key={m} onClick={() => setChartMode(m)}
                      style={{
                        fontSize: 11, padding: "5px 12px", border: "none", borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
                        background: chartMode === m ? "#fff" : "transparent",
                        color: chartMode === m ? INK : MUTED,
                        boxShadow: chartMode === m ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                        textTransform: "capitalize",
                      }}>
                      {m === "summary" ? "AI summary" : m === "original" ? "Original figure" : "Both"}
                    </button>
                  ))}
                </div>
              </Field>
            ) : null}

            <button onClick={generate} disabled={busy || !objective || remainingSlots <= 0}
              style={{
                marginTop: 4, alignSelf: "flex-start",
                background: busy || remainingSlots <= 0 ? "#CFCFCF" : RED, color: "#fff",
                border: "none", borderRadius: 10, padding: "11px 22px",
                fontSize: 13, fontFamily: "inherit", cursor: busy || remainingSlots <= 0 ? "default" : "pointer",
                letterSpacing: "0.02em",
              }}>
              {stage === "generating" ? (progress || "Generating…") : remainingSlots <= 0 ? "Asset limit reached" : "Generate slides ↗"}
            </button>
            <div style={{ fontSize: 11, color: MUTED }}>
              Slides render as branded visuals into Visual Assets, then your usual edit and approval flow takes over.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small presentational helpers ──
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED, marginBottom: 9 }}>{label}</div>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, color: MUTED }}>{label}</span>
      {children}
    </label>
  );
}
function Tag({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span style={{
      fontSize: 9.5, padding: "2px 8px", borderRadius: 5, letterSpacing: "0.05em", textTransform: "uppercase",
      background: accent ? "rgba(227,0,0,0.07)" : BG, color: accent ? RED : "#666",
      border: `1px solid ${accent ? "rgba(227,0,0,0.18)" : BORDER}`,
    }}>{children}</span>
  );
}
function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string; recommended?: boolean }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{
        fontSize: 13, fontFamily: "inherit", color: INK, padding: "9px 11px",
        border: `1px solid ${BORDER}`, borderRadius: 9, background: "#fff", cursor: "pointer", width: "100%",
      }}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}{o.recommended ? "  ·  recommended" : ""}</option>
      ))}
    </select>
  );
}
