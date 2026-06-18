"use client";

// TEMPORARY dev-only harness for tuning the PDF intelligence + generation prompts.
// Reachable at /pdf-test when logged in as agency (admin). Returns 404 in
// production. Delete this directory before/after shipping the feature.

import { useEffect, useRef, useState } from "react";
import { notFound } from "next/navigation";

const OBJECTIVES = [
  "Investor Visibility",
  "Talent Acquisition",
  "Scientific Authority",
  "Clinical Trial Recruitment",
  "Commercial Growth",
];
const FORMATS = ["Carousel", "Carousel + Post"];

type Json = Record<string, unknown>;
type Timed<T> = { data: T; ms: number };

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export default function PdfTestHarness() {
  if (process.env.NODE_ENV === "production") notFound();

  const fileRef = useRef<HTMLInputElement>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [busy, setBusy] = useState<string>("");
  const [err, setErr] = useState("");

  const [analysis, setAnalysis] = useState<Timed<Json> | null>(null);
  const [carousel, setCarousel] = useState<Timed<Json> | null>(null);

  const [objective, setObjective] = useState(OBJECTIVES[0]);
  const [format, setFormat] = useState(FORMATS[0]);
  const [chartMode, setChartMode] = useState<"summary" | "original" | "both">("summary");

  // Optional branded-SVG render (uses /api/visual + a chosen company).
  const [companies, setCompanies] = useState<{ id: string; name: string; pillars: { type: string; day: string; example: string }[] }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [renderedSvgs, setRenderedSvgs] = useState<{ headline: string; svg: string }[]>([]);

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then((d) => {
      const list = Array.isArray(d) ? d : d.clients || [];
      setCompanies(list);
      if (list[0]) setCompanyId(list[0].id);
    }).catch(() => {});
  }, []);

  async function timed(fn: () => Promise<Response>): Promise<Timed<Json>> {
    const t0 = performance.now();
    const res = await fn();
    const ms = Math.round(performance.now() - t0);
    const data = await res.json();
    if (!res.ok) {
      const detail = data?.raw
        ? `${data.error || `HTTP ${res.status}`} [stop: ${data.stopReason || "?"}]\n\n--- raw model output ---\n${data.raw}`
        : data?.error || `HTTP ${res.status}`;
      throw new Error(detail);
    }
    return { data, ms };
  }

  async function upload(file: File) {
    setErr(""); setBusy("Uploading…"); setAnalysis(null); setCarousel(null); setRenderedSvgs([]);
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok || !d.url) throw new Error(d?.error || "Upload failed");
      setPdfUrl(d.url); setPdfName(file.name);
      await runIntelligence(d.url);
    } catch (e) { setErr(String(e)); } finally { setBusy(""); }
  }

  async function runIntelligence(url = pdfUrl) {
    if (!url) return;
    setErr(""); setBusy("Analyzing…"); setCarousel(null); setRenderedSvgs([]);
    try {
      const out = await timed(() => fetch("/api/pdf-intelligence", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl: url }),
      }));
      const a = (out.data.analysis ?? out.data) as Json;
      setAnalysis({ data: a, ms: out.ms });
      const objs = (a.businessObjectives as { objective: string; fit: string }[]) || [];
      const strong = objs.find((o) => o.fit === "strong") || objs[0];
      if (strong?.objective && OBJECTIVES.includes(strong.objective)) setObjective(strong.objective);
    } catch (e) { setErr(String(e)); } finally { setBusy(""); }
  }

  async function runGeneration() {
    if (!pdfUrl) return;
    setErr(""); setBusy("Generating…"); setRenderedSvgs([]);
    try {
      const out = await timed(() => fetch("/api/pdf-carousel", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfUrl,
          mode: format === "Carousel + Post" ? "post_carousel" : "carousel",
          chartMode,
          documentType: (analysis?.data.documentType as string) || "",
          businessObjective: objective,
          format,
        }),
      }));
      setCarousel(out);
    } catch (e) { setErr(String(e)); } finally { setBusy(""); }
  }

  async function renderSvgs() {
    if (!carousel || !companyId) return;
    const company = companies.find((c) => c.id === companyId);
    if (!company) return;
    const pillar = company.pillars?.[0] || { type: "brand", day: "", example: "" };
    const slides = (carousel.data.slides as { role: string; headline: string; body: string; stat: string | null }[]) || [];
    setErr(""); setBusy("Rendering SVGs…"); setRenderedSvgs([]);
    try {
      const results: { headline: string; svg: string }[] = [];
      for (const s of slides) {
        const visualType = s.stat ? "stat" : (s.role === "Hook" || s.role === "Call to Action") ? "quote" : "brand";
        const postContent = [s.headline, s.body, s.stat].filter(Boolean).join(" — ").replace(/—/g, ",");
        const r = await fetch("/api/visual", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company, pillar, visualType, postContent }),
        });
        const d = await r.json();
        results.push({ headline: s.headline, svg: d.svg || "" });
        setRenderedSvgs([...results]);
      }
    } catch (e) { setErr(String(e)); } finally { setBusy(""); }
  }

  const a = (analysis?.data ?? {}) as Json;
  const objs = (a.businessObjectives as { objective: string; fit: string; rationale: string }[]) || [];
  const fmts = (a.recommendedFormats as { format: string; objective: string; rationale: string }[]) || [];
  const opps = (a.contentOpportunities as { title: string; description: string; format: string; objective: string }[]) || [];
  const themes = (a.themes as string[]) || [];
  const figures = (a.figures as { page: number; label: string; description: string }[]) || [];
  const slides = (carousel?.data.slides as { role: string; headline: string; body: string; stat: string | null; figurePage: number | null }[]) || [];
  const post = carousel?.data.post as { copy: string; headline: string; cta: string } | null;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px", fontFamily: "Helvetica, Arial, sans-serif", color: "#111" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>PDF Prompt Harness</h1>
        <span style={{ fontSize: 11, color: "#E30000", border: "1px solid #E30000", borderRadius: 4, padding: "2px 7px", letterSpacing: "0.06em" }}>DEV ONLY</span>
      </div>
      <p style={{ fontSize: 12.5, color: "#666", marginTop: 0 }}>
        Upload once, then re-run generation with different objective / format / figure settings instantly. Raw JSON and timings exposed for prompt tuning. Requires agency login.
      </p>

      {/* Upload */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "18px 0" }}>
        <button onClick={() => fileRef.current?.click()} disabled={!!busy}
          style={btn(true)}>Upload PDF</button>
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }} />
        {pdfName ? <span style={{ fontSize: 12.5, color: "#444" }}>{pdfName}</span> : null}
        {pdfUrl ? <button onClick={() => runIntelligence()} disabled={!!busy} style={btn(false)}>Re-run intelligence</button> : null}
        {busy ? <span style={{ fontSize: 12.5, color: "#E30000" }}>{busy}</span> : null}
      </div>
      {err ? <pre style={{ ...preStyle, color: "#B00020", background: "#FDF0F0" }}>{err}</pre> : null}

      {/* INTELLIGENCE */}
      {analysis ? (
        <Card title={`Content Intelligence  ·  ${analysis.ms} ms`}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12 }}>
            <KV k="Document type" v={`${a.documentType} (${Math.round(((a.confidence as number) || 0) * 100)}%)`} />
            <KV k="Title" v={String(a.title || "—")} />
            <KV k="Audience" v={String(a.audience || "—")} />
          </div>
          {a.summary ? <p style={{ fontSize: 13, lineHeight: 1.6, color: "#333" }}>{String(a.summary)}</p> : null}

          {themes.length ? <Row label="Themes">{themes.map((t) => <Chip key={t}>{t}</Chip>)}</Row> : null}

          {objs.length ? (
            <Sub title="Business objective rankings">
              {objs.map((o) => (
                <div key={o.objective} style={{ marginBottom: 6 }}>
                  <b style={{ fontWeight: 600 }}>{o.objective}</b>
                  <span style={{ fontSize: 11, color: o.fit === "strong" ? "#E30000" : "#999", marginLeft: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{o.fit}</span>
                  <div style={{ fontSize: 12, color: "#666" }}>{o.rationale}</div>
                </div>
              ))}
            </Sub>
          ) : null}

          {fmts.length ? (
            <Sub title="Recommended formats">
              {fmts.map((f, i) => (
                <div key={i} style={{ fontSize: 12.5, marginBottom: 4 }}>
                  <b style={{ fontWeight: 600 }}>{f.format}</b> <span style={{ color: "#E30000" }}>· {f.objective}</span>
                  <div style={{ fontSize: 12, color: "#666" }}>{f.rationale}</div>
                </div>
              ))}
            </Sub>
          ) : null}

          {opps.length ? (
            <Sub title="Content opportunities">
              {opps.map((c, i) => (
                <div key={i} style={{ fontSize: 12.5, marginBottom: 6 }}>
                  <b style={{ fontWeight: 600 }}>{c.title}</b> <span style={{ color: "#999" }}>[{c.format} · {c.objective}]</span>
                  <div style={{ fontSize: 12, color: "#666" }}>{c.description}</div>
                </div>
              ))}
            </Sub>
          ) : null}

          {figures.length ? (
            <Sub title="Figures">
              {figures.map((f, i) => <div key={i} style={{ fontSize: 12, color: "#444" }}>p.{f.page} — <b>{f.label}</b>: {f.description}</div>)}
            </Sub>
          ) : null}

          <RawJson value={analysis.data} />
        </Card>
      ) : null}

      {/* GENERATION CONTROLS */}
      {analysis ? (
        <Card title="Generate">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>
            <Sel label="Objective" value={objective} set={setObjective} opts={OBJECTIVES} />
            <Sel label="Format" value={format} set={setFormat} opts={FORMATS} />
            <Sel label="Figures" value={chartMode} set={(v) => setChartMode(v as typeof chartMode)} opts={["summary", "original", "both"]} />
            <button onClick={runGeneration} disabled={!!busy} style={btn(true)}>Generate carousel ↗</button>
          </div>
        </Card>
      ) : null}

      {/* GENERATION OUTPUT */}
      {carousel ? (
        <Card title={`Generated carousel  ·  ${carousel.ms} ms  ·  ${slides.length} slides`}>
          {post ? (
            <Sub title="Generated post">
              <div style={{ fontSize: 12, color: "#999", marginBottom: 2 }}>Headline: {post.headline}</div>
              <pre style={preStyle}>{post.copy}</pre>
              <div style={{ fontSize: 12, color: "#999" }}>CTA: {post.cta}</div>
            </Sub>
          ) : null}

          <div style={{ display: "grid", gap: 8 }}>
            {slides.map((s, i) => (
              <div key={i} style={{ border: "1px solid #E5E5E5", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "#E30000", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {i + 1}. {s.role}{s.figurePage != null ? `  ·  figure p.${s.figurePage}` : ""}{s.stat ? `  ·  stat: ${s.stat}` : ""}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, margin: "3px 0" }}>{s.headline}</div>
                <div style={{ fontSize: 12.5, color: "#444" }}>{s.body}</div>
              </div>
            ))}
          </div>

          {/* Optional branded render */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginTop: 14 }}>
            <Sel label="Render as company" value={companyId} set={setCompanyId} opts={companies.map((c) => c.id)} labels={companies.map((c) => c.name)} />
            <button onClick={renderSvgs} disabled={!!busy || !companyId} style={btn(false)}>Render branded SVGs</button>
          </div>
          {renderedSvgs.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginTop: 12 }}>
              {renderedSvgs.map((r, i) => (
                <div key={i} style={{ border: "1px solid #E5E5E5", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ width: "100%", aspectRatio: "1/1" }} dangerouslySetInnerHTML={{ __html: r.svg }} />
                  <div style={{ fontSize: 10.5, color: "#666", padding: "5px 7px" }}>{i + 1}. {r.headline}</div>
                </div>
              ))}
            </div>
          ) : null}

          <RawJson value={carousel.data} />
        </Card>
      ) : null}
    </div>
  );
}

