"use client";

import { useState, useEffect, useCallback } from "react";
import { companies, type Company, type Pillar } from "@/lib/companies";

type Post = {
  id: number;
  company_id: string;
  company_name: string;
  post_type: string;
  scheduled_day: string;
  content: string;
  status: "draft" | "approved" | "posted";
  week_number: number | null;
  created_at: string;
};

type Tab = "generate" | "library" | "calendar" | "schedule";
type VisualType = "quote" | "stat" | "brand" | "science";

// ── Style tokens ──────────────────────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(0,0,0,0.09)",
  borderRadius: "3px",
};
const SURFACE: React.CSSProperties = {
  background: "#f8f7f5",
  border: "1px solid rgba(0,0,0,0.07)",
  borderRadius: "3px",
};
const BTN_BASE: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "6px",
  padding: "7px 18px",
  border: "1px solid rgba(0,0,0,0.15)",
  background: "transparent",
  borderRadius: "2px",
  fontSize: "11px", fontWeight: 400,
  letterSpacing: "0.07em", textTransform: "uppercase" as const,
  cursor: "pointer", color: "#6b6b68",
  transition: "all 0.15s ease",
};
const BTN_PRIMARY: React.CSSProperties = {
  ...BTN_BASE,
  border: "1px solid rgba(0,0,0,0.7)",
  color: "#0f0f0d",
};
const INPUT: React.CSSProperties = {
  width: "100%",
  background: "#f8f7f5",
  border: "1px solid rgba(0,0,0,0.1)",
  borderRadius: "2px",
  padding: "10px 14px",
  fontSize: "13px",
  lineHeight: 1.75,
  color: "#1a1a18",
  outline: "none",
  fontFamily: "inherit",
  fontWeight: 300,
  transition: "border-color 0.15s ease",
};

function Btn({
  onClick, disabled, primary, style = {}, children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...(primary ? BTN_PRIMARY : BTN_BASE), ...style, opacity: disabled ? 0.35 : 1 }}>
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { border: string; color: string }> = {
    draft:    { border: "1px solid rgba(0,0,0,0.12)", color: "#a0a09c" },
    approved: { border: "1px solid rgba(0,0,0,0.6)",  color: "#1a1a18" },
    posted:   { border: "1px solid rgba(0,0,0,0.3)",  color: "#4a4a48" },
  };
  const s = cfg[status] ?? cfg.draft;
  return (
    <span style={{ fontSize: "9px", padding: "2px 8px", borderRadius: "1px", letterSpacing: "0.12em", textTransform: "uppercase", ...s }}>
      {status}
    </span>
  );
}

const LOGO_FILES: Record<string, string> = {
  cpolar:   "/files/cpolar_logo_final.png",
  oxia:     "/files/oxia_logo_final.png",
  coregen:  "/files/coregen_logo_final.png",
  intrepro: "/files/klimloc_logo_final.png",
  senvi:    "/files/senvi_logo_final.png",
};

