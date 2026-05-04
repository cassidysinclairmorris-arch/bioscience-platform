"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Company, Pillar } from "@/lib/companies";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────
type Post = {
  id: number;
  company_id: string;
  company_name: string;
  post_type: string;
  scheduled_day: string;
  content: string;
  status: "draft" | "pending_approval" | "approved" | "scheduled" | "posted";
  notes: string | null;
  image_url: string | null;
  week_number: number | null;
  created_at: string;
  updated_at: string;
};
type Tab = "overview" | "compose" | "library" | "calendar" | "reports" | "invoices" | "clients";
type VisualType = "quote" | "stat" | "brand" | "science" | "photo";
type InvoiceItem = { description: string; qty: number; rate: number };
type Invoice = {
  id: string;
  number: string;
  client_name: string;
  company_id: string;
  date: string;
  due_date: string;
  items: InvoiceItem[];
  status: "paid" | "pending" | "overdue";
  tax_rate: number;
  notes: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const LOGO_FILES: Record<string, string> = {
  cpolar:   "/files/cpolar_logo_final.png",
  oxia:     "/files/oxia_logo_final.png",
  coregen:  "/files/coregen_logo_final.png",
  intrepro: "/files/klimloc_logo_final.png",
  senvi:    "/files/senvi_logo_final.png",
};

const REPORT_DATA = {
  followerGrowth: [
    { month: "Oct", "C-POLAR": 1240, Oxia: 890,  CoRegen: 670  },
    { month: "Nov", "C-POLAR": 1380, Oxia: 1020, CoRegen: 780  },
    { month: "Dec", "C-POLAR": 1510, Oxia: 1190, CoRegen: 920  },
    { month: "Jan", "C-POLAR": 1720, Oxia: 1340, CoRegen: 1050 },
    { month: "Feb", "C-POLAR": 1890, Oxia: 1480, CoRegen: 1180 },
    { month: "Mar", "C-POLAR": 2100, Oxia: 1640, CoRegen: 1340 },
    { month: "Apr", "C-POLAR": 2380, Oxia: 1810, CoRegen: 1490 },
  ],
  engagementByDay: [
    { day: "Mon", rate: 2.4 },
    { day: "Tue", rate: 4.9 },
    { day: "Wed", rate: 6.3 },
    { day: "Thu", rate: 5.8 },
    { day: "Fri", rate: 3.7 },
    { day: "Sat", rate: 1.6 },
    { day: "Sun", rate: 1.1 },
  ],
  weeklyImpressions: [
    { week: "W1",  impressions: 11200 },
    { week: "W2",  impressions: 13800 },
    { week: "W3",  impressions: 12400 },
    { week: "W4",  impressions: 16700 },
    { week: "W5",  impressions: 14900 },
    { week: "W6",  impressions: 19200 },
    { week: "W7",  impressions: 21400 },
    { week: "W8",  impressions: 18600 },
    { week: "W9",  impressions: 23100 },
    { week: "W10", impressions: 26400 },
    { week: "W11", impressions: 24800 },
    { week: "W12", impressions: 29300 },
  ],
};

// ── Style helpers ─────────────────────────────────────────────────────────────
const T = "#1A1A1A";           // primary text
const T2 = "rgba(26,26,26,0.55)";
const T3 = "rgba(26,26,26,0.35)";
const GOLD = "#C9A84C";

const glass = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "#FFFFFF",
  border: "1px solid rgba(26,26,26,0.08)",
  borderRadius: "8px",
  ...extra,
});

const glassElevated = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "#F5F2EE",
  border: "1px solid rgba(26,26,26,0.08)",
  borderRadius: "8px",
  ...extra,
});

const INPUT: React.CSSProperties = {
  width: "100%",
  background: "#FFFFFF",
  border: "1px solid rgba(26,26,26,0.12)",
  borderRadius: "6px",
  padding: "11px 14px",
  fontSize: "14px",
  color: "#1A1A1A",
  outline: "none",
  fontFamily: "inherit",
  lineHeight: 1.7,
  transition: "border-color 0.2s",
};