// ── tiny presentational helpers ──
const preStyle: React.CSSProperties = { fontFamily: MONO, fontSize: 11.5, lineHeight: 1.5, background: "#F7F7F7", border: "1px solid #E5E5E5", borderRadius: 8, padding: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", overflowX: "auto" };
function btn(primary: boolean): React.CSSProperties {
  return { fontSize: 12.5, fontFamily: "inherit", padding: "8px 16px", borderRadius: 8, cursor: "pointer", border: primary ? "none" : "1px solid #E5E5E5", background: primary ? "#0A0A0A" : "#fff", color: primary ? "#fff" : "#111" };
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #E5E5E5", borderRadius: 12, padding: 18, marginBottom: 18, background: "#fff" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#999", marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}
function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={{ marginTop: 12 }}><div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{title}</div>{children}</div>;
}
function KV({ k, v }: { k: string; v: string }) {
  return <div><div style={{ fontSize: 10.5, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</div><div style={{ fontSize: 13 }}>{v}</div></div>;
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "8px 0" }}><span style={{ fontSize: 11, color: "#999" }}>{label}:</span>{children}</div>;
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 11, padding: "2px 8px", background: "#F5F5F5", border: "1px solid #E5E5E5", borderRadius: 5 }}>{children}</span>;
}
function Sel({ label, value, set, opts, labels }: { label: string; value: string; set: (v: string) => void; opts: string[]; labels?: string[] }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10.5, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <select value={value} onChange={(e) => set(e.target.value)} style={{ fontSize: 12.5, fontFamily: "inherit", padding: "7px 9px", border: "1px solid #E5E5E5", borderRadius: 8, background: "#fff" }}>
        {opts.map((o, i) => <option key={o} value={o}>{labels?.[i] ?? o}</option>)}
      </select>
    </label>
  );
}
function RawJson({ value }: { value: unknown }) {
  const [open, setOpen] = useState(false);
  const text = JSON.stringify(value, null, 2);
  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={() => setOpen((o) => !o)} style={{ ...btn(false), fontSize: 11, padding: "5px 10px" }}>
        {open ? "Hide raw JSON" : "Show raw JSON"}
      </button>
      <button onClick={() => navigator.clipboard?.writeText(text)} style={{ ...btn(false), fontSize: 11, padding: "5px 10px", marginLeft: 8 }}>Copy</button>
      {open ? <pre style={{ ...preStyle, marginTop: 8 }}>{text}</pre> : null}
    </div>
  );
}