function CompanyLogo({ company }: { company: Company }) {
  const src = LOGO_FILES[company.id];
  if (!src) return <span>{company.brand.logoText}</span>;
  return (
    <div style={{ background: "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={company.name} style={{
        width: "160px", height: "80px", objectFit: "contain", display: "block", background: "transparent",
        filter: company.id === "intrepro" ? "invert(1)" : "none",
        mixBlendMode: (company.id === "oxia" || company.id === "coregen") ? "multiply" : "normal",
      }} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Platform() {
  const [ac, setAc] = useState<Company>(companies[0]);
  const [ap, setAp] = useState<Pillar>(companies[0].pillars[0]);
  const [tab, setTab] = useState<Tab>("generate");
  const [post, setPost] = useState("");
  const [isGen, setIsGen] = useState(false);
  const [isSave, setIsSave] = useState(false);
  const [saved, setSaved] = useState<Post[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState("");
  const [note, setNote] = useState("");
  const [svg, setSvg] = useState("");
  const [isVisual, setIsVisual] = useState(false);
  const [vizType, setVizType] = useState<VisualType>("quote");
  const [refineRequest, setRefineRequest] = useState("");
  const [isRefining, setIsRefining] = useState(false);

  const notify = (m: string) => { setNote(m); setTimeout(() => setNote(""), 2500); };

  const fetchPosts = useCallback(async () => {
    const p = new URLSearchParams();
    p.set("company_id", ac.id);
    if (filterStatus !== "all") p.set("status", filterStatus);
    const r = await fetch(`/api/posts?${p}`);
    const d = await r.json();
    setSaved(d.posts || []);
  }, [ac, filterStatus]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const generate = async () => {
    setIsGen(true); setPost(""); setSvg("");
    try {
      const r = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company: ac, pillar: ap }) });
      const d = await r.json();
      setPost(d.content || "Error generating.");
    } catch { setPost("Error — please try again."); }
    setIsGen(false);
  };

  const generateVisual = async () => {
    setIsVisual(true); setSvg("");
    try {
      const r = await fetch("/api/visual", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company: ac, pillar: ap, visualType: vizType, postContent: post }) });
      const d = await r.json();
      setSvg(d.svg || "");
    } catch { notify("Visual generation failed"); }
    setIsVisual(false);
  };

  const refinePost = async () => {
    if (!post || !refineRequest.trim()) return;
    setIsRefining(true);
    try {
      const r = await fetch("/api/refine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company: ac, pillar: ap, currentPost: post, request: refineRequest }) });
      const d = await r.json();
      if (d.content) { setPost(d.content); setRefineRequest(""); }
    } catch { notify("Refine failed — try again"); }
    setIsRefining(false);
  };

  const savePost = async (status: "draft" | "approved") => {
    if (!post) return;
    setIsSave(true);
    await fetch("/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company_id: ac.id, company_name: ac.name, post_type: ap.type, scheduled_day: ap.day, content: post, status }) });
    setIsSave(false); notify(`Saved as ${status}`); fetchPosts();
  };

  const updateStatus = async (p: Post, s: Post["status"]) => {
    await fetch("/api/posts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, status: s }) });
    fetchPosts();
  };

  const deletePost = async (id: number) => {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/posts?id=${id}`, { method: "DELETE" }); fetchPosts(); notify("Deleted");
  };

  const saveEdit = async () => {
    if (!editPost) return;
    await fetch("/api/posts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editPost.id, content: editContent }) });
    setEditPost(null); fetchPosts(); notify("Updated");
  };

  const copy = (t: string) => { navigator.clipboard.writeText(t); notify("Copied"); };

  const downloadSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${ac.id}-${vizType}-${Date.now()}.svg`; a.click();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", color: "#0f0f0d" }}>

      {/* Toast */}
      {note && (
        <div className="fade-up" style={{ position: "fixed", top: "24px", right: "24px", zIndex: 50, background: "#0f0f0d", color: "#fff", fontSize: "12px", letterSpacing: "0.04em", padding: "10px 20px", borderRadius: "2px" }}>
          {note}
        </div>
      )}

      {/* ── Header ── */}
      <header style={{ background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.08)", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: "1300px", margin: "0 auto", padding: "0 40px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
            <span className="font-serif" style={{ fontSize: "18px", fontWeight: 400, color: "#0f0f0d", letterSpacing: "0.01em" }}>
              Gorlin Content Studio
            </span>
            <span style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#c0bebb" }}>
              LinkedIn · 5 Companies
            </span>
          </div>
          <nav style={{ display: "flex", gap: "0" }}>
            {(["generate","library","calendar","schedule"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  padding: "6px 16px",
                  background: "transparent",
                  border: "none",
                  borderBottom: tab === t ? "1.5px solid #0f0f0d" : "1.5px solid transparent",
                  fontSize: "11px", fontWeight: 400,
                  letterSpacing: "0.09em", textTransform: "uppercase",
                  color: tab === t ? "#0f0f0d" : "#b0aea9",
                  cursor: "pointer", transition: "all 0.15s ease",
                }}>
                {t}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Company bar ── */}
      <div style={{ background: "#f8f7f5", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div style={{ maxWidth: "1300px", margin: "0 auto", padding: "0 40px", height: "46px", display: "flex", alignItems: "center", gap: "4px" }}>
          {companies.map(c => (
            <button key={c.id}
              onClick={() => { setAc(c); setAp(c.pillars[0]); setPost(""); setSvg(""); }}
              style={{
                padding: "5px 14px",
                background: ac.id === c.id ? "#fff" : "transparent",
                border: ac.id === c.id ? "1px solid rgba(0,0,0,0.12)" : "1px solid transparent",
                borderRadius: "2px",
                fontSize: "11px", fontWeight: ac.id === c.id ? 500 : 400,
                letterSpacing: "0.03em",
                color: ac.id === c.id ? "#0f0f0d" : "#9a9894",
                cursor: "pointer", transition: "all 0.15s ease",
              }}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main content ── */}
      <main style={{ maxWidth: "1300px", margin: "0 auto", padding: "40px 40px 80px" }}>

        {/* ══════════════ GENERATE ══════════════ */}
        {tab === "generate" && (
          <div key="gen" className="fade-up" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "20px" }}>

            {/* Left panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

              {/* Company card */}
              <div style={CARD}>
                <div style={{ padding: "20px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <div style={{ lineHeight: 1.2, marginBottom: "4px", color: "#0f0f0d" }}><CompanyLogo company={ac} /></div>
                  <div style={{ fontSize: "11px", color: ac.color, letterSpacing: "0.02em" }}>{ac.tagline}</div>
                </div>
                <div style={{ padding: "14px 20px", display: "flex", flexWrap: "wrap", gap: "5px" }}>
                  {ac.badges.map(b => (
                    <span key={b} style={{ fontSize: "10px", padding: "2px 8px", background: "#f4f3f1", border: "1px solid rgba(0,0,0,0.08)", color: "#7a7a76", borderRadius: "2px", letterSpacing: "0.02em" }}>{b}</span>
                  ))}
                </div>
              </div>

              {/* Voice */}
              <div style={{ ...SURFACE, padding: "16px 18px", borderLeft: `3px solid ${ac.color}` }}>
                <div className="label" style={{ marginBottom: "8px" }}>Brand voice</div>
                <p style={{ fontSize: "12px", lineHeight: 1.7, color: "#7a7a76" }}>{ac.voice}</p>
              </div>

              {/* Pillars */}
              <div style={CARD}>
                <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <div className="label">Content pillars</div>
                </div>
                <div style={{ padding: "8px" }}>
                  {ac.pillars.map(p => (
                    <button key={p.type} onClick={() => setAp(p)}
                      style={{
                        width: "100%", textAlign: "left",
                        padding: "10px 12px",
                        background: ap.type === p.type ? "#f8f7f5" : "transparent",
                        border: ap.type === p.type ? `1px solid rgba(0,0,0,0.1)` : "1px solid transparent",
                        borderLeft: ap.type === p.type ? `3px solid ${p.color}` : "3px solid transparent",
                        borderRadius: "2px",
                        cursor: "pointer", transition: "all 0.15s ease", marginBottom: "2px",
                      }}>
                      <div style={{ fontSize: "11px", fontWeight: 500, color: ap.type === p.type ? "#0f0f0d" : "#8a8a86", letterSpacing: "0.03em", marginBottom: "3px" }}>
                        {p.day} — {p.type}
                      </div>
                      <div style={{ fontSize: "11px", color: "#b0aea9", lineHeight: 1.5 }}>{p.example.slice(0,78)}…</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right panels */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

              {/* Generator */}
              <div style={CARD}>
                <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div className="label">Generating for</div>
                    <div className="font-serif" style={{ fontSize: "17px", fontWeight: 400, color: "#0f0f0d", marginTop: "4px" }}>
                      {ap.type} &middot; {ap.day} &middot; {ac.name}
                    </div>
                  </div>
                  <Btn onClick={generate} disabled={isGen} primary>
                    {isGen ? "Writing…" : "Generate ↗"}
                  </Btn>
                </div>

                <div style={{ padding: "18px 22px" }}>
                  {post ? (
                    <>
                      <textarea value={post} onChange={e => setPost(e.target.value)} rows={11}
                        style={{ ...INPUT, resize: "none" }}
                        onFocus={e => e.target.style.borderColor = "rgba(0,0,0,0.3)"}
                        onBlur={e => e.target.style.borderColor = "rgba(0,0,0,0.1)"}
                      />
                      <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                        <Btn onClick={() => copy(post)}>Copy</Btn>
                        <Btn onClick={() => savePost("draft")} disabled={isSave}>Save draft</Btn>
                        <Btn onClick={() => savePost("approved")} disabled={isSave} primary>Approve &amp; save</Btn>
                        <Btn onClick={generate} disabled={isGen}>Regenerate</Btn>
                      </div>
                    </>
                  ) : isGen ? (
                    <div style={{ height: "200px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "14px" }}>
                      <div style={{ width: "18px", height: "18px", border: "1.5px solid rgba(0,0,0,0.1)", borderTopColor: "#0f0f0d", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      <p style={{ fontSize: "12px", color: "#b0aea9", letterSpacing: "0.05em" }}>Writing in {ac.name}&apos;s voice…</p>
                    </div>
                  ) : (
                    <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed rgba(0,0,0,0.1)", borderRadius: "2px" }}>
                      <p style={{ fontSize: "12px", color: "#c0bebb", letterSpacing: "0.05em" }}>Select a pillar and generate</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Refine */}
              {post && (
                <div style={CARD} className="fade-up fade-up-delay-1">
                  <div style={{ padding: "14px 22px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                    <div className="label">Refine this post</div>
                  </div>
                  <div style={{ padding: "14px 22px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {["Make it shorter","Make it punchier","Add more data","Strengthen the hook","Make it more urgent","Soften the tone","Add a statistic","Change the question"].map(s => (
                        <button key={s} onClick={() => setRefineRequest(s)}
                          style={{
                            fontSize: "11px", padding: "4px 12px",
                            border: "1px solid rgba(0,0,0,0.1)", background: "#f8f7f5",
                            borderRadius: "2px", color: "#7a7a76", cursor: "pointer",
                            letterSpacing: "0.02em", transition: "all 0.15s ease",
                          }}
                          onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = "rgba(0,0,0,0.25)"; (e.target as HTMLElement).style.color = "#0f0f0d"; }}
                          onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = "rgba(0,0,0,0.1)"; (e.target as HTMLElement).style.color = "#7a7a76"; }}>
                          {s}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input type="text" value={refineRequest} onChange={e => setRefineRequest(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && refinePost()}
                        placeholder="Or describe any change…"
                        style={{ ...INPUT, width: "auto", flex: 1, padding: "8px 12px" }}
                        onFocus={e => e.target.style.borderColor = "rgba(0,0,0,0.3)"}
                        onBlur={e => e.target.style.borderColor = "rgba(0,0,0,0.1)"}
                      />
                      <Btn onClick={refinePost} disabled={isRefining || !refineRequest.trim()} primary>
                        {isRefining ? "Refining…" : "Apply ↗"}
                      </Btn>
                    </div>
                  </div>
                </div>
              )}

              {/* Visual */}
              {post && (
                <div style={CARD} className="fade-up fade-up-delay-2">
                  <div style={{ padding: "14px 22px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div className="label">Generate visual</div>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {(["quote","stat","brand","science"] as VisualType[]).map(t => (
                        <button key={t} onClick={() => setVizType(t)}
                          style={{
                            fontSize: "10px", padding: "4px 10px",
                            border: vizType === t ? "1px solid rgba(0,0,0,0.3)" : "1px solid rgba(0,0,0,0.09)",
                            background: vizType === t ? "#0f0f0d" : "transparent",
                            color: vizType === t ? "#fff" : "#9a9894",
                            borderRadius: "2px", cursor: "pointer",
                            textTransform: "uppercase", letterSpacing: "0.07em",
                            transition: "all 0.15s ease",
                          }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ padding: "18px 22px" }}>
                    {svg ? (
                      <>
                        <div style={{ position: "relative", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "2px", overflow: "hidden", marginBottom: "12px" }}>
                          <div dangerouslySetInnerHTML={{ __html: svg }} />
                          {/* Logo overlay — always crisp, never part of the generated image */}
                          <div style={{
                            position: "absolute", bottom: "18px", left: "20px",
                            padding: "6px 10px",
                            background: "transparent",
                            borderRadius: "3px",
                          }}>
                            <CompanyLogo company={ac} />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <Btn onClick={downloadSvg}>Download SVG</Btn>
                          <Btn onClick={generateVisual} disabled={isVisual}>Regenerate</Btn>
                        </div>
                      </>
                    ) : (
                      <Btn onClick={generateVisual} disabled={isVisual} primary style={{ width: "100%", justifyContent: "center", padding: "12px" }}>
                        {isVisual ? "Creating…" : `Generate ${vizType} card ↗`}
                      </Btn>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════ LIBRARY ══════════════ */}
        {tab === "library" && (
          <div key="lib" className="fade-up">
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "24px" }}>
              <span className="label" style={{ marginRight: "8px" }}>Filter</span>
              {(["all","draft","approved","posted"] as const).map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  style={{
                    fontSize: "11px", padding: "5px 14px",
                    border: filterStatus === s ? "1px solid rgba(0,0,0,0.55)" : "1px solid rgba(0,0,0,0.1)",
                    background: filterStatus === s ? "#0f0f0d" : "transparent",
                    color: filterStatus === s ? "#fff" : "#9a9894",
                    borderRadius: "2px", cursor: "pointer",
                    letterSpacing: "0.07em", textTransform: "uppercase",
                    transition: "all 0.15s ease",
                  }}>
                  {s}
                </button>
              ))}
            </div>

            {saved.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#c0bebb", fontSize: "13px" }}>
                No posts yet for {ac.name}.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {saved.map((p, i) => (
                  <div key={p.id} className={`fade-up fade-up-delay-${Math.min(i,3) as 0|1|2|3}`} style={CARD}>
                    {editPost?.id === p.id ? (
                      <div style={{ padding: "18px 22px" }}>
                        <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={10}
                          style={{ ...INPUT, resize: "none" }} />
                        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                          <Btn onClick={saveEdit} primary>Save</Btn>
                          <Btn onClick={() => setEditPost(null)}>Cancel</Btn>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ padding: "12px 22px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", background: "#fafaf9" }}>
                          <span style={{ fontSize: "11px", padding: "2px 8px", background: "#fff", border: `1px solid ${ac.color}40`, color: ac.color, borderRadius: "2px", letterSpacing: "0.02em" }}>{p.company_name}</span>
                          <span style={{ fontSize: "11px", color: "#9a9894" }}>{p.post_type}</span>
                          <span style={{ color: "#d0d0cc" }}>·</span>
                          <span style={{ fontSize: "11px", color: "#b0aea9" }}>{p.scheduled_day}</span>
                          <div style={{ marginLeft: "auto" }}><StatusBadge status={p.status} /></div>
                        </div>
                        <div style={{ padding: "18px 22px" }}>
                          <p style={{ fontSize: "13px", lineHeight: 1.8, color: "#2a2a28", whiteSpace: "pre-wrap" }}>{p.content}</p>
                        </div>
                        <div style={{ padding: "10px 22px", borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", gap: "16px", alignItems: "center", background: "#fafaf9" }}>
                          {[
                            { label: "Copy", action: () => copy(p.content) },
                            { label: "Edit", action: () => { setEditPost(p); setEditContent(p.content); } },
                          ].map(a => (
                            <button key={a.label} onClick={a.action}
                              style={{ fontSize: "11px", color: "#9a9894", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.04em", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                              {a.label}
                            </button>
                          ))}
                          {p.status === "draft" && <button onClick={() => updateStatus(p,"approved")} style={{ fontSize: "11px", color: "#0f0f0d", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.04em", fontWeight: 500, textDecoration: "underline", textUnderlineOffset: "3px" }}>Approve</button>}
                          {p.status === "approved" && <button onClick={() => updateStatus(p,"posted")} style={{ fontSize: "11px", color: "#0f0f0d", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.04em", fontWeight: 500, textDecoration: "underline", textUnderlineOffset: "3px" }}>Mark posted</button>}
                          <button onClick={() => deletePost(p.id)} style={{ fontSize: "11px", color: "#c0bebb", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.04em", marginLeft: "auto", textDecoration: "underline", textUnderlineOffset: "3px" }}>Delete</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ CALENDAR ══════════════ */}
        {tab === "calendar" && (
          <div key="cal" className="fade-up">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "0", marginBottom: "0", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
              {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(d => (
                <div key={d} style={{ textAlign: "center", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#b0aea9", padding: "10px 0", borderRight: "1px solid rgba(0,0,0,0.06)" }}>{d.slice(0,3)}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", border: "1px solid rgba(0,0,0,0.08)", borderTop: "none" }}>
              {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(day => {
                const daycos = companies.filter(c => c.postingDays.includes(day));
                return (
                  <div key={day} style={{ minHeight: "170px", padding: "12px 10px", borderRight: "1px solid rgba(0,0,0,0.06)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      {daycos.map(c => {
                        const pil = c.pillars.find(p => p.day === day);
                        const bestTime = (c.bestPostTimes as unknown as Record<string,string>)[day];
                        return (
                          <div key={c.id} style={{ padding: "8px 10px", background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderLeft: `3px solid ${c.color}`, borderRadius: "2px" }}>
                            <div style={{ color: "#0f0f0d" }}><CompanyLogo company={c} /></div>
                            {pil && <div style={{ fontSize: "10px", color: "#9a9894", marginTop: "2px" }}>{pil.type}</div>}
                            {bestTime && <div style={{ fontSize: "10px", color: c.color, marginTop: "4px", fontWeight: 500 }}>◷ {bestTime}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px", marginTop: "20px" }}>
              {companies.map(c => (
                <div key={c.id} style={{ ...SURFACE, padding: "14px 18px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{ width: "3px", height: "100%", minHeight: "40px", background: c.color, opacity: 0.6, flexShrink: 0, borderRadius: "2px" }} />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                      <span style={{ color: "#0f0f0d" }}><CompanyLogo company={c} /></span>
                      <span style={{ fontSize: "9px", padding: "1px 6px", border: `1px solid ${c.color}50`, color: c.color, borderRadius: "1px", letterSpacing: "0.08em" }}>{c.timezone}</span>
                    </div>
                    <p style={{ fontSize: "11px", color: "#9a9894", lineHeight: 1.6 }}>{c.timezoneNote}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════ SCHEDULE ══════════════ */}
        {tab === "schedule" && (
          <div key="sched" className="fade-up" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Day strategy */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px" }}>
              {[
                { day: "Tuesday",   role: "Awareness & Education",  desc: "Science insights, how-it-works. Build understanding with decision-makers." },
                { day: "Wednesday", role: "Thought Leadership",     desc: "Prime visibility day. Highest B2B engagement. Bold POV and industry takes." },
                { day: "Thursday",  role: "Proof & Authority",      desc: "Data, validation, clinical results. Investors and technical buyers." },
                { day: "Friday",    role: "Community & Reflection", desc: "Human stories, softer engagement. Narrative and wind-down mindset." },
              ].map((d, i) => (
                <div key={d.day} className={`fade-up fade-up-delay-${i as 0|1|2|3}`} style={CARD}>
                  <div style={{ padding: "18px 20px" }}>
                    <div className="label" style={{ marginBottom: "8px" }}>{d.day}</div>
                    <div className="font-serif" style={{ fontSize: "17px", fontWeight: 400, color: "#0f0f0d", marginBottom: "8px", lineHeight: 1.2 }}>{d.role}</div>
                    <p style={{ fontSize: "11px", color: "#9a9894", lineHeight: 1.6 }}>{d.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Master table */}
            <div style={CARD}>
              <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                <div className="font-serif" style={{ fontSize: "19px", fontWeight: 400, color: "#0f0f0d" }}>Master Posting Schedule</div>
                <p style={{ fontSize: "11px", color: "#b0aea9", marginTop: "3px" }}>Staggered 15–30 min between EST companies to prevent feed competition</p>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8f7f5", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                      {["Company","Tuesday","Wednesday","Thursday","Friday","TZ"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "10px 20px", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#b0aea9", fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((c, i) => {
                      const times = c.bestPostTimes as unknown as Record<string,string>;
                      return (
                        <tr key={c.id} style={{ borderBottom: i < companies.length-1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                          <td style={{ padding: "13px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{ width: "3px", height: "14px", background: c.color, borderRadius: "2px", flexShrink: 0 }} />
                              <span style={{ color: "#1a1a18" }}><CompanyLogo company={c} /></span>
                            </div>
                          </td>
                          {["Tuesday","Wednesday","Thursday","Friday"].map(day => (
                            <td key={day} style={{ padding: "13px 20px", fontSize: "12px", color: times[day] ? "#0f0f0d" : "#d0d0cc", fontWeight: times[day] ? 400 : 300 }}>
                              {times[day] ?? "—"}
                            </td>
                          ))}
                          <td style={{ padding: "13px 20px" }}>
                            <span style={{ fontSize: "9px", padding: "2px 7px", border: `1px solid ${c.color}50`, color: c.color, borderRadius: "1px", letterSpacing: "0.1em" }}>{c.timezone}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Per-company cards */}
            {companies.map((c, ci) => {
              const times = c.bestPostTimes as unknown as Record<string,string>;
              const rationale = (c as unknown as Record<string, Record<string,string>>).scheduleRationale ?? {};
              return (
                <div key={c.id} className={`fade-up fade-up-delay-${(ci%4) as 0|1|2|3}`} style={CARD}>
                  <div style={{ padding: "14px 22px", borderBottom: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "center", gap: "12px", background: "#fafaf9" }}>
                    <div style={{ width: "3px", height: "18px", background: c.color, borderRadius: "1px", flexShrink: 0 }} />
                    <span style={{ color: "#0f0f0d" }}><CompanyLogo company={c} /></span>
                    <span style={{ fontSize: "11px", color: "#b0aea9" }}>{(c as unknown as Record<string,string>).audienceRegion}</span>
                    <span style={{ marginLeft: "auto", fontSize: "9px", padding: "2px 7px", border: `1px solid ${c.color}50`, color: c.color, borderRadius: "1px", letterSpacing: "0.1em" }}>{c.timezone}</span>
                  </div>
                  <div style={{ padding: "16px 22px" }}>
                    <p style={{ fontSize: "12px", color: "#9a9894", marginBottom: "14px", fontStyle: "italic", lineHeight: 1.6 }}>
                      {(c as unknown as Record<string,string>).scheduleStrategy}
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px" }}>
                      {c.pillars.map(p => (
                        <div key={p.day} style={{ ...SURFACE, padding: "14px 16px", borderLeft: `3px solid ${c.color}50` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                            <span className="label">{p.day}</span>
                            {times[p.day] && <span style={{ fontSize: "10px", color: c.color, fontWeight: 500 }}>{times[p.day]}</span>}
                          </div>
                          <div style={{ fontSize: "11px", color: "#6b6b68", marginBottom: "6px", fontWeight: 500 }}>{p.type}</div>
                          {rationale[p.day] && (
                            <p style={{ fontSize: "11px", color: "#b0aea9", lineHeight: 1.6, borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: "8px" }}>
                              {rationale[p.day]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Logic rules */}
            <div style={CARD}>
              <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                <div className="font-serif" style={{ fontSize: "19px", fontWeight: 400, color: "#0f0f0d" }}>Scheduling Logic</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
                {[
                  { label: "EST — Biotech / Healthcare / Enterprise", cos: "CoRegen · Oxia · IntrePro · C-POLAR", rule: "Audience concentrated in Northeast US. Post EST morning 8–10 AM to lead the feed before San Francisco wakes up.", times: "Tue 8:00–9:00 AM · Wed 8:30–10:00 AM · Thu 9:00–10:00 AM · Fri varies" },
                  { label: "PST — Longevity / Deep Science / VC",    cos: "Senvi", rule: "Bay Area longevity science cluster dominates. PST morning = EST lunch — dual-timezone reach in one post.", times: "Tue 9:00 AM · Wed 8:30 AM · Thu 9:30 AM · Fri 9:00 AM" },
                  { label: "Stagger Rule — Avoid Feed Competition",  cos: "All EST companies", rule: "Stagger EST companies 15–30 min. CoRegen leads at :00, Oxia at :15, IntrePro at :30, C-POLAR next slot.", times: "CoRegen → Oxia → IntrePro → C-POLAR" },
                ].map((r, i) => (
                  <div key={r.label} style={{ padding: "22px 24px", borderRight: i < 2 ? "1px solid rgba(0,0,0,0.07)" : "none" }}>
                    <div className="label" style={{ marginBottom: "8px", color: "#0f0f0d" }}>{r.label}</div>
                    <div style={{ fontSize: "11px", color: "#9a9894", marginBottom: "10px" }}>{r.cos}</div>
                    <p style={{ fontSize: "12px", color: "#4a4a48", lineHeight: 1.7, marginBottom: "12px" }}>{r.rule}</p>
                    <div style={{ fontSize: "11px", color: "#b0aea9", fontFamily: "monospace", borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: "10px" }}>{r.times}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