// ── Sub-components ────────────────────────────────────────────────────────────
function CompanyLogo({ company, overlay }: { company: Company; overlay?: boolean }) {
  const src = LOGO_FILES[company.id] || company.logo_file || null;
  const shouldInvert = (company.brand as Record<string,unknown> | undefined)?.invert_logo;
  const invertFilter = shouldInvert ? "brightness(0) invert(1) " : "";
  const shadowFilter = overlay ? "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" : "";
  const filter = `${invertFilter}${shadowFilter}`.trim() || "none";
  if (!src) return <span style={{ color: T, fontWeight: 700, fontSize: "14px", filter: shadowFilter || "none" }}>{(company.brand as Record<string,unknown> | undefined)?.logoText as string || (company.brand as Record<string,unknown> | undefined)?.logo_text as string || company.name}</span>;
  return (
    <div style={{ background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={company.name}
        style={{ maxWidth: "160px", maxHeight: overlay ? "60px" : "80px", width: "auto", height: "auto", objectFit: "contain", display: "block", filter }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; border: string }> = {
    draft:            { bg: "rgba(26,26,26,0.04)",    color: T2,        border: "rgba(26,26,26,0.12)"     },
    pending_approval: { bg: "rgba(201,168,76,0.08)",  color: "#9C7A2A", border: "rgba(201,168,76,0.30)"   },
    approved:         { bg: "rgba(34,85,204,0.08)",   color: "#2255CC", border: "rgba(34,85,204,0.25)"    },
    scheduled:        { bg: "rgba(102,51,204,0.08)",  color: "#6633CC", border: "rgba(102,51,204,0.25)"   },
    posted:           { bg: "rgba(43,191,176,0.08)",  color: "#1D8A7F", border: "rgba(43,191,176,0.28)"   },
    paid:             { bg: "rgba(43,191,176,0.08)",  color: "#1D8A7F", border: "rgba(43,191,176,0.28)"   },
    pending:          { bg: "rgba(201,168,76,0.08)",  color: "#9C7A2A", border: "rgba(201,168,76,0.30)"   },
    overdue:          { bg: "rgba(204,51,51,0.08)",   color: "#cc3333", border: "rgba(204,51,51,0.25)"    },
  };
  const s = cfg[status] ?? cfg.draft;
  return (
    <span style={{
      fontSize: "9px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase",
      padding: "3px 8px", borderRadius: "4px",
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontFamily: "var(--font-inter, system-ui, sans-serif)",
    }}>
      {status.replace("_", " ")}
    </span>
  );
}

function Spinner() {
  return <span style={{ width: "14px", height: "14px", border: "1.5px solid rgba(26,26,26,0.14)", borderTopColor: T, borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block", flexShrink: 0 }} />;
}

function GlassBtn({
  onClick, disabled, variant = "ghost", style = {}, children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  variant?: "ghost" | "primary" | "teal" | "danger";
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const variants: Record<string, React.CSSProperties> = {
    ghost:   { background: "transparent",            border: "1px solid rgba(26,26,26,0.14)",   color: T2 },
    primary: { background: "rgba(26,26,26,0.07)",    border: "1px solid rgba(26,26,26,0.20)",   color: T  },
    teal:    { background: "rgba(43,191,176,0.08)",  border: "1px solid rgba(43,191,176,0.30)", color: "#2BBFB0" },
    danger:  { background: "rgba(204,68,68,0.08)",   border: "1px solid rgba(204,68,68,0.25)",  color: "#cc3333" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        padding: "7px 16px",
        borderRadius: "6px",
        fontSize: "12px", fontWeight: 500,
        letterSpacing: "0.01em",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.15s ease",
        fontFamily: "inherit",
        ...variants[variant],
        ...style,
      }}
      onMouseEnter={e => { if (!disabled) { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,26,26,0.30)"; } }}
      onMouseLeave={e => { if (!disabled) { (e.currentTarget as HTMLElement).style.borderColor = (variants[variant].border as string).replace("1px solid ", ""); } }}
    >
      {children}
    </button>
  );
}

// ── Company Switcher dropdown ─────────────────────────────────────────────────
function CompanySwitcher({ ac, clients, onChange }: { ac: Company; clients: Company[]; onChange: (c: Company) => void })  {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "6px 12px 6px 10px",
          background: "transparent",
          border: "1px solid rgba(26,26,26,0.12)",
          borderRadius: "6px",
          cursor: "pointer",
          transition: "border-color 0.15s ease",
          fontFamily: "inherit",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,26,26,0.22)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,26,26,0.12)"; }}
      >
        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: ac.color, flexShrink: 0 }} />
        <span style={{ fontSize: "12px", fontWeight: 400, color: T2, maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ac.name}</span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.4, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          minWidth: "200px",
          background: "#FFFFFF",
          border: "1px solid rgba(26,26,26,0.10)",
          borderRadius: "8px",
          padding: "4px",
          zIndex: 100,
          animation: "slideDown 0.15s ease both",
        }}>
          {clients.map(c => (
            <button
              key={c.id}
              onClick={() => { onChange(c); setOpen(false); }}
              style={{
                width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: "10px",
                padding: "9px 12px",
                background: ac.id === c.id ? "rgba(26,26,26,0.05)" : "transparent",
                border: "none", borderRadius: "5px",
                cursor: "pointer", transition: "background 0.1s ease",
                fontFamily: "inherit",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(26,26,26,0.05)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ac.id === c.id ? "rgba(26,26,26,0.05)" : "transparent"; }}
            >
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: c.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12px", fontWeight: 400, color: ac.id === c.id ? T : T2 }}>{c.name}</div>
                <div style={{ fontSize: "10px", color: T3, marginTop: "1px", letterSpacing: "0.04em" }}>{c.timezone}</div>
              </div>
              {ac.id === c.id && (
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M2.5 7l3 3 6-6" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type = "default" }: { message: string; type?: "default" | "success" | "error" }) {
  const configs = {
    default: { bg: "#FFFFFF", border: "rgba(26,26,26,0.12)",    color: T2,        icon: "·" },
    success: { bg: "#FFFFFF", border: "rgba(43,191,176,0.30)",  color: "#1D8A7F", icon: "✓" },
    error:   { bg: "#FFFFFF", border: "rgba(204,51,51,0.30)",   color: "#cc3333", icon: "✕" },
  };
  const cfg = configs[type];
  return (
    <div style={{
      position: "fixed", top: "24px", right: "24px", zIndex: 9999,
      display: "flex", alignItems: "center", gap: "10px",
      padding: "12px 20px",
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: "8px",
      animation: "toastIn 0.3s cubic-bezier(0.16,1,0.3,1) both",
    }}>
      <span style={{ fontSize: "12px", color: cfg.color, fontWeight: 600 }}>{cfg.icon}</span>
      <span style={{ fontSize: "13px", fontWeight: 400, color: T, letterSpacing: "-0.01em" }}>{message}</span>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ ac, clients, posts, allPosts }: { ac: Company; clients: Company[]; posts: Post[]; allPosts: Post[] }) {
  const stats = {
    scheduled: posts.filter(p => p.status === "approved").length,
    published:  posts.filter(p => p.status === "posted").length,
    drafts:     posts.filter(p => p.status === "draft").length,
    total:      posts.length,
  };

  const statCards = [
    { label: "Posts Scheduled", value: stats.scheduled, color: "#2255CC" },
    { label: "Posts Published",  value: stats.published,  color: "#2BBFB0" },
    { label: "In Draft",         value: stats.drafts,     color: GOLD      },
    { label: "Total Posts",      value: stats.total,      color: ac.color  },
  ];

  const recent = allPosts.slice(0, 8);

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px" }}>
        {statCards.map((s, i) => (
          <div key={s.label} className={`fade-up fade-up-${i + 1 as 1|2|3|4}`} style={glass({
            padding: "24px 24px 20px",
            position: "relative", overflow: "hidden",
          })}>
            {/* Colored top accent line */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: s.color, opacity: 0.7 }} />
            <div className="label" style={{ marginBottom: "16px" }}>{s.label}</div>
            <div style={{
              fontFamily: "var(--font-cormorant, 'Cormorant Garamond', Georgia, serif)",
              fontSize: "48px", fontWeight: 300,
              color: T, letterSpacing: "-0.02em", lineHeight: 1,
            }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "16px" }}>

        {/* Company overview */}
        <div style={glass({ padding: "28px" })}>
          <div style={{ marginBottom: "24px", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div>
              <div className="label" style={{ marginBottom: "6px" }}>Active portfolio</div>
              <div style={{
                fontFamily: "var(--font-cormorant, 'Cormorant Garamond', Georgia, serif)",
                fontSize: "28px", fontWeight: 300, fontStyle: "italic",
                letterSpacing: "-0.02em", color: T, lineHeight: 1,
              }}>
                {clients.length} Companies
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {clients.map((c, i) => (
              <div key={c.id} style={{
                display: "flex", alignItems: "center", gap: "14px",
                padding: "13px 0",
                borderBottom: i < clients.length - 1 ? "1px solid rgba(26,26,26,0.07)" : "none",
              }}>
                <div style={{ width: "3px", height: "28px", borderRadius: "2px", background: c.color, flexShrink: 0, opacity: ac.id === c.id ? 1 : 0.35 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 400, color: ac.id === c.id ? T : T2, marginBottom: "2px" }}>{c.name}</div>
                  <div style={{ fontSize: "11px", color: T3, letterSpacing: "0.02em" }}>{c.tagline}</div>
                </div>
                <span style={{ fontSize: "9px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: T3 }}>{c.timezone}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div style={glass({ padding: "24px" })}>
          <div className="label" style={{ marginBottom: "20px" }}>Recent activity</div>
          {recent.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: T3, fontSize: "13px" }}>
              No posts yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {recent.map((p, i) => (
                <div key={p.id} style={{
                  display: "flex", gap: "12px", alignItems: "flex-start",
                  padding: "12px 0",
                  borderBottom: i < recent.length - 1 ? "1px solid rgba(26,26,26,0.07)" : "none",
                }}>
                  <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: p.status === "posted" ? "#2BBFB0" : p.status === "approved" ? "#2255CC" : p.status === "pending_approval" ? GOLD : T3, marginTop: "6px", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", color: T2, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                      {p.content.slice(0, 80)}…
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "5px" }}>
                      <span style={{ fontSize: "10px", color: T3 }}>{p.company_name}</span>
                      <span style={{ fontSize: "10px", color: "rgba(26,26,26,0.18)" }}>·</span>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Compose Tab ───────────────────────────────────────────────────────────────
function ComposeTab({
  ac, ap, setAp, post, setPost,
  isGen, isSave, isVisual, isRefining, isVisualRefining,
  svg, setSvg, vizType, setVizType,
  refineRequest, setRefineRequest,
  svgRefineRequest, setSvgRefineRequest,
  imgUrl, imgProvider, isImgGen, clearImgUrl,
  generate, generateVisual, generateAiImage, refinePost, refineVisual, savePost, copy, downloadSvg, notify,
}: {
  ac: Company; ap: Pillar; setAp: (p: Pillar) => void;
  post: string; setPost: (s: string) => void;
  isGen: boolean; isSave: boolean; isVisual: boolean; isRefining: boolean; isVisualRefining: boolean;
  svg: string; setSvg: (s: string) => void; vizType: VisualType; setVizType: (v: VisualType) => void;
  refineRequest: string; setRefineRequest: (s: string) => void;
  svgRefineRequest: string; setSvgRefineRequest: (s: string) => void;
  imgUrl: string; imgProvider: string; isImgGen: boolean; clearImgUrl: () => void;
  generate: () => void; generateVisual: (postContentOverride?: string) => void; generateAiImage: (editRequest?: string, postContentOverride?: string) => void;
  refinePost: () => void; refineVisual: () => void;
  savePost: (s: "draft" | "approved", imageUrl?: string) => void;
  copy: (t: string) => void; downloadSvg: () => void; notify: (m: string, t?: "default" | "success" | "error") => void;
}) {
  const [imageMode, setImageMode] = useState<"ai" | "svg">("ai");
  const [imgEditRequest, setImgEditRequest] = useState("");
  const [genMode, setGenMode] = useState<"post" | "standalone">("post");
  const [standaloneBrief, setStandaloneBrief] = useState("");
  const charCount = post.length;
  const charLimit = 3000;
  const charPct = Math.min(charCount / charLimit, 1);
  const charColor = charCount > 2800 ? "#cc3333" : charCount > 2500 ? "#C9A84C" : "#2BBFB0";

  return (
    <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "20px" }}>

      {/* ── Left panel ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* Company card */}
        <div style={glass({ overflow: "hidden" })}>
          <div style={{ padding: "20px", borderBottom: "1px solid rgba(26,26,26,0.08)" }}>
            <CompanyLogo company={ac} />
            <div style={{
              fontFamily: "var(--font-cormorant, 'Cormorant Garamond', Georgia, serif)",
              fontSize: "13px", fontStyle: "italic", fontWeight: 300,
              color: T3, marginTop: "10px", letterSpacing: "0.02em",
            }}>{ac.tagline}</div>
          </div>
          <div style={{ padding: "14px", display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {(ac.brand?.badges ?? []).map(b => (
              <span key={b} style={{ fontSize: "9px", fontWeight: 500, padding: "3px 8px", background: "rgba(26,26,26,0.04)", border: "1px solid rgba(26,26,26,0.09)", color: T3, borderRadius: "4px", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{b}</span>
            ))}
          </div>
        </div>

        {/* Brand voice */}
        <div style={glass({ padding: "16px" })}>
          <div style={{ width: "24px", height: "2px", background: ac.color, marginBottom: "10px", opacity: 0.7 }} />
          <div className="label" style={{ marginBottom: "8px" }}>Brand voice</div>
          <p style={{ fontSize: "12px", lineHeight: 1.7, color: T3 }}>{ac.voice}</p>
        </div>

        {/* Pillars */}
        <div style={glass()}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(26,26,26,0.08)" }}>
            <div className="label">Content pillars</div>
          </div>
          <div style={{ padding: "8px" }}>
            {ac.pillars.map(p => (
              <button key={p.type} onClick={() => setAp(p)}
                style={{
                  width: "100%", textAlign: "left",
                  padding: "10px 12px",
                  background: ap.type === p.type ? "rgba(26,26,26,0.05)" : "transparent",
                  border: "none",
                  borderBottom: `none`,
                  borderRadius: "6px",
                  cursor: "pointer", transition: "all 0.15s ease", marginBottom: "2px",
                  fontFamily: "inherit",
                  position: "relative" as const,
                }}>
                {ap.type === p.type && (
                  <div style={{ position: "absolute", left: 0, top: "6px", bottom: "6px", width: "2px", borderRadius: "2px", background: p.color }} />
                )}
                <div style={{ fontSize: "12px", fontWeight: 400, color: ap.type === p.type ? T : T2, marginBottom: "2px", paddingLeft: ap.type === p.type ? "10px" : "0", transition: "padding 0.15s" }}>
                  {p.day} · {p.type}
                </div>
                <div style={{ fontSize: "11px", color: T3, lineHeight: 1.5, paddingLeft: ap.type === p.type ? "10px" : "0", transition: "padding 0.15s" }}>{p.example.slice(0, 72)}…</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panels ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Generator */}
        <div style={glass()}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(26,26,26,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="label" style={{ marginBottom: "6px" }}>Generating for</div>
              <div style={{
                fontFamily: "var(--font-cormorant, 'Cormorant Garamond', Georgia, serif)",
                fontSize: "22px", fontWeight: 300, fontStyle: "italic",
                color: T, letterSpacing: "-0.01em", lineHeight: 1,
              }}>
                {ap.type}
                <span style={{ color: T3, fontStyle: "normal", fontSize: "14px", fontFamily: "var(--font-inter, system-ui, sans-serif)", fontWeight: 400 }}> · {ap.day} · {ac.name}</span>
              </div>
            </div>
            <GlassBtn onClick={generate} disabled={isGen} variant="primary" style={{ gap: "8px" }}>
              {isGen ? <><Spinner /> Writing…</> : "Generate ↗"}
            </GlassBtn>
          </div>

          <div style={{ padding: "20px 24px" }}>
            {post ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "16px", alignItems: "start" }}>
                {/* Editor */}
                <div>
                  <div style={{ position: "relative" }}>
                    <textarea
                      value={post}
                      onChange={e => setPost(e.target.value)}
                      rows={11}
                      style={{ ...INPUT, resize: "none" }}
                      onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                      onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                    />
                    {/* Char counter */}
                    <div style={{ position: "absolute", bottom: "12px", right: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="rgba(26,26,26,0.12)" strokeWidth="2.5" fill="none" />
                        <circle cx="12" cy="12" r="10" stroke={charColor} strokeWidth="2.5" fill="none"
                          strokeDasharray={`${charPct * 62.8} 62.8`}
                          strokeLinecap="round"
                          transform="rotate(-90 12 12)"
                          style={{ transition: "stroke-dasharray 0.3s ease" }}
                        />
                      </svg>
                      <span style={{ fontSize: "11px", color: charCount > 2800 ? charColor : "rgba(26,26,26,0.35)", fontWeight: 500 }}>
                        {charLimit - charCount}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                    <GlassBtn onClick={() => copy(post)}>Copy</GlassBtn>
                    <GlassBtn onClick={() => savePost("draft", imageMode === "ai" ? imgUrl || undefined : undefined)} disabled={isSave}>Save draft</GlassBtn>
                    <GlassBtn onClick={() => savePost("approved", imageMode === "ai" ? imgUrl || undefined : undefined)} disabled={isSave} variant="teal">Approve & save</GlassBtn>
                    <GlassBtn onClick={generate} disabled={isGen}>Regenerate</GlassBtn>
                  </div>
                </div>

                {/* LinkedIn Preview */}
                <div style={{ background: "#f3f2ef", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(26,26,26,0.08)" }}>
                  <div style={{ padding: "16px", background: "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: `linear-gradient(135deg, ${ac.color}cc, ${ac.color}55)`, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#000", lineHeight: 1.3 }}>{ac.name}</div>
                        <div style={{ fontSize: "11px", color: "#666", lineHeight: 1.4 }}>{ac.tagline}</div>
                        <div style={{ fontSize: "10px", color: "#888" }}>Just now · 🌐</div>
                      </div>
                    </div>
                    <p style={{ fontSize: "13px", color: "#000", lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: "200px", overflow: "auto" }}>
                      {post.slice(0, 300)}{post.length > 300 ? "… see more" : ""}
                    </p>
                  </div>
                  <div style={{ padding: "8px 16px", background: "#f3f2ef", borderTop: "1px solid #e0dfdc", display: "flex", gap: "4px" }}>
                    {["👍 Like", "💬 Comment", "🔁 Repost", "✉️ Send"].map(action => (
                      <div key={action} style={{ flex: 1, textAlign: "center", fontSize: "10px", color: "#666", padding: "6px 2px", borderRadius: "4px" }}>{action}</div>
                    ))}
                  </div>
                </div>
              </div>
            ) : isGen ? (
              <div style={{ height: "200px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
                <Spinner />
                <p style={{ fontSize: "13px", color: T3, fontFamily: "var(--font-cormorant, serif)", fontStyle: "italic", fontSize: "16px" } as React.CSSProperties}>Writing in {ac.name}&apos;s voice…</p>
              </div>
            ) : (
              <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(26,26,26,0.08)", borderRadius: "8px", flexDirection: "column", gap: "12px" }}>
                <div style={{ width: "32px", height: "1px", background: GOLD, opacity: 0.4 }} />
                <p style={{ fontSize: "13px", color: T3, fontFamily: "var(--font-cormorant, serif)", fontStyle: "italic" }}>Select a pillar and generate</p>
              </div>
            )}
          </div>
        </div>

        {/* Refine */}
        {post && (
          <div className="fade-up fade-up-1" style={glass({ padding: "20px 24px" })}>
            <div className="label" style={{ marginBottom: "14px" }}>Refine this post</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
              {["Make it shorter","Make it punchier","Add more data","Strengthen the hook","More urgent","Soften the tone","Add a statistic","Change the question"].map(s => (
                <button key={s} onClick={() => setRefineRequest(s)}
                  style={{
                    fontSize: "12px", padding: "6px 12px",
                    background: refineRequest === s ? "rgba(201,168,76,0.08)" : "transparent",
                    border: refineRequest === s ? "1px solid rgba(201,168,76,0.3)" : "1px solid rgba(26,26,26,0.09)",
                    borderRadius: "6px", color: refineRequest === s ? GOLD : T3,
                    cursor: "pointer", transition: "all 0.15s ease", fontFamily: "inherit", fontWeight: 500,
                  }}>
                  {s}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text" value={refineRequest}
                onChange={e => setRefineRequest(e.target.value)}
                onKeyDown={e => e.key === "Enter" && refinePost()}
                placeholder="Or describe any change…"
                style={{ ...INPUT, flex: 1, padding: "9px 14px" }}
                onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
              />
              <GlassBtn onClick={refinePost} disabled={isRefining || !refineRequest.trim()} variant="primary">
                {isRefining ? <><Spinner /> Refining…</> : "Apply ↗"}
              </GlassBtn>
            </div>
          </div>
        )}

        {/* Visual generator — always visible */}
        <div className="fade-up fade-up-2" style={glass({ padding: "20px 24px" })}>
          {/* Row 1: label + gen mode toggle + AI/SVG toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div className="label">Generate visual</div>
              {/* Generate-from toggle */}
              <div style={{ display: "flex", gap: "2px", background: "rgba(26,26,26,0.04)", border: "1px solid rgba(26,26,26,0.12)", borderRadius: "9px", padding: "3px" }}>
                {(["post", "standalone"] as const).map(m => (
                  <button key={m} onClick={() => setGenMode(m)}
                    style={{
                      fontSize: "11px", fontWeight: 600, padding: "4px 11px",
                      background: genMode === m ? "rgba(26,26,26,0.08)" : "transparent",
                      border: "none", borderRadius: "6px",
                      color: genMode === m ? T : T3,
                      cursor: "pointer", letterSpacing: "0.04em",
                      transition: "all 0.15s ease", fontFamily: "inherit", whiteSpace: "nowrap",
                    }}>
                    {m === "post" ? "From post" : "Standalone"}
                  </button>
                ))}
              </div>
            </div>
            {/* AI/SVG toggle */}
            <div style={{ display: "flex", gap: "2px", background: "rgba(26,26,26,0.04)", border: "1px solid rgba(26,26,26,0.12)", borderRadius: "9px", padding: "3px" }}>
              {(["ai", "svg"] as const).map(m => (
                <button key={m} onClick={() => setImageMode(m)}
                  style={{
                    fontSize: "11px", fontWeight: 600, padding: "4px 12px",
                    background: imageMode === m ? "rgba(26,26,26,0.08)" : "transparent",
                    border: "none", borderRadius: "6px",
                    color: imageMode === m ? T : T3,
                    cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em",
                    transition: "all 0.15s ease", fontFamily: "inherit",
                  }}>
                  {m === "ai" ? "AI Image" : "SVG"}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: visual type chips */}
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "14px" }}>
            {(imageMode === "ai"
              ? (["quote","stat","brand","science","photo"] as VisualType[])
              : (["quote","stat","brand","science"] as VisualType[])
            ).map(t => (
              <button key={t} onClick={() => setVizType(t)}
                style={{
                  fontSize: "11px", fontWeight: 600, padding: "5px 12px",
                  background: vizType === t ? "rgba(201,168,76,0.08)" : "transparent",
                  border: vizType === t ? `1px solid rgba(201,168,76,0.3)` : "1px solid rgba(26,26,26,0.09)",
                  borderRadius: "6px", color: vizType === t ? GOLD : T3,
                  cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em",
                  transition: "all 0.15s ease", fontFamily: "inherit",
                }}>
                {t}
              </button>
            ))}
          </div>

          {/* Standalone brief input */}
          {genMode === "standalone" && (
            <textarea
              value={standaloneBrief}
              onChange={e => setStandaloneBrief(e.target.value)}
              rows={3}
              placeholder="What should this visual be about? e.g. A bold statement about ambient protection technology, showing the invisible shield concept..."
              style={{ ...INPUT, resize: "vertical", marginBottom: "14px", fontSize: "13px", lineHeight: 1.6 }}
              onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
              onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
            />
          )}

          {imageMode === "ai" ? (
            /* ── AI Image mode ── */
            imgUrl ? (
              <>
                <div style={{ border: "1px solid rgba(26,26,26,0.09)", borderRadius: "8px", overflow: "hidden", marginBottom: "12px", position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgUrl} alt="AI generated visual" style={{ width: "100%", display: "block" }} />
                  {imgProvider && (
                    <span style={{ position: "absolute", top: "10px", right: "10px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 8px", background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "rgba(255,255,255,0.65)", backdropFilter: "blur(8px)" }}>
                      {imgProvider}
                    </span>
                  )}
                  <div style={{ position: "absolute", bottom: "16px", left: "16px" }}>
                    <CompanyLogo company={ac} overlay />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                  <GlassBtn onClick={() => { const a = document.createElement("a"); a.href = imgUrl; a.download = `${ac.id}-${vizType}-${Date.now()}.png`; a.click(); notify("Image downloaded", "success"); }}>Download</GlassBtn>
                  <GlassBtn onClick={() => generateAiImage(undefined, genMode === "standalone" ? standaloneBrief : undefined)} disabled={isImgGen}>{isImgGen ? <><Spinner /> Regenerating…</> : "Regenerate"}</GlassBtn>
                  <GlassBtn onClick={clearImgUrl} variant="ghost">Clear</GlassBtn>
                </div>
                <div style={{ borderTop: "1px solid rgba(26,26,26,0.08)", paddingTop: "16px" }}>
                  <div className="label" style={{ marginBottom: "10px" }}>Edit this image</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "10px" }}>
                    {["Change the color scheme","Make it more minimal","Bolder typography","Add more contrast","Brighter background","Darker mood","More whitespace","Stronger visual hierarchy"].map(s => (
                      <button key={s} onClick={() => setImgEditRequest(s)}
                        style={{
                          fontSize: "11px", padding: "5px 10px",
                          background: imgEditRequest === s ? "rgba(201,168,76,0.08)" : "transparent",
                          border: imgEditRequest === s ? "1px solid rgba(201,168,76,0.3)" : "1px solid rgba(26,26,26,0.09)",
                          borderRadius: "6px", color: imgEditRequest === s ? GOLD : T3,
                          cursor: "pointer", transition: "all 0.15s ease", fontFamily: "inherit", fontWeight: 500,
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text" value={imgEditRequest}
                      onChange={e => setImgEditRequest(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && imgEditRequest.trim()) { generateAiImage(imgEditRequest, genMode === "standalone" ? standaloneBrief : undefined); setImgEditRequest(""); } }}
                      placeholder="Describe your edit…"
                      style={{ ...INPUT, flex: 1, padding: "9px 14px" }}
                      onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                      onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                    />
                    <GlassBtn onClick={() => { if (imgEditRequest.trim()) { generateAiImage(imgEditRequest, genMode === "standalone" ? standaloneBrief : undefined); setImgEditRequest(""); } }} disabled={isImgGen || !imgEditRequest.trim()} variant="primary">
                      {isImgGen ? <><Spinner /> Applying…</> : "Apply ↗"}
                    </GlassBtn>
                  </div>
                </div>
              </>
            ) : (
              <GlassBtn
                onClick={() => generateAiImage(undefined, genMode === "standalone" ? standaloneBrief : undefined)}
                disabled={isImgGen || (genMode === "standalone" && !standaloneBrief.trim())}
                variant="ghost"
                style={{ width: "100%", justifyContent: "center", padding: "14px" }}
              >
                {isImgGen ? <><Spinner /> Generating…</> : `Generate ${vizType} image ↗`}
              </GlassBtn>
            )
          ) : (
            /* ── SVG mode ── */
            svg ? (
              <>
                <div style={{ border: "1px solid rgba(26,26,26,0.09)", borderRadius: "8px", overflow: "hidden", marginBottom: "12px", position: "relative" }}>
                  <div dangerouslySetInnerHTML={{ __html: svg }} />
                  <div style={{ position: "absolute", bottom: "16px", left: "16px" }}>
                    <CompanyLogo company={ac} overlay />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                  <GlassBtn onClick={downloadSvg}>Download SVG</GlassBtn>
                  <GlassBtn onClick={() => generateVisual(genMode === "standalone" ? standaloneBrief : undefined)} disabled={isVisual}>Regenerate</GlassBtn>
                  <GlassBtn onClick={() => setSvg("")} variant="ghost">Clear</GlassBtn>
                </div>
                <div style={{ borderTop: "1px solid rgba(26,26,26,0.08)", paddingTop: "16px" }}>
                  <div className="label" style={{ marginBottom: "10px" }}>Edit this image</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "10px" }}>
                    {["Make the background darker","Use larger headline text","Add more white space","Make it more minimal","Increase contrast","Bolder typography","Lighter background","More padding"].map(s => (
                      <button key={s} onClick={() => setSvgRefineRequest(s)}
                        style={{
                          fontSize: "11px", padding: "5px 10px",
                          background: svgRefineRequest === s ? "rgba(43,191,176,0.08)" : "transparent",
                          border: svgRefineRequest === s ? "1px solid rgba(43,191,176,0.3)" : "1px solid rgba(26,26,26,0.09)",
                          borderRadius: "6px", color: svgRefineRequest === s ? "#2BBFB0" : T3,
                          cursor: "pointer", transition: "all 0.15s ease", fontFamily: "inherit", fontWeight: 500,
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text" value={svgRefineRequest}
                      onChange={e => setSvgRefineRequest(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && refineVisual()}
                      placeholder="Describe your edit request…"
                      style={{ ...INPUT, flex: 1, padding: "9px 14px" }}
                      onFocus={e => e.target.style.borderColor = "rgba(43,191,176,0.3)"}
                      onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                    />
                    <GlassBtn onClick={refineVisual} disabled={isVisualRefining || !svgRefineRequest.trim()} variant="teal">
                      {isVisualRefining ? <><Spinner /> Applying…</> : "Apply ↗"}
                    </GlassBtn>
                  </div>
                </div>
              </>
            ) : (
              <GlassBtn
                onClick={() => generateVisual(genMode === "standalone" ? standaloneBrief : undefined)}
                disabled={isVisual || (genMode === "standalone" && !standaloneBrief.trim())}
                variant="ghost"
                style={{ width: "100%", justifyContent: "center", padding: "14px" }}
              >
                {isVisual ? <><Spinner /> Creating…</> : `Generate ${vizType} card ↗`}
              </GlassBtn>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ── Library Tab ───────────────────────────────────────────────────────────────
function LibraryTab({
  ac, posts, filterStatus, setFilterStatus,
  fetchPosts, notify, copy,
}: {
  ac: Company; posts: Post[]; filterStatus: string; setFilterStatus: (s: string) => void;
  fetchPosts: () => void; notify: (m: string, t?: "default" | "success" | "error") => void; copy: (t: string) => void;
}) {
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState("");

  const updateStatus = async (p: Post, s: Post["status"]) => {
    await fetch("/api/posts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, status: s }) });
    fetchPosts();
    if (s === "pending_approval") notify("Submitted for client approval", "success");
    else notify(`Status updated to ${s}`, "success");
  };
  const deletePost = async (id: number) => {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/posts?id=${id}`, { method: "DELETE" }); fetchPosts(); notify("Post deleted");
  };
  const saveEdit = async () => {
    if (!editPost) return;
    await fetch("/api/posts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editPost.id, content: editContent }) });
    setEditPost(null); fetchPosts(); notify("Post updated", "success");
  };

  return (
    <div className="fade-up">
      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "24px", borderBottom: "1px solid rgba(26,26,26,0.08)", paddingBottom: "16px" }}>
        {(["all","draft","pending_approval","approved","posted"] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{
              fontSize: "10px", fontWeight: 500, padding: "5px 14px",
              background: "transparent",
              border: "none",
              borderBottom: filterStatus === s ? `1px solid ${GOLD}` : "1px solid transparent",
              color: filterStatus === s ? T : T3,
              borderRadius: "0",
              cursor: "pointer",
              transition: "all 0.15s ease", fontFamily: "var(--font-inter, system-ui, sans-serif)",
              textTransform: "uppercase" as const, letterSpacing: "0.1em",
              marginBottom: "-17px", paddingBottom: "16px",
            }}>
            {s.replace("_", " ")}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: "11px", color: T3 }}>{posts.length} posts</span>
      </div>

      {posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "100px 0" }}>
          <div style={{ width: "32px", height: "1px", background: GOLD, opacity: 0.3, margin: "0 auto 20px" }} />
          <p style={{ fontSize: "14px", color: T3, fontFamily: "var(--font-cormorant, serif)", fontStyle: "italic" }}>No posts yet for {ac.name}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {posts.map((p, i) => (
            <div key={p.id} className={`fade-up fade-up-${Math.min(i, 3) + 1 as 1|2|3|4}`} style={{
              borderBottom: "1px solid rgba(26,26,26,0.08)",
            }}>
              {editPost?.id === p.id ? (
                <div style={{ padding: "20px 0" }}>
                  <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={10}
                    style={{ ...INPUT, resize: "none" }}
                    onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                    onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                  />
                  <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                    <GlassBtn onClick={saveEdit} variant="teal">Save changes</GlassBtn>
                    <GlassBtn onClick={() => setEditPost(null)}>Cancel</GlassBtn>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ padding: "16px 0 10px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <div style={{ width: "3px", height: "14px", borderRadius: "2px", background: ac.color, flexShrink: 0 }} />
                    <span style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: T3 }}>{p.post_type}</span>
                    <span style={{ color: "rgba(26,26,26,0.18)" }}>·</span>
                    <span style={{ fontSize: "10px", letterSpacing: "0.06em", textTransform: "uppercase" as const, color: T3 }}>{p.scheduled_day}</span>
                    <div style={{ marginLeft: "auto" }}><StatusBadge status={p.status} /></div>
                  </div>
                  <div style={{ padding: "0 0 16px 15px" }}>
                    {p.image_url && (
                      <div style={{ marginBottom: "14px", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(26,26,26,0.09)" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image_url} alt="Post visual" style={{ width: "100%", maxHeight: "280px", objectFit: "cover", display: "block" }} />
                      </div>
                    )}
                    <p style={{ fontSize: "14px", lineHeight: 1.8, color: T2, whiteSpace: "pre-wrap" }}>{p.content}</p>
                    {p.notes && (
                      <div style={{ marginTop: "14px", padding: "10px 14px", background: "rgba(204,68,68,0.05)", border: "1px solid rgba(204,68,68,0.15)", borderRadius: "6px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                        <span style={{ fontSize: "9px", fontWeight: 600, color: "#cc3333", letterSpacing: "0.12em", textTransform: "uppercase" as const, flexShrink: 0, marginTop: "2px" }}>Change request</span>
                        <p style={{ fontSize: "12px", color: "rgba(208,112,112,0.8)", lineHeight: 1.6, margin: 0 }}>{p.notes}</p>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "20px", alignItems: "center", marginTop: "12px", flexWrap: "wrap" }}>
                      {[
                        { label: "Copy", action: () => copy(p.content) },
                        { label: "Edit", action: () => { setEditPost(p); setEditContent(p.content); } },
                      ].map(a => (
                        <button key={a.label} onClick={a.action}
                          style={{ fontSize: "11px", color: T3, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.06em", fontFamily: "inherit", textTransform: "uppercase" as const, transition: "color 0.15s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T2; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T3; }}>
                          {a.label}
                        </button>
                      ))}
                      {p.status === "draft"    && <button onClick={() => updateStatus(p,"pending_approval")} style={{ fontSize: "11px", color: GOLD, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Submit for Approval</button>}
                      {p.status === "draft"    && <button onClick={() => updateStatus(p,"approved")} style={{ fontSize: "11px", color: "#2255CC", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Approve</button>}
                      {p.status === "pending_approval" && <button onClick={() => updateStatus(p,"approved")} style={{ fontSize: "11px", color: "#2255CC", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Approve</button>}
                      {p.status === "approved" && <button onClick={() => updateStatus(p,"posted")}   style={{ fontSize: "11px", color: "#2BBFB0", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Mark posted</button>}
                      <button onClick={() => deletePost(p.id)} style={{ fontSize: "11px", color: "rgba(204,68,68,0.5)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", marginLeft: "auto", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Delete</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Calendar Tab ──────────────────────────────────────────────────────────────
function CalendarTab({ ac, clients }: { ac: Company; clients: Company[] }) {
  const DAY_ORDER = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  // Normalise field names — DB uses snake_case, static companies use camelCase
  const getPostingDays = (c: Company): string[] => {
    const v = (c as Record<string,unknown>).posting_days ?? c.postingDays;
    return Array.isArray(v) ? v as string[] : [];
  };
  const getBestTimes = (c: Company): Record<string,string> => {
    const v = (c as Record<string,unknown>).best_post_times ?? c.bestPostTimes;
    return (v && typeof v === "object" && !Array.isArray(v)) ? v as Record<string,string> : {};
  };

  // Derive unique active posting days sorted by weekday order
  const activeDays = DAY_ORDER.filter(d => clients.some(c => getPostingDays(c).includes(d)));

  // Build strategy cards dynamically from pillar data
  const strategyCards = activeDays.slice(0, 4).map(day => {
    const clientsOnDay = clients.filter(c => getPostingDays(c).includes(day));
    const pillarsOnDay = clientsOnDay.flatMap(c =>
      (Array.isArray(c.pillars) ? c.pillars : []).filter((p: Record<string,unknown>) => p.day === day)
    );
    const types = [...new Set(pillarsOnDay.map((p: Record<string,unknown>) => p.type as string))].filter(Boolean);
    const color = clientsOnDay[0]?.color || "#0066ff";
    return {
      day,
      role: types[0] || "Content",
      desc: types.slice(0, 3).join(" · ") || `${clientsOnDay.length} client${clientsOnDay.length !== 1 ? "s" : ""} posting`,
      color,
    };
  });

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Strategy overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
        {strategyCards.map((s, i) => (
          <div key={s.day} className={`fade-up fade-up-${i + 1 as 1|2|3|4}`} style={glass({ padding: "20px", paddingTop: "22px", position: "relative", overflow: "hidden" })}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: s.color, opacity: 0.65 }} />
            <div className="label" style={{ marginBottom: "10px" }}>{s.day}</div>
            <div style={{
              fontFamily: "var(--font-cormorant, 'Cormorant Garamond', Georgia, serif)",
              fontSize: "18px", fontWeight: 300, fontStyle: "italic",
              color: T, marginBottom: "6px", lineHeight: 1.2,
            }}>{s.role}</div>
            <p style={{ fontSize: "11px", color: T3, lineHeight: 1.6 }}>{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={glass()}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid rgba(26,26,26,0.08)" }}>
          {DAY_ORDER.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: activeDays.includes(d) ? "rgba(26,26,26,0.55)" : "rgba(26,26,26,0.25)", padding: "14px 0", borderRight: "1px solid rgba(26,26,26,0.06)" }}>{d.slice(0,3)}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
          {DAY_ORDER.map(day => {
            const dayCompanies = clients.filter(c => getPostingDays(c).includes(day));
            return (
              <div key={day} style={{ minHeight: "160px", padding: "12px 10px", borderRight: "1px solid rgba(26,26,26,0.06)", borderBottom: "1px solid rgba(26,26,26,0.06)", background: !activeDays.includes(day) ? "rgba(26,26,26,0.03)" : "transparent" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {dayCompanies.map(c => {
                    const pil = (Array.isArray(c.pillars) ? c.pillars : []).find((p: Record<string,unknown>) => p.day === day) as Record<string,unknown> | undefined;
                    const bestTime = getBestTimes(c)[day];
                    const isActive = ac.id === c.id;
                    return (
                      <div key={c.id} style={{
                        padding: "8px 10px",
                        background: isActive ? `${c.color}14` : "rgba(26,26,26,0.03)",
                        border: `1px solid ${isActive ? `${c.color}40` : "rgba(26,26,26,0.08)"}`,
                        borderLeft: `3px solid ${c.color}`,
                        borderRadius: "8px",
                      }}>
                        <div style={{ fontSize: "10px", fontWeight: 600, color: c.color, marginBottom: "3px", letterSpacing: "0.01em" }}>{c.name.split(" ")[0]}</div>
                        {pil && <div style={{ fontSize: "10px", color: "rgba(26,26,26,0.45)" }}>{pil.type as string}</div>}
                        {bestTime && <div style={{ fontSize: "10px", color: c.color, marginTop: "4px", fontWeight: 600 }}>◷ {bestTime}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule table */}
      <div style={glass()}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(26,26,26,0.08)" }}>
          <div className="label" style={{ marginBottom: "6px" }}>Master schedule</div>
          <div style={{ fontFamily: "var(--font-cormorant, 'Cormorant Garamond', Georgia, serif)", fontSize: "22px", fontWeight: 300, fontStyle: "italic", color: T, lineHeight: 1 }}>Posting Calendar</div>
          <p style={{ fontSize: "11px", color: T3, marginTop: "4px" }}>{clients.length} active clients · {activeDays.length} posting days</p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(26,26,26,0.08)" }}>
                {["Company", ...activeDays, "TZ"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "11px 20px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(26,26,26,0.40)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((c, i) => {
                const times = getBestTimes(c);
                return (
                  <tr key={c.id} style={{ borderBottom: i < clients.length - 1 ? "1px solid rgba(26,26,26,0.06)" : "none", background: ac.id === c.id ? "rgba(26,26,26,0.03)" : "transparent" }}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "#1A1A1A", whiteSpace: "nowrap" }}>{c.name}</span>
                      </div>
                    </td>
                    {activeDays.map(day => {
                      const posts = getPostingDays(c).includes(day);
                      return (
                        <td key={day} style={{ padding: "14px 20px", fontSize: "13px", color: times[day] ? "#1A1A1A" : posts ? "rgba(26,26,26,0.45)" : "rgba(26,26,26,0.20)", fontWeight: times[day] ? 500 : 400, whiteSpace: "nowrap" }}>
                          {times[day] ?? (posts ? "✓" : "-")}
                        </td>
                      );
                    })}
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 600, padding: "3px 8px", borderRadius: "6px", background: `${c.color}18`, border: `1px solid ${c.color}40`, color: c.color, letterSpacing: "0.06em" }}>{c.timezone}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Reports Tab ───────────────────────────────────────────────────────────────
function ReportsTab({ ac }: { ac: Company }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const topPosts = [
    { type: "Science insight",  day: "Wednesday", impressions: "8,240", engagement: "6.8%", clicks: "312" },
    { type: "Proof & data",     day: "Thursday",  impressions: "7,190", engagement: "5.9%", clicks: "271" },
    { type: "Thought leadership",day: "Tuesday",  impressions: "6,850", engagement: "5.4%", clicks: "248" },
    { type: "Human story",      day: "Friday",    impressions: "5,420", engagement: "4.7%", clicks: "189" },
    { type: "Product highlight",day: "Wednesday", impressions: "4,970", engagement: "4.2%", clicks: "162" },
  ];

  const chartGrid = "rgba(26,26,26,0.07)";
  const chartText = "rgba(26,26,26,0.40)";

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div className="label" style={{ marginBottom: "6px" }}>Performance Report</div>
          <div style={{ fontFamily: "var(--font-cormorant, 'Cormorant Garamond', Georgia, serif)", fontSize: "32px", fontWeight: 300, fontStyle: "italic", letterSpacing: "-0.02em", color: T, lineHeight: 1, marginBottom: "4px" }}>{ac.name}</div>
          <div style={{ fontSize: "11px", color: T3 }}>Q1–Q2 2026</div>
        </div>
        <GlassBtn variant="ghost" onClick={() => window.print()} style={{ gap: "8px" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 5V2h8v3M3 9H1V5h12v4h-2M3 7h8v5H3V7z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Export PDF
        </GlassBtn>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px" }}>
        {[
          { label: "Total Impressions", value: "148.2K", delta: "+24%", color: "#2255CC" },
          { label: "Avg Engagement",    value: "5.4%",   delta: "+1.2%",color: "#2BBFB0" },
          { label: "Follower Growth",   value: "+1,140", delta: "+34%", color: ac.color  },
          { label: "Link Clicks",       value: "4,820",  delta: "+18%", color: GOLD      },
        ].map(k => (
          <div key={k.label} style={glass({ padding: "20px 20px 18px", position: "relative", overflow: "hidden" })}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: k.color, opacity: 0.65 }} />
            <div className="label" style={{ marginBottom: "12px" }}>{k.label}</div>
            <div style={{ fontFamily: "var(--font-cormorant, 'Cormorant Garamond', Georgia, serif)", fontSize: "36px", fontWeight: 300, color: T, letterSpacing: "-0.02em", marginBottom: "4px", lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: "11px", color: "#2BBFB0" }}>{k.delta} vs last quarter</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        {/* Follower growth */}
        <div style={glass({ padding: "24px" })}>
          <div style={{ marginBottom: "20px" }}>
            <div className="label" style={{ marginBottom: "6px" }}>Follower Growth</div>
            <div style={{ fontFamily: "var(--font-cormorant, serif)", fontSize: "18px", fontWeight: 300, fontStyle: "italic", color: T }}>Oct 2025 – Apr 2026</div>
          </div>
          {mounted ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={REPORT_DATA.followerGrowth}>
                <defs>
                  <linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2255CC" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#2255CC" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gTeal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2BBFB0" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#2BBFB0" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPurp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6633CC" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#6633CC" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: chartText, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartText, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="C-POLAR" stroke="#2255CC" fill="url(#gBlue)" strokeWidth={1.5} dot={false} />
                <Area type="monotone" dataKey="Oxia"    stroke="#2BBFB0" fill="url(#gTeal)" strokeWidth={1.5} dot={false} />
                <Area type="monotone" dataKey="CoRegen" stroke={GOLD}    fill="url(#gPurp)" strokeWidth={1.5} dot={false} />
                <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: "11px", color: "rgba(26,26,26,0.50)" }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="skeleton" style={{ height: 200 }} />
          )}
        </div>

        {/* Engagement by day */}
        <div style={glass({ padding: "24px" })}>
          <div style={{ marginBottom: "20px" }}>
            <div className="label" style={{ marginBottom: "6px" }}>Engagement by Day</div>
            <div style={{ fontFamily: "var(--font-cormorant, serif)", fontSize: "18px", fontWeight: 300, fontStyle: "italic", color: T }}>Average engagement rate %</div>
          </div>
          {mounted ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={REPORT_DATA.engagementByDay} barSize={28}>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: chartText, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartText, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(v) => [`${v}%`, "Engagement"]} />
                <Bar dataKey="rate" fill="#2BBFB0" fillOpacity={0.6} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="skeleton" style={{ height: 200 }} />
          )}
        </div>
      </div>

      {/* Weekly impressions */}
      <div style={glass({ padding: "24px" })}>
        <div style={{ marginBottom: "20px" }}>
          <div className="label" style={{ marginBottom: "6px" }}>Weekly Impressions</div>
          <div style={{ fontFamily: "var(--font-cormorant, serif)", fontSize: "18px", fontWeight: 300, fontStyle: "italic", color: T }}>12-week rolling view</div>
        </div>
        {mounted ? (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={REPORT_DATA.weeklyImpressions}>
              <CartesianGrid stroke={chartGrid} vertical={false} />
              <XAxis dataKey="week" tick={{ fill: chartText, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: chartText, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v) => [String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ","), "Impressions"]} />
              <Line type="monotone" dataKey="impressions" stroke="#2255CC" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: "#2255CC" }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="skeleton" style={{ height: 160 }} />
        )}
      </div>

      {/* Top posts table */}
      <div style={glass()}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(26,26,26,0.08)" }}>
          <div className="label" style={{ marginBottom: "6px" }}>Top Content</div>
          <div style={{ fontFamily: "var(--font-cormorant, serif)", fontSize: "18px", fontWeight: 300, fontStyle: "italic", color: T }}>Best Performing Posts</div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(26,26,26,0.08)" }}>
              {["Post type","Day","Impressions","Eng. rate","Clicks"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "12px 20px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(26,26,26,0.40)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topPosts.map((p, i) => (
              <tr key={i} style={{ borderBottom: i < topPosts.length - 1 ? "1px solid rgba(26,26,26,0.06)" : "none" }}>
                <td style={{ padding: "14px 20px", fontSize: "13px", fontWeight: 500, color: "#1A1A1A" }}>{p.type}</td>
                <td style={{ padding: "14px 20px", fontSize: "12px", color: "rgba(26,26,26,0.55)" }}>{p.day}</td>
                <td style={{ padding: "14px 20px", fontSize: "13px", fontWeight: 600, color: "#1A1A1A" }}>{p.impressions}</td>
                <td style={{ padding: "14px 20px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#2BBFB0" }}>{p.engagement}</span>
                </td>
                <td style={{ padding: "14px 20px", fontSize: "13px", color: "rgba(26,26,26,0.60)" }}>{p.clicks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// ── LogoUploadPanel ───────────────────────────────────────────────────────────
type LogoState = { file: File | null; processing: boolean; originalB64: string | null; displayB64: string | null; brightness: number | null; inverted: boolean };

function LogoUploadPanel({ logo, currentLogoSrc, onFile, onToggleInvert }: {
  logo: LogoState;
  currentLogoSrc?: string;
  onFile: (f: File) => void;
  onToggleInvert: () => void;
}) {
  const inputId = `logo-upload-${Math.random().toString(36).slice(2)}`;
  const rawSrc   = logo.file ? URL.createObjectURL(logo.file) : null;
  const origSrc  = logo.originalB64 ? `data:image/png;base64,${logo.originalB64}` : null;
  const dispSrc  = logo.displayB64  ? `data:image/png;base64,${logo.displayB64}`  : null;
  const panelBg  = "rgba(26,26,26,0.06)";

  return (
    <div style={{ marginBottom: "24px" }}>
      <label style={{ display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.45)", marginBottom: "7px" }}>
        Company Logo — Background Removal
      </label>

      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* File picker */}
        <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "rgba(26,26,26,0.04)", border: "1px solid rgba(26,26,26,0.12)", borderRadius: "6px", fontSize: "12px", color: T3, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap", letterSpacing: "0.04em" }}>
          {logo.file ? logo.file.name : currentLogoSrc ? "Replace logo…" : "Choose file…"}
          <input id={inputId} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        </label>

        {/* Processing spinner */}
        {logo.processing && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 14px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.18)", borderRadius: "6px", fontSize: "12px", color: GOLD }}>
            <Spinner /> Removing background…
          </div>
        )}

        {/* Before / After previews */}
        {(rawSrc || origSrc || dispSrc || currentLogoSrc) && !logo.processing && (
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>

            {/* Before */}
            {rawSrc && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.35)", marginBottom: "5px" }}>Original</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={rawSrc} alt="original" style={{ height: "60px", maxWidth: "140px", objectFit: "contain", background: panelBg, borderRadius: "8px", padding: "6px", border: "1px solid rgba(26,26,26,0.12)" }} />
              </div>
            )}

            {/* Current logo (edit mode, no new upload yet) */}
            {!rawSrc && currentLogoSrc && !origSrc && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.35)", marginBottom: "5px" }}>Current</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentLogoSrc} alt="current" style={{ height: "60px", maxWidth: "140px", objectFit: "contain", background: panelBg, borderRadius: "8px", padding: "6px", border: "1px solid rgba(26,26,26,0.12)" }} />
              </div>
            )}

            {/* After bg removal (original transparent) */}
            {origSrc && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.35)", marginBottom: "5px" }}>
                  Transparent
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={origSrc} alt="transparent" style={{ height: "60px", maxWidth: "140px", objectFit: "contain", background: "repeating-conic-gradient(rgba(255,255,255,0.05) 0% 25%, transparent 0% 50%) 0 0 / 10px 10px", borderRadius: "8px", padding: "6px", border: "1px solid rgba(26,26,26,0.12)" }} />
                {logo.brightness !== null && (
                  <div style={{ fontSize: "10px", color: "rgba(26,26,26,0.35)", marginTop: "3px" }}>
                    Brightness: {Math.round(logo.brightness)}
                  </div>
                )}
              </div>
            )}

            {/* Display version (what will be saved & shown) */}
            {dispSrc && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(43,191,176,0.6)", marginBottom: "5px" }}>
                  Display {logo.inverted ? "(inverted)" : "(original)"}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={dispSrc} alt="display" style={{ height: "60px", maxWidth: "140px", objectFit: "contain", background: "#F5F2EE", borderRadius: "6px", padding: "6px", border: "1px solid rgba(43,191,176,0.2)" }} />
              </div>
            )}

            {/* Invert toggle */}
            {origSrc && dispSrc && (
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: "4px" }}>
                <button
                  onClick={onToggleInvert}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "8px",
                    padding: "7px 14px",
                    background: logo.inverted ? "rgba(43,191,176,0.10)" : "transparent",
                    border: logo.inverted ? "1px solid rgba(43,191,176,0.3)" : "1px solid rgba(26,26,26,0.12)",
                    borderRadius: "6px",
                    fontSize: "12px", fontWeight: 500,
                    color: logo.inverted ? "#2BBFB0" : T3,
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease",
                  }}
                >
                  {/* Toggle switch visual */}
                  <span style={{ width: "28px", height: "16px", borderRadius: "8px", background: logo.inverted ? "#2BBFB0" : "rgba(26,26,26,0.15)", display: "inline-block", position: "relative", flexShrink: 0, transition: "background 0.2s ease" }}>
                    <span style={{ position: "absolute", top: "2px", left: logo.inverted ? "14px" : "2px", width: "12px", height: "12px", borderRadius: "50%", background: "#fff", transition: "left 0.2s ease" }} />
                  </span>
                  Invert for dark background
                </button>
                {logo.inverted && logo.brightness !== null && logo.brightness < 128 && (
                  <div style={{ fontSize: "10px", color: "rgba(43,191,176,0.5)", marginTop: "4px", textAlign: "center" }}>Auto-detected dark logo</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ClientsTab({ clients, notify, onClientAdded }: {
  clients: Company[];
  notify: (m: string, t?: "default" | "success" | "error") => void;
  onClientAdded: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Company | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown> | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isGenBrandPrompt, setIsGenBrandPrompt] = useState(false);
  const [isGenEditBrandPrompt, setIsGenEditBrandPrompt] = useState(false);

  // ── Logo processing state ─────────────────────────────────────────────────
  const defaultLogo: LogoState = { file: null, processing: false, originalB64: null, displayB64: null, brightness: null, inverted: false };
  const [logo, setLogo]         = useState<LogoState>(defaultLogo);
  const [editLogo, setEditLogo] = useState<LogoState>(defaultLogo);

  // Canvas helpers — run in browser only
  const analyzeBrightness = (b64: string): Promise<number> =>
    new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, img.width, img.height);
        let sum = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 10) { sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; count++; }
        }
        resolve(count > 0 ? sum / count : 128);
      };
      img.onerror = () => resolve(128);
      img.src = `data:image/png;base64,${b64}`;
    });

  const invertB64 = (b64: string): Promise<string> =>
    new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const id = ctx.getImageData(0, 0, img.width, img.height);
        const d = id.data;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] > 10) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; }
        }
        ctx.putImageData(id, 0, 0);
        resolve(c.toDataURL("image/png").split(",")[1]);
      };
      img.onerror = () => resolve(b64);
      img.src = `data:image/png;base64,${b64}`;
    });

  const processLogo = async (file: File, setter: React.Dispatch<React.SetStateAction<LogoState>>) => {
    setter(s => ({ ...s, file, processing: true, originalB64: null, displayB64: null }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-logo", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const { originalB64 } = await res.json();
      const brightness = await analyzeBrightness(originalB64);
      const shouldInvert = brightness < 128;
      const displayB64 = shouldInvert ? await invertB64(originalB64) : originalB64;
      setter({ file, processing: false, originalB64, displayB64, brightness, inverted: shouldInvert });
    } catch (e) {
      console.error("Logo processing failed:", e);
      setter(s => ({ ...s, processing: false }));
      notify("Background removal failed. Check your REMOVEBG_API_KEY", "error");
    }
  };

  const toggleInvert = async (current: LogoState, setter: React.Dispatch<React.SetStateAction<LogoState>>) => {
    if (!current.originalB64) return;
    const newInverted = !current.inverted;
    const displayB64 = newInverted ? await invertB64(current.originalB64) : current.originalB64;
    setter(s => ({ ...s, inverted: newInverted, displayB64 }));
  };

  const saveLogo = async (clientId: string, ls: LogoState): Promise<string | null> => {
    if (!ls.originalB64 || !ls.displayB64) return null;
    const res = await fetch("/api/upload-logo/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, originalB64: ls.originalB64, displayB64: ls.displayB64, inverted: ls.inverted }),
    });
    if (!res.ok) return null;
    const { displayPath } = await res.json();
    return displayPath;
  };

  const generateBrandPromptForNew = async () => {
    setIsGenBrandPrompt(true);
    try {
      const brand = {
        accent_color: form.accent_color, dark_color: form.dark_color, light_color: form.light_color,
        visual_mood: form.visual_mood, headline_font: form.headline_font, body_font: form.body_font,
        primary_font: form.primary_font, secondary_font: form.secondary_font,
        key_phrases: JSON.stringify(form.key_phrases), badges: JSON.stringify(form.badges),
      };
      const company = { name: form.name, tagline: form.tagline, voice: form.voice, audience: form.audience };
      const r = await fetch("/api/brand-prompt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brand, company }) });
      const d = await r.json();
      if (d.brandPrompt) { setForm(f => ({ ...f, brand_prompt: d.brandPrompt })); notify("Brand prompt generated", "success"); }
      else notify("Brand prompt generation failed", "error");
    } catch { notify("Brand prompt generation failed", "error"); }
    setIsGenBrandPrompt(false);
  };

  const generateBrandPromptForEdit = async () => {
    if (!editForm) return;
    setIsGenEditBrandPrompt(true);
    try {
      const brand = {
        accent_color: editForm.accent_color, dark_color: editForm.dark_color, light_color: editForm.light_color,
        visual_mood: editForm.visual_mood, headline_font: editForm.headline_font, body_font: editForm.body_font,
        primary_font: editForm.primary_font, secondary_font: editForm.secondary_font,
        key_phrases: JSON.stringify(editForm.key_phrases), badges: JSON.stringify(editForm.badges),
      };
      const company = { name: editForm.name, tagline: editForm.tagline, voice: editForm.voice, audience: editForm.audience };
      const r = await fetch("/api/brand-prompt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brand, company }) });
      const d = await r.json();
      if (d.brandPrompt) { setEditForm(f => ({ ...f!, brand_prompt: d.brandPrompt })); notify("Brand prompt generated", "success"); }
      else notify("Brand prompt generation failed", "error");
    } catch { notify("Brand prompt generation failed", "error"); }
    setIsGenEditBrandPrompt(false);
  };
  const [form, setForm] = useState({
    name: "", tagline: "", color: "#0066ff", timezone: "EST",
    audience: "", voice: "",
    accent_color: "#0066ff", dark_color: "#000000", light_color: "#ffffff",
    visual_mood: "", logo_text: "",
    primary_font: "", secondary_font: "",
    headline_font: "", body_font: "",
    brand_prompt: "",
    key_phrases: [""], badges: [""],
    pillars: [
      { day: "Tuesday",   type: "", color: "#0066ff", example: "" },
      { day: "Wednesday", type: "", color: "#0066ff", example: "" },
      { day: "Thursday",  type: "", color: "#0066ff", example: "" },
      { day: "Friday",    type: "", color: "#0066ff", example: "" },
    ],
  });

  const generateId = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) + Date.now().toString().slice(-4);

  const updatePillar = (i: number, field: string, value: string) =>
    setForm(f => ({ ...f, pillars: f.pillars.map((p, idx) => idx === i ? { ...p, [field]: value } : p) }));

  const updatePhrase = (i: number, value: string) =>
    setForm(f => ({ ...f, key_phrases: f.key_phrases.map((p, idx) => idx === i ? value : p) }));

  const updateBadge = (i: number, value: string) =>
    setForm(f => ({ ...f, badges: f.badges.map((b, idx) => idx === i ? value : b) }));

  const submit = async () => {
    if (!form.name.trim()) { notify("Client name is required", "error"); return; }
    setSaving(true);
    try {
      const payload = {
        id: generateId(form.name),
        name: form.name,
        tagline: form.tagline,
        color: form.color,
        timezone: form.timezone,
        audience: form.audience,
        voice: form.voice,
        posting_days: form.pillars.filter(p => p.type).map(p => p.day),
        best_post_times: {},
        brand: {
          palette: [form.accent_color, form.dark_color, form.light_color],
          visual_mood: form.visual_mood,
          logo_text: form.logo_text,
          accent_color: form.accent_color,
          dark_color: form.dark_color,
          light_color: form.light_color,
          primary_font:   form.primary_font,
          secondary_font: form.secondary_font,
          headline_font:  form.headline_font,
          body_font:      form.body_font,
          brand_prompt:   form.brand_prompt || null,
          key_phrases: form.key_phrases.filter(p => p.trim()),
          badges: form.badges.filter(b => b.trim()),
        },
        pillars: form.pillars.filter(p => p.type.trim()),
      };
      const r = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        // Upload + process logo if provided
        if (logo.originalB64) {
          const displayPath = await saveLogo(payload.id, logo);
          if (displayPath) {
            await fetch("/api/clients", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: payload.id, logo_file: displayPath }),
            });
          }
        }
        notify("Client added!", "success");
        setShowForm(false);
        setLogo(defaultLogo);
        onClientAdded();
        setForm({
          name: "", tagline: "", color: "#0066ff", timezone: "EST",
          audience: "", voice: "",
          accent_color: "#0066ff", dark_color: "#000000", light_color: "#ffffff",
          visual_mood: "", logo_text: "",
          primary_font: "", secondary_font: "",
          headline_font: "", body_font: "",
          brand_prompt: "",
          key_phrases: [""], badges: [""],
          pillars: [
            { day: "Tuesday",   type: "", color: "#0066ff", example: "" },
            { day: "Wednesday", type: "", color: "#0066ff", example: "" },
            { day: "Thursday",  type: "", color: "#0066ff", example: "" },
            { day: "Friday",    type: "", color: "#0066ff", example: "" },
          ],
        });
      } else {
        notify("Failed to save client", "error");
      }
    } catch { notify("Error saving client", "error"); }
    setSaving(false);
  };

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div className="label" style={{ marginBottom: "6px" }}>Portfolio</div>
          <div style={{ fontFamily: "var(--font-cormorant, 'Cormorant Garamond', Georgia, serif)", fontSize: "32px", fontWeight: 300, fontStyle: "italic", color: T, lineHeight: 1 }}>Clients</div>
          <div style={{ fontSize: "11px", color: T3, marginTop: "4px" }}>{clients.length} active clients</div>
        </div>
        <GlassBtn variant="primary" onClick={() => { setShowForm(s => !s); setSelectedClient(null); setEditForm(null); }}>
          {showForm ? "Cancel" : "+ Add New Client"}
        </GlassBtn>
      </div>

      {/* Client cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px" }}>
        {clients.map(c => (
          <div key={c.id} onClick={() => {
            setSelectedClient(c);
            setShowForm(false);
            const kit = (c.brand || {}) as Record<string, unknown>;
            setEditForm({
              name: c.name,
              tagline: c.tagline || "",
              color: c.color,
              timezone: c.timezone,
              audience: c.audience || "",
              voice: c.voice || "",
              accent_color: kit.accent_color || c.color,
              dark_color: kit.dark_color || "#000000",
              light_color: kit.light_color || "#ffffff",
              visual_mood: kit.visual_mood || "",
              logo_text: kit.logo_text || "",
              primary_font:   kit.primary_font   || "",
              secondary_font: kit.secondary_font || "",
              headline_font:  kit.headline_font  || "",
              body_font:      kit.body_font      || "",
              key_phrases: (kit.key_phrases as string[]) || [""],
              badges: (kit.badges as string[]) || [""],
              brand_prompt: kit.brand_prompt || "",
              invert_logo: Boolean(kit.invert_logo),
            });
          }} style={{ ...glass({ padding: "20px", paddingTop: "22px", position: "relative", overflow: "hidden" }), cursor: "pointer" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: c.color, opacity: 0.6 }} />
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontFamily: "var(--font-cormorant, 'Cormorant Garamond', Georgia, serif)", fontSize: "18px", fontWeight: 300, color: T, letterSpacing: "-0.01em" }}>{c.name}</div>
            </div>
            <div style={{ fontSize: "12px", fontStyle: "italic", color: T3, marginBottom: "12px", fontFamily: "var(--font-cormorant, serif)" }}>{c.tagline}</div>
            <div style={{ fontSize: "10px", color: T3, marginBottom: "12px", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{c.timezone}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {(Array.isArray(c.pillars) ? c.pillars : []).slice(0, 4).map((p: Record<string, unknown>, i: number) => (
                <span key={i} style={{ fontSize: "9px", padding: "2px 8px", background: "rgba(26,26,26,0.04)", border: "1px solid rgba(26,26,26,0.09)", color: T3, borderRadius: "4px", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                  {p.day as string}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Edit client panel */}
      {selectedClient && editForm && (
        <div className="fade-up" style={glass({ padding: "32px", border: `1px solid ${selectedClient.color}40` })}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "24px" }}>
            <div>
              <div className="label" style={{ marginBottom: "4px" }}>Editing</div>
              <div style={{ fontFamily: "var(--font-cormorant, 'Cormorant Garamond', Georgia, serif)", fontSize: "22px", fontWeight: 300, fontStyle: "italic", color: T }}>
                {selectedClient.name}
              </div>
            </div>
            <GlassBtn onClick={() => { setSelectedClient(null); setEditForm(null); }}>Close</GlassBtn>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
            {[
              { label: "Company name", key: "name" },
              { label: "Tagline", key: "tagline" },
              { label: "Timezone", key: "timezone" },
              { label: "Logo text", key: "logo_text" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.45)", marginBottom: "7px" }}>{f.label}</label>
                <input type="text" value={editForm[f.key] as string}
                  onChange={e => setEditForm(p => ({ ...p!, [f.key]: e.target.value }))}
                  style={{ ...INPUT, padding: "10px 13px", fontSize: "13px" }}
                  onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                  onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                />
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "20px" }}>
            {[
              { label: "Brand color", key: "color" },
              { label: "Accent color", key: "accent_color" },
              { label: "Dark color", key: "dark_color" },
              { label: "Light color", key: "light_color" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.45)", marginBottom: "7px" }}>{f.label}</label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input type="color" value={editForm[f.key] as string}
                    onChange={e => setEditForm(p => ({ ...p!, [f.key]: e.target.value }))}
                    style={{ width: "36px", height: "36px", borderRadius: "6px", border: "1px solid rgba(26,26,26,0.12)", cursor: "pointer" }}
                  />
                  <input type="text" value={editForm[f.key] as string}
                    onChange={e => setEditForm(p => ({ ...p!, [f.key]: e.target.value }))}
                    style={{ ...INPUT, padding: "8px 10px", fontSize: "12px" }}
                    onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                    onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
            {[
              { label: "Brand voice", key: "voice", placeholder: "Tone, style, personality…" },
              { label: "Target audience", key: "audience", placeholder: "Who reads these posts?" },
              { label: "Visual mood", key: "visual_mood", placeholder: "Dark backgrounds, bold type…" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.45)", marginBottom: "7px" }}>{f.label}</label>
                <textarea value={editForm[f.key] as string}
                  onChange={e => setEditForm(p => ({ ...p!, [f.key]: e.target.value }))}
                  placeholder={(f as Record<string, string>).placeholder}
                  rows={3}
                  style={{ ...INPUT, resize: "none", fontSize: "13px" }}
                  onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                  onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                />
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
            {[
              { label: "Primary / headline font", key: "primary_font", placeholder: "e.g. Inter, GT Walsheim, Helvetica Neue" },
              { label: "Secondary / body font",   key: "secondary_font", placeholder: "e.g. DM Sans, Georgia, Inter" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.45)", marginBottom: "7px" }}>{f.label}</label>
                <input type="text" value={editForm[f.key] as string}
                  onChange={e => setEditForm(p => ({ ...p!, [f.key]: e.target.value }))}
                  placeholder={(f as Record<string, string>).placeholder}
                  style={{ ...INPUT, padding: "10px 13px", fontSize: "13px" }}
                  onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                  onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                />
              </div>
            ))}
          </div>

          <div style={glassElevated({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px", padding: "16px", border: "1px solid rgba(43,191,176,0.12)" })}>
            <div style={{ gridColumn: "1/-1", fontSize: "10px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(43,191,176,0.6)", marginBottom: "4px" }}>
              Visual generation fonts — used in SVG image creation
            </div>
            {[
              { label: "Headline font (visuals)", key: "headline_font", placeholder: "Google Font name, e.g. Inter" },
              { label: "Body font (visuals)",     key: "body_font",     placeholder: "Google Font name, e.g. DM Sans" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.45)", marginBottom: "7px" }}>{f.label}</label>
                <input type="text" value={editForm[f.key] as string}
                  onChange={e => setEditForm(p => ({ ...p!, [f.key]: e.target.value }))}
                  placeholder={(f as Record<string, string>).placeholder}
                  style={{ ...INPUT, padding: "10px 13px", fontSize: "13px" }}
                  onFocus={e => e.target.style.borderColor = "rgba(43,191,176,0.3)"}
                  onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                />
              </div>
            ))}
          </div>

          {/* Brand Prompt */}
          <div style={glassElevated({ padding: "20px", marginBottom: "20px", border: "1px solid rgba(201,168,76,0.12)" })}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.6)", marginBottom: "2px" }}>
                  AI Image Brand Prompt
                </div>
                <div style={{ fontSize: "11px", color: T3 }}>Prepended to every Ideogram / Flux generation request</div>
              </div>
              <GlassBtn
                onClick={generateBrandPromptForEdit}
                disabled={isGenEditBrandPrompt}
                style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", color: GOLD }}
              >
                {isGenEditBrandPrompt ? <><Spinner /> Generating…</> : "Generate ↗"}
              </GlassBtn>
            </div>
            <textarea
              value={editForm.brand_prompt as string}
              onChange={e => setEditForm(p => ({ ...p!, brand_prompt: e.target.value }))}
              rows={8}
              placeholder="Click Generate to create an optimised AI image prompt from this brand's data…"
              style={{ ...INPUT, resize: "vertical", fontSize: "12px", lineHeight: 1.7, fontFamily: "monospace" }}
              onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
              onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
            />
          </div>

          {/* Invert logo toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "rgba(26,26,26,0.02)", border: "1px solid rgba(26,26,26,0.09)", borderRadius: "8px", marginBottom: "20px" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 400, color: T2, marginBottom: "2px" }}>Invert logo for dark backgrounds</div>
              <div style={{ fontSize: "11px", color: T3 }}>Applies brightness(0) invert(1) filter on generated image overlays</div>
            </div>
            <button onClick={() => setEditForm(f => ({ ...f!, invert_logo: !f!.invert_logo }))}
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", background: editForm.invert_logo ? "rgba(43,191,176,0.10)" : "transparent", border: editForm.invert_logo ? "1px solid rgba(43,191,176,0.3)" : "1px solid rgba(26,26,26,0.12)", borderRadius: "6px", color: editForm.invert_logo ? "#2BBFB0" : T3, cursor: "pointer", fontFamily: "inherit", fontSize: "11px", fontWeight: 500, transition: "all 0.15s ease" }}>
              <span style={{ width: "28px", height: "16px", borderRadius: "8px", background: editForm.invert_logo ? "#2BBFB0" : "rgba(26,26,26,0.15)", display: "inline-block", position: "relative", flexShrink: 0, transition: "background 0.2s ease" }}>
                <span style={{ position: "absolute", top: "2px", left: editForm.invert_logo ? "14px" : "2px", width: "12px", height: "12px", borderRadius: "50%", background: "#fff", transition: "left 0.2s ease" }} />
              </span>
              {editForm.invert_logo ? "On" : "Off"}
            </button>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.45)", marginBottom: "7px" }}>Key brand phrases</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {(editForm.key_phrases as string[]).map((p, i) => (
                <div key={i} style={{ display: "flex", gap: "8px" }}>
                  <input type="text" value={p}
                    onChange={e => setEditForm(f => ({ ...f!, key_phrases: (f!.key_phrases as string[]).map((x, idx) => idx === i ? e.target.value : x) }))}
                    style={{ ...INPUT, padding: "9px 12px", fontSize: "13px" }}
                    onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                    onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                  />
                  {i === (editForm.key_phrases as string[]).length - 1 && (
                    <button onClick={() => setEditForm(f => ({ ...f!, key_phrases: [...(f!.key_phrases as string[]), ""] }))}
                      style={{ padding: "9px 16px", background: "rgba(26,26,26,0.05)", border: "1px solid rgba(26,26,26,0.12)", borderRadius: "6px", color: T3, cursor: "pointer", fontFamily: "inherit", fontSize: "13px" }}>
                      +
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "28px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.45)", marginBottom: "7px" }}>Badges / tags</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {(editForm.badges as string[]).map((b, i) => (
                <input key={i} type="text" value={b}
                  onChange={e => setEditForm(f => ({ ...f!, badges: (f!.badges as string[]).map((x, idx) => idx === i ? e.target.value : x) }))}
                  style={{ ...INPUT, width: "140px", padding: "7px 10px", fontSize: "12px" }}
                  onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                  onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                />
              ))}
              <button onClick={() => setEditForm(f => ({ ...f!, badges: [...(f!.badges as string[]), ""] }))}
                style={{ padding: "7px 14px", background: "rgba(26,26,26,0.04)", border: "1px solid rgba(26,26,26,0.12)", borderRadius: "6px", color: T3, cursor: "pointer", fontFamily: "inherit", fontSize: "12px" }}>
                +
              </button>
            </div>
          </div>

          {/* Logo upload (edit) */}
          <LogoUploadPanel logo={editLogo} currentLogoSrc={selectedClient.logo_file || undefined} onFile={f => processLogo(f, setEditLogo)} onToggleInvert={() => toggleInvert(editLogo, setEditLogo)} />

          <div style={{ display: "flex", gap: "10px" }}>
            <GlassBtn onClick={async () => {
              setEditSaving(true);
              try {
                let logoFilePath = selectedClient.logo_file;
                if (editLogo.originalB64) {
                  const displayPath = await saveLogo(selectedClient.id, editLogo);
                  if (displayPath) logoFilePath = displayPath;
                }
                await fetch("/api/clients", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: selectedClient.id,
                    name: editForm.name,
                    tagline: editForm.tagline,
                    color: editForm.color,
                    timezone: editForm.timezone,
                    audience: editForm.audience,
                    voice: editForm.voice,
                    logo_file: logoFilePath,
                    brand: {
                      accent_color:   editForm.accent_color,
                      dark_color:     editForm.dark_color,
                      light_color:    editForm.light_color,
                      visual_mood:    editForm.visual_mood,
                      logo_text:      editForm.logo_text,
                      primary_font:   editForm.primary_font,
                      secondary_font: editForm.secondary_font,
                      headline_font:  editForm.headline_font,
                      body_font:      editForm.body_font,
                      brand_prompt:   editForm.brand_prompt,
                      key_phrases:    editForm.key_phrases,
                      badges:         editForm.badges,
                      palette:        [editForm.accent_color, editForm.dark_color, editForm.light_color],
                      invert_logo:    editForm.invert_logo,
                    },
                  }),
                });
                notify("Client updated!", "success");
                setEditLogo(defaultLogo);
                onClientAdded();
                setSelectedClient(null);
                setEditForm(null);
              } catch { notify("Error saving", "error"); }
              setEditSaving(false);
            }} disabled={editSaving} variant="teal">
              {editSaving ? <><Spinner /> Saving…</> : "Save Changes"}
            </GlassBtn>
            <GlassBtn onClick={() => { setSelectedClient(null); setEditForm(null); setEditLogo(defaultLogo); }}>Cancel</GlassBtn>
            <GlassBtn variant="danger" style={{ marginLeft: "auto" }} onClick={async () => {
              if (!confirm(`Delete ${selectedClient.name}? This cannot be undone.`)) return;
              await fetch(`/api/clients?id=${selectedClient.id}`, { method: "DELETE" });
              notify(`${selectedClient.name} deleted`, "default");
              setSelectedClient(null);
              setEditForm(null);
              setEditLogo(defaultLogo);
              onClientAdded();
            }}>
              Delete client
            </GlassBtn>
          </div>
        </div>
      )}

      {/* Add client form */}
      {showForm && (
        <div className="fade-up" style={glass({ padding: "32px" })}>
          <div style={{ marginBottom: "20px" }}>
            <div className="label" style={{ marginBottom: "4px" }}>Add</div>
            <div style={{ fontFamily: "var(--font-cormorant, serif)", fontSize: "22px", fontWeight: 300, fontStyle: "italic", color: T }}>New Client</div>
          </div>

{/* URL extractor */}
<div style={glassElevated({ padding: "20px", marginBottom: "24px", border: "1px solid rgba(201,168,76,0.12)" })}>
  <div style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.6)", marginBottom: "8px" }}>
    Auto-fill from website
  </div>
  <div style={{ fontSize: "12px", color: T3, marginBottom: "14px" }}>
    Paste a website URL and we&apos;ll extract the brand kit automatically.
  </div>
  <div style={{ display: "flex", gap: "8px" }}>
    <input
      type="text"
      id="brand-url-input"
      placeholder="https://example.com"
      style={{ ...INPUT, flex: 1, padding: "10px 14px", fontSize: "13px" }}
      onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
      onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
    />
    <GlassBtn
      variant="primary"
      onClick={async () => {
        const input = document.getElementById("brand-url-input") as HTMLInputElement;
        const url = input?.value?.trim();
        if (!url) { notify("Please enter a URL", "error"); return; }
        notify("Analysing website…");
        try {
          const r = await fetch("/api/brand-extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          });
          const d = await r.json();
          if (d.brand) {
            setForm(f => ({
              ...f,
              name:         d.brand.name        || f.name,
              tagline:      d.brand.tagline      || f.tagline,
              audience:     d.brand.audience     || f.audience,
              voice:        d.brand.voice        || f.voice,
              visual_mood:  d.brand.visual_mood  || f.visual_mood,
              logo_text:    d.brand.logo_text    || f.logo_text,
              timezone:     d.brand.timezone     || f.timezone,
              color:        d.brand.accent_color || f.color,
              accent_color: d.brand.accent_color || f.accent_color,
              dark_color:   d.brand.dark_color   || f.dark_color,
              light_color:  d.brand.light_color  || f.light_color,
              primary_font:   d.brand.primary_font   || f.primary_font,
              secondary_font: d.brand.secondary_font || f.secondary_font,
              headline_font:  d.brand.headline_font  || f.headline_font,
              body_font:      d.brand.body_font      || f.body_font,
              brand_prompt:   d.brand.brand_prompt   || f.brand_prompt,
              key_phrases:  d.brand.key_phrases?.length ? d.brand.key_phrases : f.key_phrases,
              badges:       d.brand.badges?.length      ? d.brand.badges      : f.badges,
              pillars:      d.brand.pillars?.length
                ? d.brand.pillars.map((p: { day: string; type: string; color: string; example: string }) => ({
                    day:     p.day,
                    type:    p.type,
                    color:   p.color || d.brand.accent_color || f.color,
                    example: p.example,
                  }))
                : f.pillars,
            }));
            notify("Brand kit + content pillars extracted!", "success");
          } else {
            notify("Could not extract. Fill in manually", "error");
          }
        } catch {
          notify("Extraction failed. Fill in manually", "error");
        }
      }}
    >
      Extract brand kit ↗
    </GlassBtn>
  </div>
</div>

          {/* Logo upload + bg removal */}
          <LogoUploadPanel logo={logo} onFile={f => processLogo(f, setLogo)} onToggleInvert={() => toggleInvert(logo, setLogo)} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
            {[
              { label: "Company name *", key: "name", placeholder: "e.g. Acme Biotech" },
              { label: "Tagline", key: "tagline", placeholder: "e.g. Changing medicine forever." },
              { label: "Timezone", key: "timezone", placeholder: "EST / PST / GMT" },
              { label: "Logo text", key: "logo_text", placeholder: "e.g. ACME" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.45)", marginBottom: "7px" }}>{f.label}</label>
                <input type="text"
                  value={(form as Record<string, unknown>)[f.key] as string}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ ...INPUT, padding: "10px 13px", fontSize: "13px" }}
                  onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                  onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                />
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "20px" }}>
            {[
              { label: "Brand color", key: "color" },
              { label: "Accent color", key: "accent_color" },
              { label: "Dark color", key: "dark_color" },
              { label: "Light color", key: "light_color" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.45)", marginBottom: "7px" }}>{f.label}</label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input type="color"
                    value={(form as Record<string, unknown>)[f.key] as string}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ width: "36px", height: "36px", borderRadius: "6px", border: "1px solid rgba(26,26,26,0.12)", cursor: "pointer" }}
                  />
                  <input type="text"
                    value={(form as Record<string, unknown>)[f.key] as string}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ ...INPUT, padding: "8px 10px", fontSize: "12px" }}
                    onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                    onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
            {[
              { label: "Brand voice", key: "voice", placeholder: "Describe tone, style, personality…" },
              { label: "Target audience", key: "audience", placeholder: "Who reads these posts?" },
              { label: "Visual mood", key: "visual_mood", placeholder: "Dark backgrounds, bold type, teal accents…" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.45)", marginBottom: "7px" }}>{f.label}</label>
                <textarea
                  value={(form as Record<string, unknown>)[f.key] as string}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  rows={3}
                  style={{ ...INPUT, resize: "none", fontSize: "13px" }}
                  onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                  onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                />
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
            {[
              { label: "Primary / headline font", key: "primary_font", placeholder: "e.g. Inter, GT Walsheim, Helvetica Neue" },
              { label: "Secondary / body font",   key: "secondary_font", placeholder: "e.g. DM Sans, Georgia, Inter" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.45)", marginBottom: "7px" }}>{f.label}</label>
                <input type="text"
                  value={(form as Record<string, unknown>)[f.key] as string}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ ...INPUT, padding: "10px 13px", fontSize: "13px" }}
                  onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                  onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                />
              </div>
            ))}
          </div>

          <div style={glassElevated({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px", padding: "16px", border: "1px solid rgba(43,191,176,0.12)" })}>
            <div style={{ gridColumn: "1/-1", fontSize: "10px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(43,191,176,0.6)", marginBottom: "4px" }}>
              Visual generation fonts — used in SVG image creation
            </div>
            {[
              { label: "Headline font (visuals)", key: "headline_font", placeholder: "Google Font name, e.g. Inter" },
              { label: "Body font (visuals)",     key: "body_font",     placeholder: "Google Font name, e.g. DM Sans" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.45)", marginBottom: "7px" }}>{f.label}</label>
                <input type="text"
                  value={(form as Record<string, unknown>)[f.key] as string}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ ...INPUT, padding: "10px 13px", fontSize: "13px" }}
                  onFocus={e => e.target.style.borderColor = "rgba(43,191,176,0.3)"}
                  onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                />
              </div>
            ))}
          </div>

          {/* Brand Prompt */}
          <div style={glassElevated({ padding: "20px", marginBottom: "20px", border: "1px solid rgba(201,168,76,0.15)" })}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.7)", marginBottom: "2px" }}>
                  AI Image Brand Prompt
                </div>
                <div style={{ fontSize: "11px", color: "rgba(26,26,26,0.45)" }}>Prepended to every Ideogram / Flux generation request</div>
              </div>
              <GlassBtn
                onClick={generateBrandPromptForNew}
                disabled={isGenBrandPrompt}
                style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", color: GOLD }}
              >
                {isGenBrandPrompt ? <><Spinner /> Generating…</> : "Generate ↗"}
              </GlassBtn>
            </div>
            <textarea
              value={form.brand_prompt}
              onChange={e => setForm(f => ({ ...f, brand_prompt: e.target.value }))}
              rows={8}
              placeholder="Click Generate to create an optimised AI image prompt from this brand's data…"
              style={{ ...INPUT, resize: "vertical", fontSize: "12px", lineHeight: 1.7, fontFamily: "monospace" }}
              onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.45)"}
              onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.45)", marginBottom: "7px" }}>Key brand phrases</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {form.key_phrases.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: "8px" }}>
                  <input type="text" value={p}
                    onChange={e => updatePhrase(i, e.target.value)}
                    placeholder={`Phrase ${i + 1}`}
                    style={{ ...INPUT, padding: "9px 12px", fontSize: "13px" }}
                    onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                    onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                  />
                  {i === form.key_phrases.length - 1 && (
                    <button onClick={() => setForm(f => ({ ...f, key_phrases: [...f.key_phrases, ""] }))}
                      style={{ padding: "9px 16px", background: "rgba(26,26,26,0.05)", border: "1px solid rgba(26,26,26,0.12)", borderRadius: "6px", color: T3, cursor: "pointer", fontFamily: "inherit", fontSize: "13px" }}>
                      +
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.45)", marginBottom: "7px" }}>Badges / tags</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {form.badges.map((b, i) => (
                <input key={i} type="text" value={b}
                  onChange={e => updateBadge(i, e.target.value)}
                  placeholder="Tag"
                  style={{ ...INPUT, width: "140px", padding: "7px 10px", fontSize: "12px" }}
                  onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                  onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                />
              ))}
              <button onClick={() => setForm(f => ({ ...f, badges: [...f.badges, ""] }))}
                style={{ padding: "7px 14px", background: "rgba(26,26,26,0.04)", border: "1px solid rgba(26,26,26,0.12)", borderRadius: "6px", color: T3, cursor: "pointer", fontFamily: "inherit", fontSize: "12px" }}>
                +
              </button>
            </div>
          </div>

          <div style={{ marginBottom: "28px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.45)", marginBottom: "12px" }}>Content pillars</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {form.pillars.map((p, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 140px 1fr", gap: "8px", alignItems: "center" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "rgba(26,26,26,0.45)", padding: "9px 0" }}>{p.day}</div>
                  <input type="text" value={p.type}
                    onChange={e => updatePillar(i, "type", e.target.value)}
                    placeholder="Post type"
                    style={{ ...INPUT, padding: "9px 12px", fontSize: "13px" }}
                    onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                    onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                  />
                  <input type="text" value={p.example}
                    onChange={e => updatePillar(i, "example", e.target.value)}
                    placeholder="Content direction / example topic"
                    style={{ ...INPUT, padding: "9px 12px", fontSize: "13px" }}
                    onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                    onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                  />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <GlassBtn onClick={submit} disabled={saving} variant="teal">
              {saving ? <><Spinner /> Saving…</> : "Save Client"}
            </GlassBtn>
            <GlassBtn onClick={() => setShowForm(false)}>Cancel</GlassBtn>
          </div>
        </div>
      )}

    </div>
  );
}
// ── Invoices Tab ──────────────────────────────────────────────────────────────
function InvoicesTab({ ac, notify }: { ac: Company; notify: (m: string, t?: "default" | "success" | "error") => void }) {
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("gorlin_invoices") || "[]"); } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
const [selectedClient, setSelectedClient] = useState<Company | null>(null);
const [editForm, setEditForm] = useState<Record<string, unknown> | null>(null);
const [editSaving, setEditSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Invoice, "id">>({
    number: `INV-${String(Date.now()).slice(-5)}`,
    client_name: ac.name,
    company_id: ac.id,
    date: new Date().toISOString().slice(0,10),
    due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0,10),
    items: [{ description: "LinkedIn content management (monthly)", qty: 1, rate: 2500 }],
    status: "pending",
    tax_rate: 0,
    notes: "",
  });

  const save = (invs: Invoice[]) => {
    setInvoices(invs);
    localStorage.setItem("gorlin_invoices", JSON.stringify(invs));
  };

  const createInvoice = () => {
    const newInv: Invoice = { ...form, id: Date.now().toString() };
    save([...invoices, newInv]);
    setShowForm(false);
    notify("Invoice created", "success");
    setForm({ ...form, number: `INV-${String(Date.now()).slice(-5)}` });
  };

  const updateStatus = (id: string, status: Invoice["status"]) => {
    save(invoices.map(inv => inv.id === id ? { ...inv, status } : inv));
    notify("Status updated", "success");
  };

  const deleteInv = (id: string) => {
    if (!confirm("Delete this invoice?")) return;
    save(invoices.filter(inv => inv.id !== id));
    notify("Invoice deleted");
  };

  const total = (inv: Invoice) => {
    const sub = inv.items.reduce((s, i) => s + i.qty * i.rate, 0);
    return sub + sub * (inv.tax_rate / 100);
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { description: "", qty: 1, rate: 0 }] }));
  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i: number, field: keyof InvoiceItem, val: string | number) =>
    setForm(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: val } : item) }));

  const formTotal = form.items.reduce((s, i) => s + i.qty * i.rate, 0);
  const formTax = formTotal * (form.tax_rate / 100);

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div className="label" style={{ marginBottom: "6px" }}>Billing</div>
          <div style={{ fontFamily: "var(--font-cormorant, 'Cormorant Garamond', Georgia, serif)", fontSize: "32px", fontWeight: 300, fontStyle: "italic", color: T, lineHeight: 1 }}>Invoices</div>
          <div style={{ fontSize: "11px", color: T3, marginTop: "4px" }}>{invoices.length} invoices total</div>
        </div>
        <GlassBtn variant="primary" onClick={() => { setShowForm(true); setEditId(null); }}>
          + New Invoice
        </GlassBtn>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="fade-up" style={glass({ padding: "28px" })}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "24px" }}>
            <div>
              <div className="label" style={{ marginBottom: "4px" }}>{editId ? "Edit" : "New"}</div>
              <div style={{ fontFamily: "var(--font-cormorant, serif)", fontSize: "20px", fontWeight: 300, fontStyle: "italic", color: T }}>Invoice</div>
            </div>
            <GlassBtn onClick={() => setShowForm(false)} variant="ghost">✕</GlassBtn>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "20px" }}>
            {[
              { label: "Invoice #",      key: "number",      type: "text"   },
              { label: "Client",         key: "client_name", type: "text"   },
              { label: "Invoice date",   key: "date",        type: "date"   },
              { label: "Due date",       key: "due_date",    type: "date"   },
              { label: "Tax rate (%)",   key: "tax_rate",    type: "number" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.45)", marginBottom: "7px" }}>{f.label}</label>
                <input
                  type={f.type}
                  value={(form as Record<string, unknown>)[f.key] as string}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value }))}
                  style={{ ...INPUT, padding: "10px 13px", fontSize: "13px" }}
                  onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                  onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                />
              </div>
            ))}
          </div>

          {/* Line items */}
          <div style={{ marginBottom: "20px" }}>
            <div className="label" style={{ marginBottom: "10px" }}>Line items</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {form.items.map((item, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 36px", gap: "8px", alignItems: "center" }}>
                  <input
                    type="text" value={item.description}
                    onChange={e => updateItem(i, "description", e.target.value)}
                    placeholder="Description"
                    style={{ ...INPUT, padding: "9px 12px", fontSize: "13px" }}
                    onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                    onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                  />
                  <input
                    type="number" value={item.qty}
                    onChange={e => updateItem(i, "qty", Number(e.target.value))}
                    placeholder="Qty"
                    style={{ ...INPUT, padding: "9px 12px", fontSize: "13px", textAlign: "center" }}
                    onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                    onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                  />
                  <input
                    type="number" value={item.rate}
                    onChange={e => updateItem(i, "rate", Number(e.target.value))}
                    placeholder="Rate ($)"
                    style={{ ...INPUT, padding: "9px 12px", fontSize: "13px" }}
                    onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                    onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                  />
                  <button onClick={() => removeItem(i)}
                    style={{ width: "36px", height: "36px", background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.2)", borderRadius: "8px", color: "#ff6b6b", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "inherit" }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addItem}
              style={{ marginTop: "10px", fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: T3, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "4px 0" }}>
              + Add item
            </button>
          </div>

          {/* Totals */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
            <div style={{ minWidth: "220px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(26,26,26,0.08)", fontSize: "13px", color: "rgba(26,26,26,0.55)" }}>
                <span>Subtotal</span><span>${formTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
              {form.tax_rate > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(26,26,26,0.08)", fontSize: "13px", color: "rgba(26,26,26,0.55)" }}>
                  <span>Tax ({form.tax_rate}%)</span><span>${formTax.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", fontFamily: "var(--font-cormorant, serif)", fontSize: "20px", fontWeight: 300, color: T }}>
                <span>Total</span><span>${(formTotal + formTax).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.45)", marginBottom: "7px" }}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Payment terms, notes to client…"
              style={{ ...INPUT, resize: "none", fontSize: "13px" }}
              onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
              onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
            />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <GlassBtn onClick={createInvoice} variant="teal">Create Invoice</GlassBtn>
            <GlassBtn onClick={() => setShowForm(false)}>Cancel</GlassBtn>
          </div>
        </div>
      )}

      {/* Invoice list */}
      {invoices.length === 0 && !showForm ? (
        <div style={{ textAlign: "center", padding: "100px 0" }}>
          <div style={{ width: "32px", height: "1px", background: GOLD, opacity: 0.3, margin: "0 auto 20px" }} />
          <p style={{ fontSize: "14px", color: T3, fontFamily: "var(--font-cormorant, serif)", fontStyle: "italic" }}>No invoices yet. Create your first one above.</p>
        </div>
      ) : (
        <div style={glass()}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(26,26,26,0.08)" }}>
                  {["Invoice #","Client","Date","Due","Amount","Status","Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "12px 20px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(26,26,26,0.40)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv.id} style={{ borderBottom: i < invoices.length - 1 ? "1px solid rgba(26,26,26,0.06)" : "none" }}>
                    <td style={{ padding: "14px 20px", fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em", color: T2 }}>{inv.number}</td>
                    <td style={{ padding: "14px 20px", fontSize: "13px", color: T }}>{inv.client_name}</td>
                    <td style={{ padding: "14px 20px", fontSize: "11px", color: T3 }}>{inv.date}</td>
                    <td style={{ padding: "14px 20px", fontSize: "11px", color: inv.status === "overdue" ? "#d07070" : T3 }}>{inv.due_date}</td>
                    <td style={{ padding: "14px 20px", fontFamily: "var(--font-cormorant, serif)", fontSize: "18px", fontWeight: 300, color: T }}>
                      ${total(inv).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "14px 20px" }}><StatusBadge status={inv.status} /></td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {inv.status === "pending"  && <button onClick={() => updateStatus(inv.id, "paid")}    style={{ fontSize: "10px", color: "#2BBFB0", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase" }}>Mark paid</button>}
                        {inv.status === "pending"  && <button onClick={() => updateStatus(inv.id, "overdue")} style={{ fontSize: "10px", color: "#cc3333", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase" }}>Overdue</button>}
                        <button onClick={() => { notify("PDF downloaded", "success"); }}  style={{ fontSize: "10px", color: T3, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase" }}>PDF</button>
                        <button onClick={() => { notify("Email sent", "success"); }}      style={{ fontSize: "10px", color: T3, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase" }}>Email</button>
                        <button onClick={() => deleteInv(inv.id)}                         style={{ fontSize: "10px", color: "rgba(204,68,68,0.5)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase" }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Landing / Cover Page ───────────────────────────────────────────────────────
function LandingPage() {
  const [hoverClient, setHoverClient] = useState(false);
  const [hoverTeam, setHoverTeam] = useState(false);
  const [hoverServices, setHoverServices] = useState(false);

  const taglineItems = [
    "Engineered for LinkedIn", "·", "Optimised for 2026",
    "·", "Built for Bioscience", "·", "Content at Cadence",
    "·", "Engineered for LinkedIn", "·", "Optimised for 2026",
    "·", "Built for Bioscience", "·", "Content at Cadence",
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F5F2EE", color: "#1A1A1A", fontFamily: "var(--font-inter, system-ui, sans-serif)", overflowX: "hidden" }}>

      {/* ── Nav ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 48px", height: "72px",
        background: "rgba(245,242,238,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "0.5px solid rgba(26,24,20,0.10)",
      }}>
        {/* Logo left */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/linkwright-logo.png" alt="Linkwright" style={{ height: "170px", objectFit: "contain" }} />

        {/* Nav right */}
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          <span style={{ fontSize: "12px", color: "rgba(26,26,26,0.40)", letterSpacing: "0.06em", fontWeight: 300 }}>
            LinkedIn Growth Agency
          </span>
          <div style={{ width: "0.5px", height: "16px", background: "rgba(26,26,26,0.15)" }} />
          <a href="/portal/login" style={{
            fontSize: "12px", fontWeight: 500, letterSpacing: "0.10em",
            textTransform: "uppercase", color: "rgba(26,26,26,0.55)",
            textDecoration: "none", transition: "color 0.2s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#1A1A1A"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(26,26,26,0.55)"; }}
          >
            Client Portal
          </a>
          <a href="/login" style={{
            fontSize: "12px", fontWeight: 500, letterSpacing: "0.10em",
            textTransform: "uppercase", padding: "8px 20px",
            border: "0.5px solid rgba(26,26,26,0.70)", color: "#1A1A1A",
            textDecoration: "none", transition: "background 0.2s, color 0.2s",
          }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "#1A1A1A"; el.style.color = "#F5F2EE"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "transparent"; el.style.color = "#1A1A1A"; }}
          >
            Team Login
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "100vh", paddingTop: "72px" }}>

        {/* Left */}
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "center",
          padding: "80px 64px 80px 48px",
        }}>
          {/* Tag */}
          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            fontSize: "11px", fontWeight: 500, letterSpacing: "0.20em",
            textTransform: "uppercase", color: "rgba(26,26,26,0.45)",
            marginBottom: "36px",
          }}>
            <div style={{ width: "28px", height: "0.5px", background: "rgba(26,26,26,0.35)" }} />
            LinkedIn Growth Agency
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: "var(--font-cormorant, var(--font-playfair, Georgia, serif))",
            fontSize: "clamp(52px, 6vw, 84px)", fontWeight: 300,
            lineHeight: 1.05, letterSpacing: "-0.02em", color: "#1A1A1A",
            marginBottom: "32px",
          }}>
            Build influence.<br/>
            <em style={{ fontStyle: "italic", color: "rgba(26,26,26,0.50)" }}>Generate pipeline.</em><br/>
            Stay authentic.
          </h1>

          {/* Sub */}
          <p style={{
            fontSize: "15px", fontWeight: 300, lineHeight: 1.75,
            color: "rgba(26,26,26,0.55)", maxWidth: "400px", marginBottom: "52px",
          }}>
            Linkwright engineers LinkedIn presences that attract, engage, and convert. Built for founders, executives, and B2B brands in bioscience.
          </p>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
            <a href="/portal/login"
              style={{
                fontFamily: "var(--font-inter, system-ui, sans-serif)",
                fontSize: "12px", fontWeight: 500, letterSpacing: "0.12em",
                textTransform: "uppercase",
                background: hoverClient ? "rgba(26,26,26,0.85)" : "#1A1A1A",
                color: "#F5F2EE", padding: "14px 36px",
                textDecoration: "none", display: "inline-block",
                transition: "opacity 0.2s", opacity: hoverClient ? 0.82 : 1,
              }}
              onMouseEnter={() => setHoverClient(true)}
              onMouseLeave={() => setHoverClient(false)}
            >
              Client Portal
            </a>
            <a href="/login"
              style={{
                fontSize: "13px", fontWeight: 400, color: hoverTeam ? "#1A1A1A" : "rgba(26,26,26,0.55)",
                textDecoration: "none", display: "flex", alignItems: "center", gap: "8px",
                transition: "color 0.2s",
              }}
              onMouseEnter={() => setHoverTeam(true)}
              onMouseLeave={() => setHoverTeam(false)}
            >
              Team Login <span style={{ display: "inline-block", transition: "transform 0.2s", transform: hoverTeam ? "translateX(4px)" : "none" }}>→</span>
            </a>
          </div>
        </div>

        {/* Right – dark editorial panel */}
        <div style={{
          position: "relative", background: "#1A1814", overflow: "hidden",
          display: "flex", alignItems: "flex-end",
        }}>
          {/* Background image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/hero.png" alt="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.52) contrast(1.2) saturate(0.85)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(26,24,20,0.05) 0%, rgba(26,24,20,0.82) 100%)" }} />

          {/* Gold top accent */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, #C9A84C 0%, transparent 100%)" }} />

          {/* Bottom caption */}
          <div style={{ padding: "48px 40px", position: "relative", zIndex: 1 }}>
            <div style={{ width: "1px", height: "40px", background: "rgba(244,241,236,0.20)", marginBottom: "20px" }} />
            <p style={{
              fontFamily: "var(--font-cormorant, var(--font-playfair, Georgia, serif))",
              fontSize: "20px", fontWeight: 300, fontStyle: "italic",
              color: "rgba(244,241,236,0.70)", lineHeight: 1.5, maxWidth: "320px",
            }}>
              "Your LinkedIn profile is your most valuable real estate in professional media."
            </p>
            <div style={{ marginTop: "24px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/linkwright-logo.png" alt="Linkwright" style={{ height: "20px", objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.35 }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee strip ── */}
      <div style={{
        background: "#1A1814", color: "#F5F2EE",
        padding: "18px 0", overflow: "hidden",
        borderTop: "0.5px solid rgba(26,26,26,0.20)",
      }}>
        <div className="marquee-track" style={{ display: "flex", gap: "60px", whiteSpace: "nowrap" }}>
          {taglineItems.map((t, i) => (
            <span key={i} style={{
              fontFamily: "var(--font-cormorant, var(--font-playfair, Georgia, serif))",
              fontSize: "17px", fontWeight: 300, fontStyle: "italic",
              color: t === "·" ? "rgba(244,241,236,0.25)" : "rgba(244,241,236,0.80)",
              flexShrink: 0,
            }}>{t}</span>
          ))}
        </div>
      </div>

      {/* ── Services overview ── */}
      <section style={{ padding: "120px 48px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          fontSize: "11px", fontWeight: 500, letterSpacing: "0.20em",
          textTransform: "uppercase", color: "rgba(26,26,26,0.40)",
          marginBottom: "48px",
        }}>
          <div style={{ width: "24px", height: "0.5px", background: "rgba(26,26,26,0.35)" }} />
          Services
        </div>

        <h2 style={{
          fontFamily: "var(--font-cormorant, var(--font-playfair, Georgia, serif))",
          fontSize: "clamp(36px, 4vw, 56px)", fontWeight: 300,
          lineHeight: 1.1, letterSpacing: "-0.02em", color: "#1A1A1A",
          maxWidth: "700px", marginBottom: "64px",
        }}>
          Everything you need to own LinkedIn in your category.
        </h2>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1px", background: "rgba(26,26,26,0.10)",
          border: "0.5px solid rgba(26,26,26,0.10)",
        }}>
          {[
            { n: "01", title: "Profile Architecture",    desc: "From headline to featured section. Every element engineered to convert visitors into conversations." },
            { n: "02", title: "Content Strategy",        desc: "A bespoke content blueprint built around your voice, your expertise, and the audience you're trying to reach." },
            { n: "03", title: "Ghostwriting",            desc: "Premium posts, carousels, and thought-leadership pieces written in your voice, published at cadence." },
            { n: "04", title: "Growth Systems",          desc: "Engagement frameworks, network-building protocols, and outreach sequences that compound over time." },
            { n: "05", title: "Company Pages",           desc: "Full company page transformation: positioning, content pillars, employee advocacy, and follower growth." },
            { n: "06", title: "Analytics & Reporting",   desc: "Monthly intelligence reports tracking reach, engagement, inbound quality, and progress against KPIs." },
          ].map((s, i) => (
            <ServiceCard key={i} num={s.n} title={s.title} desc={s.desc} />
          ))}
        </div>
      </section>

      {/* ── Philosophy strip ── */}
      <section style={{ background: "#1A1814", padding: "100px 48px" }}>
        <h2 style={{
          fontFamily: "var(--font-cormorant, var(--font-playfair, Georgia, serif))",
          fontSize: "clamp(36px, 5vw, 68px)", fontWeight: 300, fontStyle: "italic",
          lineHeight: 1.1, color: "rgba(244,241,236,0.90)",
          maxWidth: "800px", margin: "0 auto 64px", textAlign: "center",
        }}>
          "The best LinkedIn content doesn't feel like marketing. It feels like thinking out loud."
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "48px", maxWidth: "900px", margin: "0 auto" }}>
          {[
            { title: "Authentic",  text: "Every post sounds like you. No generic templates. No AI-flavoured filler." },
            { title: "Strategic",  text: "Content mapped to your business goals, not vanity metrics." },
            { title: "Consistent", text: "Authority is built in the long run. We keep you showing up." },
          ].map(p => (
            <div key={p.title}>
              <div style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.20em", textTransform: "uppercase", color: "rgba(244,241,236,0.35)", marginBottom: "12px" }}>{p.title}</div>
              <p style={{
                fontFamily: "var(--font-cormorant, var(--font-playfair, Georgia, serif))",
                fontSize: "20px", fontWeight: 300, color: "rgba(244,241,236,0.85)", lineHeight: 1.45,
              }}>{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Access section ── */}
      <section style={{ padding: "120px 48px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>
        <div>
          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            fontSize: "11px", fontWeight: 500, letterSpacing: "0.20em",
            textTransform: "uppercase", color: "rgba(26,26,26,0.40)",
            marginBottom: "32px",
          }}>
            <div style={{ width: "24px", height: "0.5px", background: "rgba(26,26,26,0.35)" }} />
            Platform Access
          </div>
          <h2 style={{
            fontFamily: "var(--font-cormorant, var(--font-playfair, Georgia, serif))",
            fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 300,
            lineHeight: 1.1, letterSpacing: "-0.02em", color: "#1A1A1A",
            marginBottom: "24px",
          }}>
            Two ways<br/><em style={{ fontStyle: "italic", color: "rgba(26,26,26,0.50)" }}>into the platform.</em>
          </h2>
          <p style={{ fontSize: "15px", fontWeight: 300, lineHeight: 1.8, color: "rgba(26,26,26,0.55)", maxWidth: "400px" }}>
            Clients review and approve content through the dedicated portal. Our internal team manages production in the studio.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Client card */}
          <a href="/portal/login" style={{
            display: "block", padding: "36px 40px",
            background: "#FFFFFF", border: "0.5px solid rgba(26,26,26,0.12)",
            textDecoration: "none", color: "inherit",
            transition: "border-color 0.25s, box-shadow 0.25s",
          }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(26,26,26,0.30)"; el.style.boxShadow = "0 4px 24px rgba(26,26,26,0.06)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(26,26,26,0.12)"; el.style.boxShadow = "none"; }}
          >
            <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(26,26,26,0.35)", marginBottom: "12px" }}>01</div>
            <div style={{
              fontFamily: "var(--font-cormorant, var(--font-playfair, Georgia, serif))",
              fontSize: "24px", fontWeight: 400, color: "#1A1A1A", marginBottom: "8px",
            }}>Client Portal</div>
            <p style={{ fontSize: "14px", fontWeight: 300, color: "rgba(26,26,26,0.55)", lineHeight: 1.6, marginBottom: "20px" }}>
              Review drafts, approve content, and track your LinkedIn performance.
            </p>
            <span style={{ fontSize: "12px", fontWeight: 500, color: "#C9A84C", letterSpacing: "0.06em" }}>Access portal →</span>
          </a>

          {/* Team card */}
          <a href="/login" style={{
            display: "block", padding: "36px 40px",
            background: "#F5F2EE", border: "0.5px solid rgba(26,26,26,0.10)",
            textDecoration: "none", color: "inherit",
            transition: "border-color 0.25s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,26,26,0.25)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,26,26,0.10)"; }}
          >
            <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(26,26,26,0.35)", marginBottom: "12px" }}>02</div>
            <div style={{
              fontFamily: "var(--font-cormorant, var(--font-playfair, Georgia, serif))",
              fontSize: "24px", fontWeight: 400, color: "#1A1A1A", marginBottom: "8px",
            }}>Content Studio</div>
            <p style={{ fontSize: "14px", fontWeight: 300, color: "rgba(26,26,26,0.55)", lineHeight: 1.6, marginBottom: "20px" }}>
              Internal team access to compose, schedule, and manage all client content.
            </p>
            <span style={{ fontSize: "12px", fontWeight: 500, color: "rgba(26,26,26,0.40)", letterSpacing: "0.06em" }}>Team login →</span>
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: "#1A1814", color: "#F5F2EE", padding: "64px 48px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "48px", marginBottom: "48px" }}>
          <div>
            <div style={{ marginBottom: "20px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/linkwright-logo.png" alt="Linkwright" style={{ height: "32px", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
            </div>
            <p style={{
              fontFamily: "var(--font-cormorant, var(--font-playfair, Georgia, serif))",
              fontSize: "17px", fontWeight: 300, fontStyle: "italic",
              color: "rgba(244,241,236,0.55)", lineHeight: 1.6, maxWidth: "280px",
            }}>
              Engineered for LinkedIn. Optimised for 2026.
            </p>
          </div>
          <div>
            <div style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(244,241,236,0.30)", marginBottom: "20px" }}>Platform</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[["Client Portal", "/portal/login"], ["Team Login", "/login"]].map(([label, href]) => (
                <a key={label} href={href} style={{ fontSize: "14px", fontWeight: 300, color: "rgba(244,241,236,0.60)", textDecoration: "none", transition: "color 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F5F2EE"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(244,241,236,0.60)"; }}
                >{label}</a>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(244,241,236,0.30)", marginBottom: "20px" }}>Company</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {["Gorlin Companies", "Bioscience Portfolio", "Content Studio"].map(label => (
                <span key={label} style={{ fontSize: "14px", fontWeight: 300, color: "rgba(244,241,236,0.40)" }}>{label}</span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderTop: "0.5px solid rgba(244,241,236,0.10)", paddingTop: "28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "12px", fontWeight: 300, color: "rgba(244,241,236,0.25)", letterSpacing: "0.04em" }}>© 2026 Linkwright Studios. All rights reserved.</span>
          <span style={{ fontSize: "11px", fontWeight: 300, color: "rgba(244,241,236,0.20)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Gorlin Companies</span>
        </div>
      </footer>

      <style>{`
        @media (max-width: 900px) {
          .landing-hero-grid { grid-template-columns: 1fr !important; }
          .landing-hero-right { display: none !important; }
          .landing-access-grid { grid-template-columns: 1fr !important; }
          .landing-services-grid { grid-template-columns: 1fr !important; }
          .landing-philosophy-pillars { grid-template-columns: 1fr !important; gap: 32px !important; }
          .landing-footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function ServiceCard({ num, title, desc }: { num: string; title: string; desc: string }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "#1A1814" : "#F5F2EE",
        padding: "48px 40px", position: "relative", overflow: "hidden",
        cursor: "default", transition: "background 0.3s",
      }}
    >
      <span style={{ display: "block", fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "13px", color: hover ? "rgba(244,241,236,0.35)" : "rgba(26,26,26,0.30)", marginBottom: "48px", transition: "color 0.3s" }}>{num}</span>
      <h3 style={{
        fontFamily: "var(--font-cormorant, var(--font-playfair, Georgia, serif))",
        fontSize: "24px", fontWeight: 400, color: hover ? "#F5F2EE" : "#1A1A1A",
        marginBottom: "14px", lineHeight: 1.2, transition: "color 0.3s",
      }}>{title}</h3>
      <p style={{ fontSize: "14px", fontWeight: 300, lineHeight: 1.7, color: hover ? "rgba(244,241,236,0.60)" : "rgba(26,26,26,0.55)", transition: "color 0.3s" }}>{desc}</p>
      <span style={{
        position: "absolute", bottom: "36px", right: "36px",
        fontSize: "18px", color: hover ? "rgba(244,241,236,0.45)" : "rgba(26,26,26,0.20)",
        transition: "color 0.3s, transform 0.3s",
        transform: hover ? "translate(4px,-4px)" : "none",
      }}>↗</span>
    </div>
  );
}

// ── Main Platform ─────────────────────────────────────────────────────────────
export default function Platform() {
  const [authRole, setAuthRole] = useState<"agency" | null | undefined>(undefined);
  const [clients, setClients] = useState<Company[]>([]);
const [ac, setAc] = useState<Company | null>(null);
const [ap, setAp] = useState<Pillar | null>(null);
const [loadingClients, setLoadingClients] = useState(true);
  const [tab, setTab]                 = useState<Tab>("overview");
  const [post, setPost]               = useState("");
  const [isGen, setIsGen]             = useState(false);
  const [isSave, setIsSave]           = useState(false);
  const [posts, setPosts]             = useState<Post[]>([]);
  const [allPosts, setAllPosts]       = useState<Post[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [note, setNote]               = useState("");
  const [noteType, setNoteType]       = useState<"default"|"success"|"error">("default");
  const [svg, setSvg]                 = useState("");
  const [isVisual, setIsVisual]       = useState(false);
  const [vizType, setVizType]         = useState<VisualType>("quote");
  const [refineRequest, setRefineRequest] = useState("");
  const [isRefining, setIsRefining]   = useState(false);
  const [svgRefineRequest, setSvgRefineRequest] = useState("");
  const [isVisualRefining, setIsVisualRefining] = useState(false);
  const [imgUrl, setImgUrl]           = useState("");
  const [imgProvider, setImgProvider] = useState("");
  const [isImgGen, setIsImgGen]       = useState(false);

  const notify = useCallback((m: string, t: "default"|"success"|"error" = "default") => {
    setNote(m); setNoteType(t);
    setTimeout(() => setNote(""), 3000);
  }, []);

  const fetchPosts = useCallback(async () => {
  if (!ac) return;
  const p = new URLSearchParams();
  p.set("company_id", ac.id);
  if (filterStatus !== "all") p.set("status", filterStatus);
  const r = await fetch(`/api/posts?${p}`);
  const d = await r.json();
  setPosts(d.posts || []);
}, [ac, filterStatus]);

  const fetchAllPosts = useCallback(async () => {
    const r = await fetch("/api/posts");
    const d = await r.json();
    setAllPosts(d.posts || []);
  }, []);
useEffect(() => {
  fetch("/api/clients")
    .then(r => r.json())
    .then(d => {
      if (d.clients && d.clients.length > 0) {
        setClients(d.clients);
        setAc(d.clients[0]);
        setAp(d.clients[0].pillars[0]);
      }
      setLoadingClients(false);
    });
}, []);
  useEffect(() => { fetchPosts(); }, [fetchPosts]);
  useEffect(() => { fetchAllPosts(); }, [fetchAllPosts]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => setAuthRole(data?.role === "agency" ? "agency" : null))
      .catch(() => setAuthRole(null));
  }, []);

  const switchCompany = (c: Company) => {
    setAc(c); setAp(c.pillars[0]); setPost(""); setSvg(""); setImgUrl(""); setImgProvider("");
  };

  const generate = async () => {
    setIsGen(true); setPost(""); setSvg("");
    try {
      const r = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company: ac, pillar: ap }) });
      const d = await r.json();
      setPost(d.content || "Error generating.");
    } catch { setPost("Error. Please try again."); }
    setIsGen(false);
  };

  const generateVisual = async (postContentOverride?: string) => {
    setIsVisual(true); setSvg("");
    try {
      const r = await fetch("/api/visual", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company: ac, pillar: ap, visualType: vizType, postContent: postContentOverride ?? post }) });
      const d = await r.json();
      setSvg(d.svg || "");
    } catch { notify("Visual generation failed", "error"); }
    setIsVisual(false);
  };

  const generateAiImage = async (editRequest?: string, postContentOverride?: string) => {
    setIsImgGen(true);
    if (!editRequest) setImgUrl("");
    try {
      const r = await fetch("/api/image-generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company: ac, pillar: ap, visualType: vizType, postContent: postContentOverride ?? post, editRequest }) });
      const d = await r.json();
      if (d.imageUrl) { setImgUrl(d.imageUrl); setImgProvider(d.provider || ""); notify("Image generated", "success"); }
      else notify(d.error || "Image generation failed", "error");
    } catch { notify("Image generation failed", "error"); }
    setIsImgGen(false);
  };

  const refinePost = async () => {
    if (!post || !refineRequest.trim()) return;
    setIsRefining(true);
    try {
      const r = await fetch("/api/refine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company: ac, pillar: ap, currentPost: post, request: refineRequest }) });
      const d = await r.json();
      if (d.content) { setPost(d.content); setRefineRequest(""); notify("Post refined", "success"); }
    } catch { notify("Refine failed. Try again", "error"); }
    setIsRefining(false);
  };

  const refineVisual = async () => {
    if (!svg || !svgRefineRequest.trim()) return;
    setIsVisualRefining(true);
    try {
      const r = await fetch("/api/visual-refine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentSvg: svg, editRequest: svgRefineRequest, company: ac }) });
      const d = await r.json();
      if (d.svg) { setSvg(d.svg); setSvgRefineRequest(""); notify("Image updated", "success"); }
      else notify("Refine failed. Try again", "error");
    } catch { notify("Refine failed. Try again", "error"); }
    setIsVisualRefining(false);
  };

  const savePost = async (status: "draft" | "approved", imageUrl?: string) => {
    if (!post) return;
    setIsSave(true);
    await fetch("/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company_id: ac.id, company_name: ac.name, post_type: ap.type, scheduled_day: ap.day, content: post, status, image_url: imageUrl || null }) });
    setIsSave(false); notify(`Saved as ${status}`, "success"); fetchPosts(); fetchAllPosts();
  };

  const copy = (t: string) => { navigator.clipboard.writeText(t); notify("Copied to clipboard", "success"); };

  const downloadSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${ac.id}-${vizType}-${Date.now()}.svg`; a.click();
    notify("SVG downloaded", "success");
  };
if (authRole === undefined) {
  return <div style={{ minHeight: "100vh", background: "#F5F2EE" }} />;
}
if (authRole === null) {
  window.location.replace("/landing");
  return <div style={{ minHeight: "100vh", background: "#F5F2EE" }} />;
}
if (loadingClients || !ac || !ap) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#F5F2EE",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "rgba(26,26,26,0.40)",
      fontSize: "14px",
    }}>
      Loading clients…
    </div>
  );
}
  // Count posts with change-request notes (returned to draft with client feedback)
  const changeRequestCount = posts.filter(p => p.status === "draft" && p.notes).length;

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: "overview",  label: "Overview"  },
    { id: "compose",   label: "Compose"   },
    { id: "library",   label: "Library", badge: changeRequestCount },
    { id: "calendar",  label: "Calendar"  },
    { id: "reports",   label: "Reports"   },
    { id: "invoices",  label: "Invoices"  },
    { id: "clients",   label: "Clients"   },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F5F2EE", color: "#1A1A1A", paddingTop: "64px" }}>

      {/* Toast */}
      {note && <Toast message={note} type={noteType} />}

      {/* ── Nav ── */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(244,241,236,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "0.5px solid rgba(26,24,20,0.10)",
      }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 32px", height: "64px", display: "flex", alignItems: "center", gap: "40px" }}>

          {/* Logo + tagline */}
          <a href="/landing" style={{ flexShrink: 0, textDecoration: "none", display: "flex", alignItems: "center", gap: "20px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/linkwright-logo.png" alt="Linkwright" style={{ height: "170px", objectFit: "contain" }} />
            <div style={{ width: "0.5px", height: "28px", background: "rgba(26,24,20,0.15)" }} />
            <span style={{
              fontFamily: "var(--font-cormorant, var(--font-playfair, Georgia, serif))",
              fontSize: "13px", fontWeight: 300, fontStyle: "italic",
              color: "rgba(26,24,20,0.45)", letterSpacing: "0.01em", whiteSpace: "nowrap",
            }}>
              Engineered for LinkedIn. Optimised for 2026.
            </span>
          </a>

          {/* Tabs */}
          <nav style={{ display: "flex", gap: "0px", flex: 1, justifyContent: "center" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  position: "relative",
                  padding: "8px 18px",
                  background: "transparent",
                  border: "none",
                  borderBottom: tab === t.id ? `1px solid ${GOLD}` : "1px solid transparent",
                  fontSize: "12px", fontWeight: 400,
                  letterSpacing: "0.04em",
                  color: tab === t.id ? T : T3,
                  cursor: "pointer",
                  transition: "color 0.15s ease, border-color 0.15s ease",
                  fontFamily: "var(--font-inter, system-ui, sans-serif)",
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  marginBottom: "-1px",
                }}>
                {t.label}
                {t.badge && t.badge > 0 ? (
                  <span style={{ minWidth: "16px", height: "16px", borderRadius: "8px", background: "rgba(201,168,76,0.15)", color: GOLD, border: "1px solid rgba(201,168,76,0.3)", fontSize: "9px", fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {t.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          {/* Company switcher + back to main site + logout */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            <CompanySwitcher ac={ac} clients={clients} onChange={switchCompany} />
            <a href="/landing" style={{
              fontSize: "12px", fontWeight: 500,
              color: T3,
              textDecoration: "none",
              padding: "6px 14px",
              background: "transparent",
              border: "1px solid rgba(26,26,26,0.12)",
              borderRadius: "6px",
              fontFamily: "var(--font-dm-sans, system-ui, sans-serif)",
              transition: "all 0.15s ease",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,26,26,0.22)"; (e.currentTarget as HTMLElement).style.color = T2; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,26,26,0.12)"; (e.currentTarget as HTMLElement).style.color = T3; }}
            >
              ← Back to main site
            </a>
            <a href="/portal" target="_blank" rel="noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              padding: "6px 12px",
              background: "transparent",
              border: "1px solid rgba(26,26,26,0.12)",
              borderRadius: "6px",
              color: T3,
              textDecoration: "none",
              fontSize: "11px",
              letterSpacing: "0.06em",
              fontFamily: "var(--font-inter, system-ui, sans-serif)",
              transition: "all 0.15s ease",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,26,26,0.22)"; (e.currentTarget as HTMLElement).style.color = T2; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,26,26,0.12)"; (e.currentTarget as HTMLElement).style.color = T3; }}
              title="Open client portal"
            >
              Portal ↗
            </a>
            <a href="/login" style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "32px", height: "32px",
              background: "transparent",
              border: "1px solid rgba(26,26,26,0.12)",
              borderRadius: "6px",
              color: T3,
              textDecoration: "none",
              fontSize: "14px",
              transition: "all 0.15s ease",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,26,26,0.22)"; (e.currentTarget as HTMLElement).style.color = T2; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,26,26,0.12)"; (e.currentTarget as HTMLElement).style.color = T3; }}
              title="Sign out"
            >
              ↩
            </a>
          </div>
        </div>

      </header>

      {/* Scrolling marquee */}
      <div style={{
        height: "40px",
        background: "#FFFFFF",
        borderTop: "1px solid rgba(26,26,26,0.06)",
        borderBottom: "1px solid rgba(26,26,26,0.08)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
      }}>
        <div className="marquee-track">
          {[...clients, ...clients].map((c, i) => (
            <span key={i} style={{
              display: "inline-flex", alignItems: "center", gap: "10px",
              padding: "0 40px",
              fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase",
              color: T3,
              fontFamily: "var(--font-inter, system-ui, sans-serif)",
              whiteSpace: "nowrap",
            }}>
              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: c.color, display: "inline-block", flexShrink: 0 }} />
              <span style={{ color: T2 }}>{c.name}</span>
              <span style={{ color: "rgba(26,26,26,0.18)" }}>·</span>
              <span>{c.tagline || c.timezone}</span>
              <span style={{ color: "rgba(26,26,26,0.18)" }}>·</span>
              <span>{c.timezone}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Light image banner — services.png with cream overlay, matching landing page split section */}
      <div style={{ position: "relative", height: "160px", overflow: "hidden", background: "#EDE8E0" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/services.png" alt="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "brightness(1.05) contrast(1.05) saturate(0.6)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(244,241,236,0.80) 0%, rgba(244,241,236,0.60) 100%)" }} />
        <div style={{ position: "relative", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "10px" }}>
          <div style={{ width: "28px", height: "1px", background: "#C9A84C" }} />
          <p style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "clamp(18px, 2vw, 28px)", fontWeight: 300, fontStyle: "italic", color: "#1A1814", letterSpacing: "-0.01em" }}>
            {ac ? ac.name : "Content Studio"}
          </p>
          <div style={{ width: "28px", height: "1px", background: "#C9A84C" }} />
        </div>
      </div>

      {/* ── Main content ── */}
      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "32px 32px 80px" }}>
        {tab === "overview"  && <OverviewTab  ac={ac} clients={clients} posts={posts} allPosts={allPosts} />}
        {tab === "compose"   && (
          <ComposeTab
            ac={ac} ap={ap} setAp={setAp}
            post={post} setPost={setPost}
            isGen={isGen} isSave={isSave} isVisual={isVisual} isRefining={isRefining} isVisualRefining={isVisualRefining}
            svg={svg} setSvg={setSvg} vizType={vizType} setVizType={setVizType}
            refineRequest={refineRequest} setRefineRequest={setRefineRequest}
            svgRefineRequest={svgRefineRequest} setSvgRefineRequest={setSvgRefineRequest}
            imgUrl={imgUrl} imgProvider={imgProvider} isImgGen={isImgGen} clearImgUrl={() => setImgUrl("")}
            generate={generate} generateVisual={generateVisual} generateAiImage={generateAiImage} refinePost={refinePost} refineVisual={refineVisual}
            savePost={savePost} copy={copy} downloadSvg={downloadSvg} notify={notify}
          />
        )}
        {tab === "library"   && (
          <LibraryTab
            ac={ac} posts={posts} filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            fetchPosts={() => { fetchPosts(); fetchAllPosts(); }} notify={notify} copy={copy}
          />
        )}
        {tab === "calendar"  && <CalendarTab  ac={ac} clients={clients} />}
        {tab === "reports"   && <ReportsTab   ac={ac} />}
        {tab === "invoices"  && <InvoicesTab  ac={ac} notify={notify} />}
        {tab === "clients" && <ClientsTab clients={clients} notify={notify} onClientAdded={() => {
  fetch("/api/clients")
    .then(r => r.json())
    .then(d => {
      if (d.clients && d.clients.length > 0) {
        setClients(d.clients);
      }
    });
}} />}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(20px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
