"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Company, Pillar } from "@/lib/companies";
import ComposeCanvas, { type ComposeCanvasHandle } from "./ComposeCanvas";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────
type Report = {
  id: number;
  client_id: string;
  type: "monthly" | "weekly";
  period_start: string;
  period_end: string;
  status: "draft" | "published";
  raw_pdf_url: string | null;
  extracted_data: string | null;
  narrative_agency: string | null;
  narrative_client: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};
type ExtractedData = {
  impressions?: number | null;
  reach?: number | null;
  engagementRate?: number | null;
  totalEngagements?: number | null;
  reactions?: number | null;
  comments?: number | null;
  shares?: number | null;
  clicks?: number | null;
  followerCount?: number | null;
  followerGrowth?: number | null;
  followerGrowthPercent?: number | null;
  posts?: Array<{
    date?: string | null;
    content?: string | null;
    impressions?: number | null;
    engagementRate?: number | null;
    reactions?: number | null;
    comments?: number | null;
    shares?: number | null;
    clicks?: number | null;
    type?: string | null;
  }>;
  topPost?: { date?: string | null; content?: string | null; impressions?: number | null; engagementRate?: number | null } | null;
  periodStart?: string | null;
  periodEnd?: string | null;
};
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
  image_canvas_json: string | null;
  week_number: number | null;
  approved_at: string | null;
  scheduled_at: string | null;
  posted_at: string | null;
  linkedin_post_id: string | null;
  created_at: string;
  updated_at: string;
};
type Tab = "overview" | "compose" | "library" | "calendar" | "reports" | "invoices" | "clients" | "clientusers";

// ── Client Users / Messages types ──────────────────────────────────────────────
type ClientUser = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  company_id: string;
  company_name: string;
  job_title: string | null;
  phone: string | null;
  notes: string | null;
  must_reset_password: number;
  active: number;
  created_at: string;
  last_login: string | null;
  unread: number;
};
type MessageThread = {
  client_user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  company_name: string;
  last_body: string;
  last_at: string;
  unread: number;
};
type ClientMessage = {
  id: number;
  client_user_id: number;
  sender: "client" | "admin";
  body: string;
  created_at: string;
  read_at: string | null;
};
const ROLE_LIMITS: Record<string, number> = { owner: 1, administrator: 5, user: 10 };
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


// ── Style helpers ─────────────────────────────────────────────────────────────
const T = "#0A0A0A";           // primary text
const T2 = "#666666";          // secondary text
const T3 = "#999999";          // muted text
const GOLD = "#E30000";

const glass = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "#FFFFFF",
  border: "1px solid #E5E5E5",
  borderRadius: "12px",
  ...extra,
});

const glassElevated = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "#F5F5F5",
  border: "1px solid #E5E5E5",
  borderRadius: "12px",
  ...extra,
});

const INPUT: React.CSSProperties = {
  width: "100%",
  background: "#FFFFFF",
  border: "1px solid #E5E5E5",
  borderRadius: "8px",
  padding: "10px 12px",
  fontSize: "14px",
  color: "#0A0A0A",
  outline: "none",
  fontFamily: "Helvetica, Arial, sans-serif",
  lineHeight: 1.6,
  transition: "all 0.15s ease",
};

// ── Sub-components ────────────────────────────────────────────────────────────
function CompanyLogo({ company, overlay }: { company: Company; overlay?: boolean }) {
  const src = LOGO_FILES[company.id] || company.logo_file || null;
  const shouldInvert = (company.brand as Record<string,unknown> | undefined)?.invert_logo;
  const invertFilter = shouldInvert ? "brightness(0) invert(1) " : "";
  const shadowFilter = overlay ? "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" : "";
  const filter = `${invertFilter}${shadowFilter}`.trim() || "none";
  if (!src) return <span style={{ color: T, fontWeight: 400, fontSize: "14px", filter: shadowFilter || "none" }}>{(company.brand as Record<string,unknown> | undefined)?.logoText as string || (company.brand as Record<string,unknown> | undefined)?.logo_text as string || company.name}</span>;
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
    draft:            { bg: "#F5F5F5",          color: "#666666", border: "#E5E5E5"          },
    pending_approval: { bg: "#F5F5F5",          color: "#666666", border: "#E5E5E5"          },
    approved:         { bg: "rgba(10,10,10,0.10)", color: "#0A0A0A", border: "rgba(10,10,10,0.15)" },
    scheduled:        { bg: "rgba(10,10,10,0.10)", color: "#0A0A0A", border: "rgba(10,10,10,0.15)" },
    posted:           { bg: "rgba(227,0,0,0.10)",  color: "#E30000", border: "rgba(227,0,0,0.25)"  },
    paid:             { bg: "rgba(227,0,0,0.10)",  color: "#E30000", border: "rgba(227,0,0,0.25)"  },
    pending:          { bg: "#F5F5F5",          color: "#666666", border: "#E5E5E5"          },
    overdue:          { bg: "rgba(227,0,0,0.10)",  color: "#E30000", border: "rgba(227,0,0,0.25)"  },
  };
  const s = cfg[status] ?? cfg.draft;
  return (
    <span style={{
      fontSize: "12px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "capitalize",
      padding: "4px 12px", borderRadius: "999px",
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontFamily: "Helvetica, Arial, sans-serif",
    }}>
      {status.replace("_", " ")}
    </span>
  );
}

function Spinner() {
  return <span style={{ width: "14px", height: "14px", border: "1.5px solid #E5E5E5", borderTopColor: GOLD, borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block", flexShrink: 0 }} />;
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
    ghost:   { background: "#F5F5F5",            border: "1px solid #E5E5E5",   color: "#666666" },
    primary: { background: "#E30000",            border: "1px solid #E30000",   color: "#FFFFFF"  },
    teal:    { background: "#FFFFFF",            border: "1px solid #E5E5E5",   color: "#0A0A0A" },
    danger:  { background: "rgba(227,0,0,0.08)", border: "1px solid rgba(227,0,0,0.25)",  color: "#E30000" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        padding: "8px 16px",
        borderRadius: "999px",
        fontSize: "13px", fontWeight: 500,
        letterSpacing: "0.01em",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.15s ease",
        fontFamily: "Helvetica, Arial, sans-serif",
        ...variants[variant],
        ...style,
      }}
      onMouseEnter={e => { if (!disabled) { (e.currentTarget as HTMLElement).style.opacity = "0.85"; } }}
      onMouseLeave={e => { if (!disabled) { (e.currentTarget as HTMLElement).style.opacity = "1"; } }}
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
          padding: "8px 14px 8px 12px",
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.4)",
          borderRadius: "999px",
          cursor: "pointer",
          transition: "all 0.15s ease",
          fontFamily: "var(--font-raleway), sans-serif",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#FFFFFF"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.4)"; }}
      >
        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: ac.color, flexShrink: 0 }} />
        <span style={{ fontSize: "13px", fontWeight: 400, color: "#FFFFFF", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ac.name}</span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ color: "#FFFFFF", opacity: 0.7, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          minWidth: "200px",
          background: "#FFFFFF",
          border: "1px solid #E5E5E5",
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
                background: ac.id === c.id ? "#F5F5F5" : "transparent",
                border: "none", borderRadius: "5px",
                cursor: "pointer", transition: "background 0.1s ease",
                fontFamily: "inherit",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#F5F5F5"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ac.id === c.id ? "#F5F5F5" : "transparent"; }}
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
    default: { bg: "#FFFFFF", border: "#E5E5E5",    color: T2,        icon: "·" },
    success: { bg: "#FFFFFF", border: "rgba(227,0,0,0.25)",  color: "#E30000", icon: "✓" },
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
      <span style={{ fontSize: "12px", color: cfg.color, fontWeight: 400 }}>{cfg.icon}</span>
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
    { label: "Posts Scheduled", value: stats.scheduled, color: GOLD },
    { label: "Posts Published",  value: stats.published,  color: GOLD },
    { label: "In Draft",         value: stats.drafts,     color: GOLD },
    { label: "Total Posts",      value: stats.total,      color: GOLD },
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
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: s.color }} />
            <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "13px", color: "#999999", marginBottom: "16px" }}>{s.label}</div>
            <div style={{
              fontFamily: "var(--font-raleway), sans-serif",
              fontSize: "36px", fontWeight: 400,
              color: "#0A0A0A", letterSpacing: "-0.02em", lineHeight: 1,
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
                fontFamily: "var(--font-raleway), sans-serif",
                fontSize: "28px", fontWeight: 300, fontStyle: "normal",
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
                borderBottom: i < clients.length - 1 ? "1px solid #E5E5E5" : "none",
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
                  borderBottom: i < recent.length - 1 ? "1px solid #E5E5E5" : "none",
                }}>
                  <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: p.status === "posted" ? "#E30000" : p.status === "approved" ? "#0A0A0A" : p.status === "pending_approval" ? GOLD : T3, marginTop: "6px", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", color: T2, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                      {p.content.slice(0, 80)}…
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "5px" }}>
                      <span style={{ fontSize: "10px", color: T3 }}>{p.company_name}</span>
                      <span style={{ fontSize: "10px", color: "#E5E5E5" }}>·</span>
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
  imgUrl, imgProvider, imgPrompt, isImgGen, clearImgUrl,
  generate, generateVisual, generateAiImage, refinePost, refineVisual, savePost, sendForApproval, copy, downloadSvg, notify,
}: {
  ac: Company; ap: Pillar; setAp: (p: Pillar) => void;
  post: string; setPost: (s: string) => void;
  isGen: boolean; isSave: boolean; isVisual: boolean; isRefining: boolean; isVisualRefining: boolean;
  svg: string; setSvg: (s: string) => void; vizType: VisualType; setVizType: (v: VisualType) => void;
  refineRequest: string; setRefineRequest: (s: string) => void;
  svgRefineRequest: string; setSvgRefineRequest: (s: string) => void;
  imgUrl: string; imgProvider: string; imgPrompt: string; isImgGen: boolean; clearImgUrl: () => void;
  generate: () => void; generateVisual: (postContentOverride?: string) => void; generateAiImage: (editRequest?: string, postContentOverride?: string) => void;
  refinePost: () => void; refineVisual: () => void;
  savePost: (s: "draft" | "approved", imageUrl?: string) => void;
  sendForApproval: (imageUrl?: string) => void;
  copy: (t: string) => void; downloadSvg: () => void; notify: (m: string, t?: "default" | "success" | "error") => void;
}) {
  const [imageMode, setImageMode] = useState<"ai" | "svg">("ai");
  const [imgEditRequest, setImgEditRequest] = useState("");
  const [genMode, setGenMode] = useState<"post" | "standalone">("post");
  const [standaloneBrief, setStandaloneBrief] = useState("");
  const canvasRef = useRef<ComposeCanvasHandle>(null);
  const charCount = post.length;
  const charLimit = 3000;
  const charPct = Math.min(charCount / charLimit, 1);
  const charColor = charCount > 2800 ? "#cc3333" : charCount > 2500 ? "#E30000" : "#E30000";

  return (
    <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "20px" }}>

      {/* ── Left panel ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* Company card */}
        <div style={glass({ overflow: "hidden" })}>
          <div style={{ padding: "20px", borderBottom: "1px solid #E5E5E5" }}>
            <CompanyLogo company={ac} />
            <div style={{
              fontFamily: "var(--font-raleway), sans-serif",
              fontSize: "13px", fontStyle: "normal", fontWeight: 300,
              color: T3, marginTop: "10px", letterSpacing: "0.02em",
            }}>{ac.tagline}</div>
          </div>
          <div style={{ padding: "14px", display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {((ac.brand as Record<string,unknown> & {badges?: string[]})?.badges ?? []).map((b: string) => (
              <span key={b} style={{ fontSize: "9px", fontWeight: 500, padding: "3px 8px", background: "#F5F5F5", border: "1px solid #E5E5E5", color: T3, borderRadius: "4px", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{b}</span>
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
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #E5E5E5" }}>
            <div className="label">Content pillars</div>
          </div>
          <div style={{ padding: "8px" }}>
            {ac.pillars.map(p => (
              <button key={p.type} onClick={() => setAp(p)}
                style={{
                  width: "100%", textAlign: "left",
                  padding: "10px 12px",
                  background: ap.type === p.type ? "#F5F5F5" : "transparent",
                  border: "none",
                  borderBottom: `none`,
                  borderRadius: "8px",
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
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E5E5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="label" style={{ marginBottom: "6px" }}>Generating for</div>
              <div style={{
                fontFamily: "var(--font-raleway), sans-serif",
                fontSize: "22px", fontWeight: 300, fontStyle: "normal",
                color: T, letterSpacing: "-0.01em", lineHeight: 1,
              }}>
                {ap.type}
                <span style={{ color: T3, fontStyle: "normal", fontSize: "14px", fontFamily: "Helvetica, Arial, sans-serif", fontWeight: 400 }}> · {ap.day} · {ac.name}</span>
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
                      onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                      onBlur={e => e.target.style.borderColor = "#E5E5E5"}
                    />
                    {/* Char counter */}
                    <div style={{ position: "absolute", bottom: "12px", right: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#E5E5E5" strokeWidth="2.5" fill="none" />
                        <circle cx="12" cy="12" r="10" stroke={charColor} strokeWidth="2.5" fill="none"
                          strokeDasharray={`${charPct * 62.8} 62.8`}
                          strokeLinecap="round"
                          transform="rotate(-90 12 12)"
                          style={{ transition: "stroke-dasharray 0.3s ease" }}
                        />
                      </svg>
                      <span style={{ fontSize: "11px", color: charCount > 2800 ? charColor : "#999999", fontWeight: 500 }}>
                        {charLimit - charCount}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                    <GlassBtn onClick={() => copy(post)}>Copy</GlassBtn>
                    <GlassBtn onClick={() => savePost("draft", imageMode === "ai" ? imgUrl || undefined : undefined)} disabled={isSave}>Save draft</GlassBtn>
                    <GlassBtn onClick={() => {
                      const dataUrl = imgUrl ? (canvasRef.current?.getCanvasDataURL() ?? imgUrl) : undefined;
                      sendForApproval(dataUrl);
                    }} disabled={isSave || !post.trim()} variant="primary">
                      {isSave ? <><Spinner /> Sending…</> : "Send for Approval ↗"}
                    </GlassBtn>
                    <GlassBtn onClick={() => savePost("approved", imageMode === "ai" ? imgUrl || undefined : undefined)} disabled={isSave} variant="teal">Approve & save</GlassBtn>
                    <GlassBtn onClick={generate} disabled={isGen}>Regenerate</GlassBtn>
                  </div>
                </div>

                {/* LinkedIn Preview */}
                <div style={{ background: "#f3f2ef", borderRadius: "12px", overflow: "hidden", border: "1px solid #E5E5E5" }}>
                  <div style={{ padding: "16px", background: "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: `linear-gradient(135deg, ${ac.color}cc, ${ac.color}55)`, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 400, color: "#000", lineHeight: 1.3 }}>{ac.name}</div>
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
                <p style={{ color: T3, fontFamily: "var(--font-raleway), sans-serif", fontStyle: "normal", fontSize: "16px" } as React.CSSProperties}>Writing in {ac.name}&apos;s voice…</p>
              </div>
            ) : (
              <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #E5E5E5", borderRadius: "8px", flexDirection: "column", gap: "12px" }}>
                <div style={{ width: "32px", height: "1px", background: GOLD, opacity: 0.4 }} />
                <p style={{ fontSize: "13px", color: T3, fontFamily: "var(--font-raleway), sans-serif", fontStyle: "normal" }}>Select a pillar and generate</p>
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
                    background: refineRequest === s ? "rgba(227,0,0,0.08)" : "transparent",
                    border: refineRequest === s ? "1px solid rgba(227,0,0,0.3)" : "1px solid #E5E5E5",
                    borderRadius: "8px", color: refineRequest === s ? GOLD : T3,
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
                onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                onBlur={e => e.target.style.borderColor = "#E5E5E5"}
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
              <div style={{ display: "flex", gap: "2px", background: "#F5F5F5", border: "1px solid #E5E5E5", borderRadius: "9px", padding: "3px" }}>
                {(["post", "standalone"] as const).map(m => (
                  <button key={m} onClick={() => setGenMode(m)}
                    style={{
                      fontSize: "11px", fontWeight: 400, padding: "4px 11px",
                      background: genMode === m ? "#E5E5E5" : "transparent",
                      border: "none", borderRadius: "8px",
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
            <div style={{ display: "flex", gap: "2px", background: "#F5F5F5", border: "1px solid #E5E5E5", borderRadius: "9px", padding: "3px" }}>
              {(["ai", "svg"] as const).map(m => (
                <button key={m} onClick={() => setImageMode(m)}
                  style={{
                    fontSize: "11px", fontWeight: 400, padding: "4px 12px",
                    background: imageMode === m ? "#E5E5E5" : "transparent",
                    border: "none", borderRadius: "8px",
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
                  fontSize: "11px", fontWeight: 400, padding: "5px 12px",
                  background: vizType === t ? "rgba(227,0,0,0.08)" : "transparent",
                  border: vizType === t ? `1px solid rgba(227,0,0,0.3)` : "1px solid #E5E5E5",
                  borderRadius: "8px", color: vizType === t ? GOLD : T3,
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
              onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
              onBlur={e => e.target.style.borderColor = "#E5E5E5"}
            />
          )}

          {imageMode === "ai" ? (
            /* ── AI Image mode ── */
            imgUrl ? (
              <>
                <ComposeCanvas ref={canvasRef} imgUrl={imgUrl} imgProvider={imgProvider} imgPrompt={imgPrompt} ac={ac} notify={notify} />
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap", marginTop: "4px" }}>
                  <GlassBtn onClick={() => canvasRef.current?.downloadCanvas()}>Download</GlassBtn>
                  <GlassBtn onClick={() => generateAiImage(undefined, genMode === "standalone" ? standaloneBrief : undefined)} disabled={isImgGen}>{isImgGen ? <><Spinner /> Regenerating…</> : "Regenerate"}</GlassBtn>
                  <GlassBtn onClick={clearImgUrl} variant="ghost">Clear</GlassBtn>
                </div>
                <div style={{ borderTop: "1px solid #E5E5E5", paddingTop: "16px" }}>
                  <div className="label" style={{ marginBottom: "10px" }}>Edit this image</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "10px" }}>
                    {["Change the color scheme","Make it more minimal","Bolder typography","Add more contrast","Brighter background","Darker mood","More whitespace","Stronger visual hierarchy"].map(s => {
                      const canvasDirect = ["Make it more minimal","Bolder typography","Add more contrast","More whitespace"];
                      return (
                        <button key={s} onClick={() => {
                          if (canvasDirect.includes(s)) {
                            canvasRef.current?.applyPreset(s);
                          } else {
                            setImgEditRequest(s);
                          }
                        }}
                          style={{
                            fontSize: "11px", padding: "5px 10px",
                            background: imgEditRequest === s ? "rgba(227,0,0,0.08)" : "transparent",
                            border: imgEditRequest === s ? "1px solid rgba(227,0,0,0.3)" : "1px solid #E5E5E5",
                            borderRadius: "8px", color: imgEditRequest === s ? GOLD : T3,
                            cursor: "pointer", transition: "all 0.15s ease", fontFamily: "inherit", fontWeight: 500,
                          }}>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text" value={imgEditRequest}
                      onChange={e => setImgEditRequest(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && imgEditRequest.trim()) { generateAiImage(imgEditRequest, genMode === "standalone" ? standaloneBrief : undefined); setImgEditRequest(""); } }}
                      placeholder="Describe your edit…"
                      style={{ ...INPUT, flex: 1, padding: "9px 14px" }}
                      onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                      onBlur={e => e.target.style.borderColor = "#E5E5E5"}
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
                <div style={{ border: "1px solid #E5E5E5", borderRadius: "8px", overflow: "hidden", marginBottom: "12px", position: "relative" }}>
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
                <div style={{ borderTop: "1px solid #E5E5E5", paddingTop: "16px" }}>
                  <div className="label" style={{ marginBottom: "10px" }}>Edit this image</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "10px" }}>
                    {["Make the background darker","Use larger headline text","Add more white space","Make it more minimal","Increase contrast","Bolder typography","Lighter background","More padding"].map(s => (
                      <button key={s} onClick={() => setSvgRefineRequest(s)}
                        style={{
                          fontSize: "11px", padding: "5px 10px",
                          background: svgRefineRequest === s ? "rgba(227,0,0,0.08)" : "transparent",
                          border: svgRefineRequest === s ? "1px solid rgba(227,0,0,0.25)" : "1px solid #E5E5E5",
                          borderRadius: "8px", color: svgRefineRequest === s ? "#E30000" : T3,
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
                      onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.25)"}
                      onBlur={e => e.target.style.borderColor = "#E5E5E5"}
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
  const [schedulingId, setSchedulingId] = useState<number | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");
  const [postingToLinkedIn, setPostingToLinkedIn] = useState<number | null>(null);

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
  const schedulePost = async (p: Post) => {
    if (!scheduleAt) return;
    await fetch("/api/posts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, scheduled_at: scheduleAt }) });
    setSchedulingId(null); setScheduleAt(""); fetchPosts(); notify("Post scheduled ✓", "success");
  };
  const postToLinkedIn = async (p: Post) => {
    setPostingToLinkedIn(p.id);
    try {
      const res = await fetch("/api/linkedin/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: p.id, clientId: ac.id }),
      });
      const d = await res.json();
      if (d.error) { notify(d.error, "error"); }
      else { notify("Posted to LinkedIn ✓", "success"); fetchPosts(); }
    } catch { notify("LinkedIn post failed", "error"); }
    setPostingToLinkedIn(null);
  };

  return (
    <div className="fade-up">
      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px", background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: "8px", padding: "10px 12px" }}>
        {(["all","draft","pending_approval","approved","posted"] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{
              fontSize: "13px", fontWeight: 500, padding: "6px 14px",
              background: filterStatus === s ? "#E30000" : "#F5F5F5",
              border: "none",
              color: filterStatus === s ? "#FFFFFF" : "#666666",
              borderRadius: "999px",
              cursor: "pointer",
              transition: "all 0.15s ease", fontFamily: "Helvetica, Arial, sans-serif",
              textTransform: "capitalize" as const, letterSpacing: "0.02em",
            }}>
            {s.replace("_", " ")}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: "13px", color: "#999999", fontFamily: "Helvetica, Arial, sans-serif" }}>{posts.length} posts</span>
      </div>

      {posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "100px 0" }}>
          <div style={{ width: "32px", height: "1px", background: GOLD, opacity: 0.3, margin: "0 auto 20px" }} />
          <p style={{ fontSize: "14px", color: T3, fontFamily: "var(--font-raleway), sans-serif", fontStyle: "normal" }}>No posts yet for {ac.name}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {posts.map((p, i) => (
            <div key={p.id} className={`fade-up fade-up-${Math.min(i, 3) + 1 as 1|2|3|4}`} style={{
              background: "#FFFFFF",
              border: "1px solid #E5E5E5",
              borderRadius: "12px",
              padding: "20px",
            }}>
              {editPost?.id === p.id ? (
                <div style={{ padding: "20px 0" }}>
                  <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={10}
                    style={{ ...INPUT, resize: "none" }}
                    onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                    onBlur={e => e.target.style.borderColor = "#E5E5E5"}
                  />
                  <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                    <GlassBtn onClick={saveEdit} variant="teal">Save changes</GlassBtn>
                    <GlassBtn onClick={() => setEditPost(null)}>Cancel</GlassBtn>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ padding: "0 0 12px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <div style={{ width: "3px", height: "14px", borderRadius: "2px", background: ac.color, flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.04em", color: "#999999", fontFamily: "Helvetica, Arial, sans-serif" }}>{p.post_type}</span>
                    <span style={{ color: "#E5E5E5" }}>·</span>
                    <span style={{ fontSize: "12px", letterSpacing: "0.02em", color: "#999999", fontFamily: "Helvetica, Arial, sans-serif" }}>{p.scheduled_day}</span>
                    <div style={{ marginLeft: "auto" }}><StatusBadge status={p.status} /></div>
                  </div>
                  <div>
                    {p.image_url && (
                      <div style={{ marginBottom: "14px", borderRadius: "8px", overflow: "hidden", border: "1px solid #E5E5E5" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image_url} alt="Post visual" style={{ width: "100%", maxHeight: "280px", objectFit: "cover", display: "block" }} />
                      </div>
                    )}
                    <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#0A0A0A", whiteSpace: "pre-wrap", fontFamily: "Helvetica, Arial, sans-serif" }}>{p.content}</p>
                    {p.notes && (
                      <div style={{ marginTop: "14px", padding: "10px 14px", background: "rgba(204,68,68,0.05)", border: "1px solid rgba(204,68,68,0.15)", borderRadius: "8px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                        <span style={{ fontSize: "9px", fontWeight: 400, color: "#cc3333", letterSpacing: "0.12em", textTransform: "uppercase" as const, flexShrink: 0, marginTop: "2px" }}>Change request</span>
                        <p style={{ fontSize: "12px", color: "rgba(208,112,112,0.8)", lineHeight: 1.6, margin: 0 }}>{p.notes}</p>
                      </div>
                    )}
                    {p.scheduled_at && (
                      <div style={{ marginTop: "10px", display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", background: "#F5F5F5", border: "1px solid #E5E5E5", borderRadius: "8px" }}>
                        <span style={{ fontSize: "10px", color: T3, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Scheduled</span>
                        <span style={{ fontSize: "11px", color: T2, fontWeight: 500 }}>{new Date(p.scheduled_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                      </div>
                    )}
                    {schedulingId === p.id ? (
                      <div style={{ marginTop: "12px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        <input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)}
                          style={{ ...INPUT, width: "auto", flex: "none", padding: "7px 11px", fontSize: "12px" }}
                          onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                          onBlur={e => e.target.style.borderColor = "#E5E5E5"}
                        />
                        <GlassBtn onClick={() => schedulePost(p)} disabled={!scheduleAt} variant="teal">Confirm</GlassBtn>
                        <GlassBtn onClick={() => { setSchedulingId(null); setScheduleAt(""); }}>Cancel</GlassBtn>
                      </div>
                    ) : (
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
                        {p.status === "draft"    && <button onClick={() => updateStatus(p,"approved")} style={{ fontSize: "11px", color: "#0A0A0A", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Approve</button>}
                        {p.status === "pending_approval" && <button onClick={() => updateStatus(p,"approved")} style={{ fontSize: "11px", color: "#0A0A0A", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Approve</button>}
                        {(p.status === "approved" || p.status === "scheduled") && (
                          <button onClick={() => { setSchedulingId(p.id); setScheduleAt(p.scheduled_at?.slice(0,16) || ""); }} style={{ fontSize: "11px", color: GOLD, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                            {p.scheduled_at ? "Reschedule" : "Schedule"}
                          </button>
                        )}
                        {(p.status === "approved" || p.status === "scheduled") && (
                          <button onClick={() => postToLinkedIn(p)} disabled={postingToLinkedIn === p.id}
                            style={{ fontSize: "11px", color: "#0A66C2", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase" as const, display: "flex", alignItems: "center", gap: "4px" }}>
                            {postingToLinkedIn === p.id ? <><Spinner /> Posting…</> : "Post to LinkedIn"}
                          </button>
                        )}
                        {p.status === "approved" && <button onClick={() => updateStatus(p,"posted")} style={{ fontSize: "11px", color: "#E30000", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Mark posted</button>}
                        <button onClick={() => deletePost(p.id)} style={{ fontSize: "11px", color: "rgba(204,68,68,0.5)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", marginLeft: "auto", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Delete</button>
                      </div>
                    )}
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
function CalendarTab({ ac, clients, allPosts }: { ac: Company; clients: Company[]; allPosts: Post[] }) {
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
              fontFamily: "var(--font-raleway), sans-serif",
              fontSize: "18px", fontWeight: 300, fontStyle: "normal",
              color: T, marginBottom: "6px", lineHeight: 1.2,
            }}>{s.role}</div>
            <p style={{ fontSize: "11px", color: T3, lineHeight: 1.6 }}>{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={glass()}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid #E5E5E5" }}>
          {DAY_ORDER.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: "10px", fontWeight: 400, letterSpacing: "0.1em", textTransform: "uppercase", color: activeDays.includes(d) ? "#666666" : "#999999", padding: "14px 0", borderRight: "1px solid #E5E5E5" }}>{d.slice(0,3)}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
          {DAY_ORDER.map(day => {
            const dayCompanies = clients.filter(c => getPostingDays(c).includes(day));
            const dayPosts = allPosts.filter(p => p.scheduled_day === day && (p.status === "scheduled" || p.status === "approved" || p.status === "posted"));
            const postStatusColor: Record<string, string> = { approved: "#0A0A0A", scheduled: GOLD, posted: "#E30000" };
            return (
              <div key={day} style={{ minHeight: "160px", padding: "12px 10px", borderRight: "1px solid #E5E5E5", borderBottom: "1px solid #E5E5E5", background: !activeDays.includes(day) ? "#F5F5F5" : "transparent" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {dayCompanies.map(c => {
                    const pil = (Array.isArray(c.pillars) ? c.pillars : []).find((p: Record<string,unknown>) => p.day === day) as Record<string,unknown> | undefined;
                    const bestTime = getBestTimes(c)[day];
                    const isActive = ac.id === c.id;
                    return (
                      <div key={c.id} style={{
                        padding: "8px 10px",
                        background: isActive ? `${c.color}14` : "#F5F5F5",
                        border: `1px solid ${isActive ? `${c.color}40` : "#E5E5E5"}`,
                        borderLeft: `3px solid ${c.color}`,
                        borderRadius: "8px",
                      }}>
                        <div style={{ fontSize: "10px", fontWeight: 400, color: c.color, marginBottom: "3px", letterSpacing: "0.01em" }}>{c.name.split(" ")[0]}</div>
                        {pil && <div style={{ fontSize: "10px", color: "#999999" }}>{pil.type as string}</div>}
                        {bestTime && <div style={{ fontSize: "10px", color: c.color, marginTop: "4px", fontWeight: 400 }}>◷ {bestTime}</div>}
                      </div>
                    );
                  })}
                  {dayPosts.map(p => (
                    <div key={p.id} style={{
                      padding: "6px 8px",
                      background: `${postStatusColor[p.status] || T3}10`,
                      border: `1px solid ${postStatusColor[p.status] || T3}30`,
                      borderLeft: `3px solid ${postStatusColor[p.status] || T3}`,
                      borderRadius: "8px",
                    }}>
                      <div style={{ fontSize: "9px", fontWeight: 400, color: postStatusColor[p.status] || T3, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "2px" }}>{p.status}</div>
                      <div style={{ fontSize: "10px", color: T2, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{p.content.slice(0, 60)}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule table */}
      <div style={glass()}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E5E5" }}>
          <div className="label" style={{ marginBottom: "6px" }}>Master schedule</div>
          <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "22px", fontWeight: 300, fontStyle: "normal", color: T, lineHeight: 1 }}>Posting Calendar</div>
          <p style={{ fontSize: "11px", color: T3, marginTop: "4px" }}>{clients.length} active clients · {activeDays.length} posting days</p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E5E5E5" }}>
                {["Company", ...activeDays, "TZ"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "11px 20px", fontSize: "10px", fontWeight: 400, letterSpacing: "0.1em", textTransform: "uppercase", color: "#999999", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((c, i) => {
                const times = getBestTimes(c);
                return (
                  <tr key={c.id} style={{ borderBottom: i < clients.length - 1 ? "1px solid #E5E5E5" : "none", background: ac.id === c.id ? "#F5F5F5" : "transparent" }}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "#0A0A0A", whiteSpace: "nowrap" }}>{c.name}</span>
                      </div>
                    </td>
                    {activeDays.map(day => {
                      const posts = getPostingDays(c).includes(day);
                      return (
                        <td key={day} style={{ padding: "14px 20px", fontSize: "13px", color: times[day] ? "#0A0A0A" : posts ? "#999999" : "#E5E5E5", fontWeight: times[day] ? 500 : 400, whiteSpace: "nowrap" }}>
                          {times[day] ?? (posts ? "✓" : "-")}
                        </td>
                      );
                    })}
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 400, padding: "3px 8px", borderRadius: "8px", background: `${c.color}18`, border: `1px solid ${c.color}40`, color: c.color, letterSpacing: "0.06em" }}>{c.timezone}</span>
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
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mainView, setMainView] = useState<"report" | "trends">("report");
  // Upload state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<"monthly" | "weekly">("monthly");
  const [uploadStart, setUploadStart] = useState("");
  const [uploadEnd, setUploadEnd] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  // Report interaction
  const [narrativeTab, setNarrativeTab] = useState<"agency" | "client">("agency");
  const [agencyNarrative, setAgencyNarrative] = useState("");
  const [clientNarrative, setClientNarrative] = useState("");
  const [narrativeSaving, setNarrativeSaving] = useState(false);
  const [narrativeDirty, setNarrativeDirty] = useState(false);
  const [sortBy, setSortBy] = useState<string>("impressions");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reanalysing, setReanalysing] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [pollInterval, setPollInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { fetchReports(); }, [ac.id]);

  const selectedReport = reports.find(r => r.id === selectedId) ?? null;
  const extracted: ExtractedData | null = selectedReport?.extracted_data ? JSON.parse(selectedReport.extracted_data) : null;

  useEffect(() => {
    if (selectedReport) {
      setAgencyNarrative(selectedReport.narrative_agency ?? "");
      setClientNarrative(selectedReport.narrative_client ?? "");
      setNarrativeDirty(false);
    }
  }, [selectedReport?.id]);

  // Poll for narrative completion after upload
  useEffect(() => {
    if (pollInterval) clearInterval(pollInterval);
    if (selectedReport && selectedReport.extracted_data && (!selectedReport.narrative_agency || !selectedReport.narrative_client)) {
      const iv = setInterval(async () => {
        const r = await fetch(`/api/reports/${selectedReport.id}`);
        const d = await r.json();
        if (d.report?.narrative_agency) {
          setReports(prev => prev.map(rpt => rpt.id === d.report.id ? d.report : rpt));
          clearInterval(iv);
        }
      }, 3000);
      setPollInterval(iv);
      return () => clearInterval(iv);
    }
  }, [selectedReport?.id, selectedReport?.narrative_agency]);

  const fetchReports = async () => {
    setLoadingReports(true);
    const res = await fetch(`/api/reports?clientId=${ac.id}`);
    const data = await res.json();
    const list: Report[] = data.reports ?? [];
    setReports(list);
    if (list.length > 0) setSelectedId(prev => prev ?? list[0].id);
    setLoadingReports(false);
  };

  const handleUpload = async () => {
    if (!pdfFile || !uploadStart || !uploadEnd) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", pdfFile);
    fd.append("clientId", ac.id);
    fd.append("type", uploadType);
    fd.append("periodStart", uploadStart);
    fd.append("periodEnd", uploadEnd);
    const res = await fetch("/api/reports/upload-pdf", { method: "POST", body: fd });
    const data = await res.json();
    if (data.report) {
      await fetchReports();
      setSelectedId(data.report.id);
      setUploadOpen(false);
      setPdfFile(null);
    }
    setUploading(false);
  };

  const handlePublish = async () => {
    if (!selectedReport) return;
    setPublishing(true);
    const newStatus = selectedReport.status === "published" ? "draft" : "published";
    await fetch(`/api/reports/${selectedReport.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await fetchReports();
    setPublishing(false);
  };

  const handleSaveNarratives = async () => {
    if (!selectedReport) return;
    setNarrativeSaving(true);
    await fetch(`/api/reports/${selectedReport.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ narrative_agency: agencyNarrative, narrative_client: clientNarrative }),
    });
    await fetchReports();
    setNarrativeSaving(false);
    setNarrativeDirty(false);
  };

  const handleReanalyse = async () => {
    if (!selectedReport || reanalysing) return;
    setReanalysing(true);
    await fetch("/api/reports/generate-narrative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: selectedReport.id, force: true }),
    });
    await fetchReports();
    setReanalysing(false);
  };

  const handleExportPdf = async (audience: "agency" | "client") => {
    if (!selectedReport) return;
    setExporting(true);
    setExportMenuOpen(false);
    const res = await fetch(`/api/reports/export-pdf?id=${selectedReport.id}&audience=${audience}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${ac.name.replace(/\s+/g, "-")}-${selectedReport.type}-${selectedReport.period_start.slice(0, 7)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExporting(false);
  };

  const handleDeleteReport = async (id: number) => {
    if (!confirm("Delete this report?")) return;
    await fetch(`/api/reports/${id}`, { method: "DELETE" });
    await fetchReports();
    if (selectedId === id) setSelectedId(null);
  };

  const fmtN = (n: number | null | undefined) => {
    if (n == null) return "—";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };
  const fmtPct = (n: number | null | undefined) => n == null ? "—" : `${Number(n).toFixed(1)}%`;

  const sortedPosts = (() => {
    if (!extracted?.posts) return [];
    return [...extracted.posts].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortBy] as number ?? 0;
      const bv = (b as Record<string, unknown>)[sortBy] as number ?? 0;
      return sortDir === "desc" ? bv - av : av - bv;
    });
  })();

  const engagementPie = extracted ? [
    { name: "Reactions",  value: extracted.reactions ?? 0,        color: GOLD },
    { name: "Comments",   value: extracted.comments ?? 0,         color: "#0A0A0A" },
    { name: "Shares",     value: extracted.shares ?? 0,           color: "#666666" },
    { name: "Clicks",     value: extracted.clicks ?? 0,           color: "#999999" },
  ].filter(d => d.value > 0) : [];

  const impressionsLine = extracted?.posts
    ?.filter(p => p.date && p.impressions != null)
    .map(p => ({ date: p.date!.slice(5), impressions: p.impressions! })) ?? [];

  const postTypeBar = (() => {
    if (!extracted?.posts) return [];
    const c: Record<string, number> = {};
    extracted.posts.forEach(p => { if (p.type) c[p.type] = (c[p.type] ?? 0) + 1; });
    return Object.entries(c).map(([type, count]) => ({ type, count }));
  })();

  // Trends data — needs 3+ monthly reports with extracted data
  const trendReports = reports.filter(r => r.type === "monthly" && r.extracted_data)
    .sort((a, b) => a.period_start.localeCompare(b.period_start));
  const trendData = trendReports.map(r => {
    const d: ExtractedData = JSON.parse(r.extracted_data!);
    return {
      period: r.period_start.slice(0, 7),
      impressions: d.impressions ?? 0,
      engagementRate: d.engagementRate ?? 0,
      followerCount: d.followerCount ?? 0,
    };
  });
  const showTrends = trendData.length >= 3;

  const chartGrid = "#E5E5E5";
  const chartText = "#999999";

  const colStyle = (col: string): React.CSSProperties => ({
    cursor: "pointer", padding: "10px 16px", fontSize: "10px", fontWeight: 400,
    letterSpacing: "0.1em", textTransform: "uppercase", color: sortBy === col ? T : T3,
    userSelect: "none", whiteSpace: "nowrap",
  });

  if (loadingReports) {
    return <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 8 }} />)}
    </div>;
  }

  // ── Upload Panel ──────────────────────────────────────────────────────────
  if (uploadOpen) {
    return (
      <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: 560 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => setUploadOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T3, padding: "4px", display: "flex", alignItems: "center" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "24px", fontWeight: 300, fontStyle: "normal", color: T }}>Upload LinkedIn Report</div>
        </div>

        <div style={glass({ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" })}>
          {/* Type toggle */}
          <div>
            <div className="label" style={{ marginBottom: "8px" }}>Report type</div>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["monthly", "weekly"] as const).map(t => (
                <button key={t} onClick={() => setUploadType(t)} style={{ padding: "8px 18px", borderRadius: "8px", border: `1px solid ${uploadType === t ? GOLD : "#E5E5E5"}`, background: uploadType === t ? `${GOLD}14` : "transparent", color: uploadType === t ? GOLD : T2, fontSize: "13px", fontWeight: 500, cursor: "pointer", textTransform: "capitalize", fontFamily: "inherit" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Period */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <div className="label" style={{ marginBottom: "6px" }}>Period start</div>
              <input type="date" value={uploadStart} onChange={e => setUploadStart(e.target.value)} style={{ ...INPUT, fontSize: "13px" }} />
            </div>
            <div>
              <div className="label" style={{ marginBottom: "6px" }}>Period end</div>
              <input type="date" value={uploadEnd} onChange={e => setUploadEnd(e.target.value)} style={{ ...INPUT, fontSize: "13px" }} />
            </div>
          </div>

          {/* PDF drop zone */}
          <div>
            <div className="label" style={{ marginBottom: "8px" }}>LinkedIn analytics PDF</div>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f?.type === "application/pdf") setPdfFile(f); }}
              onClick={() => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".pdf"; inp.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) setPdfFile(f); }; inp.click(); }}
              style={{ border: `2px dashed ${dragging ? GOLD : "#E5E5E5"}`, borderRadius: "12px", padding: "32px", textAlign: "center", cursor: "pointer", background: dragging ? `${GOLD}08` : "#F5F5F5", transition: "all 0.15s ease" }}
            >
              {pdfFile ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="2" stroke="#E30000" strokeWidth="1.5"/><path d="M5 5h6M5 8h6M5 11h4" stroke="#E30000" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  <span style={{ fontSize: "13px", color: "#E30000", fontWeight: 500 }}>{pdfFile.name}</span>
                  <button onClick={e => { e.stopPropagation(); setPdfFile(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: T3, fontSize: "16px", lineHeight: 1 }}>×</button>
                </div>
              ) : (
                <div>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ marginBottom: "8px", opacity: 0.3 }}><path d="M8 20v4a2 2 0 002 2h12a2 2 0 002-2v-4M16 6v14M10 12l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <div style={{ fontSize: "13px", color: T2 }}>Drop PDF here or click to browse</div>
                  <div style={{ fontSize: "11px", color: T3, marginTop: "4px" }}>LinkedIn analytics export, PDF format</div>
                </div>
              )}
            </div>
          </div>

          <GlassBtn
            variant="primary"
            disabled={!pdfFile || !uploadStart || !uploadEnd || uploading}
            onClick={handleUpload}
            style={{ alignSelf: "flex-start", gap: "8px", opacity: (!pdfFile || !uploadStart || !uploadEnd) ? 0.5 : 1 }}
          >
            {uploading ? <><Spinner /> Analysing…</> : "Upload & Analyse"}
          </GlassBtn>
        </div>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (reports.length === 0) {
    return (
      <div className="fade-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", padding: "80px 40px", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(227,0,0,0.08)", border: "1px solid rgba(227,0,0,0.20)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px" }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M4 22V6a2 2 0 012-2h12l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2z" stroke={GOLD} strokeWidth="1.5"/><path d="M18 4v6h6M9 13h10M9 17h7" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
        <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "24px", fontWeight: 300, fontStyle: "normal", color: T }}>No reports yet for {ac.name}</div>
        <div style={{ fontSize: "13px", color: T2, maxWidth: 360 }}>Upload a LinkedIn analytics PDF to generate AI-powered insights, metrics, and narratives.</div>
        <GlassBtn variant="primary" onClick={() => setUploadOpen(true)} style={{ marginTop: "8px", gap: "8px" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M3 5l4-4 4 4M2 11h10v2H2z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Upload Report
        </GlassBtn>
      </div>
    );
  }

  // ── Main layout: sidebar + content ───────────────────────────────────────
  return (
    <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "20px", alignItems: "start" }}>

      {/* Sidebar: report list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <GlassBtn variant="ghost" onClick={() => setUploadOpen(true)} style={{ width: "100%", justifyContent: "center", gap: "6px", marginBottom: "4px" }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v8M2 5l4-4 4 4M1 10h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Upload New
        </GlassBtn>
        {reports.map(r => {
          const d: ExtractedData | null = r.extracted_data ? JSON.parse(r.extracted_data) : null;
          const isActive = r.id === selectedId;
          return (
            <div
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              style={{ padding: "12px 14px", borderRadius: "8px", border: `1px solid ${isActive ? GOLD : "#E5E5E5"}`, background: isActive ? `${GOLD}08` : "#fff", cursor: "pointer", transition: "all 0.15s", position: "relative" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "9px", fontWeight: 400, letterSpacing: "0.1em", textTransform: "uppercase", color: isActive ? GOLD : T3 }}>{r.type}</span>
                <span style={{ fontSize: "9px", padding: "1px 6px", borderRadius: "100px", background: r.status === "published" ? "rgba(227,0,0,0.10)" : "#E5E5E5", color: r.status === "published" ? "#E30000" : T3, fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase" }}>{r.status}</span>
              </div>
              <div style={{ fontSize: "12px", fontWeight: 500, color: T, marginBottom: "3px" }}>{r.period_start.slice(0, 7)}</div>
              {d?.impressions && <div style={{ fontSize: "11px", color: T3 }}>{fmtN(d.impressions)} impressions</div>}
              <button
                onClick={e => { e.stopPropagation(); handleDeleteReport(r.id); }}
                style={{ position: "absolute", top: "8px", right: "8px", background: "none", border: "none", cursor: "pointer", color: T3, opacity: 0, transition: "opacity 0.15s", padding: "2px", fontSize: "14px", lineHeight: 1 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
              >×</button>
            </div>
          );
        })}
      </div>

      {/* Main content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", minWidth: 0 }}>
        {!selectedReport ? (
          <div style={{ padding: "40px", textAlign: "center", color: T3, fontSize: "13px" }}>Select a report from the list</div>
        ) : (
          <>
            {/* Report header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "9px", fontWeight: 400, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 8px", borderRadius: "100px", background: "#E5E5E5", color: T2 }}>{selectedReport.type}</span>
                  <span style={{ fontSize: "9px", fontWeight: 400, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 8px", borderRadius: "100px", background: selectedReport.status === "published" ? "rgba(227,0,0,0.10)" : "#E5E5E5", color: selectedReport.status === "published" ? "#E30000" : T2 }}>{selectedReport.status}</span>
                </div>
                <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "28px", fontWeight: 300, fontStyle: "normal", color: T, marginBottom: "4px" }}>{ac.name}</div>
                <div style={{ fontSize: "12px", color: T3 }}>{selectedReport.period_start} – {selectedReport.period_end}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                {showTrends && (
                  <div style={{ display: "flex", background: "#F5F5F5", borderRadius: "8px", padding: "3px" }}>
                    {(["report", "trends"] as const).map(v => (
                      <button key={v} onClick={() => setMainView(v)} style={{ padding: "5px 12px", borderRadius: "4px", border: "none", background: mainView === v ? "#fff" : "transparent", color: mainView === v ? T : T3, fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize", boxShadow: mainView === v ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
                        {v}
                      </button>
                    ))}
                  </div>
                )}
                <GlassBtn variant="ghost" onClick={handlePublish} disabled={publishing} style={{ gap: "6px" }}>
                  {publishing ? <Spinner /> : null}
                  {selectedReport.status === "published" ? "Unpublish" : "Publish to Portal"}
                </GlassBtn>
                <GlassBtn variant="ghost" onClick={handleReanalyse} disabled={reanalysing} style={{ gap: "6px" }}>
                  {reanalysing ? <Spinner /> : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10 6a4 4 0 11-1.17-2.83M10 2v3H7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  Re-analyse
                </GlassBtn>
                <div style={{ position: "relative" }}>
                  <GlassBtn variant="ghost" disabled={exporting} onClick={() => setExportMenuOpen(p => !p)} style={{ gap: "6px" }}>
                    {exporting ? <Spinner /> : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 9v2h8V9M6 1v7M4 6l2 2 2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    Export PDF ▾
                  </GlassBtn>
                  {exportMenuOpen && (
                    <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "#fff", border: "1px solid #E5E5E5", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", zIndex: 20, minWidth: 160, overflow: "hidden" }}>
                      {[{ label: "Agency version", v: "agency" }, { label: "Client version", v: "client" }].map(({ label, v }) => (
                        <button key={v} onClick={() => handleExportPdf(v as "agency" | "client")} style={{ display: "block", width: "100%", padding: "10px 16px", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: T, fontFamily: "inherit" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#F5F5F5")}
                          onMouseLeave={e => (e.currentTarget.style.background = "none")}>{label}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── TRENDS VIEW ── */}
            {mainView === "trends" && showTrends && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={glass({ padding: "24px" })}>
                  <div className="label" style={{ marginBottom: "6px" }}>Impressions Over Time</div>
                  <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "18px", fontWeight: 300, fontStyle: "normal", color: T, marginBottom: "16px" }}>{trendData.length} monthly reports</div>
                  {mounted && <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={trendData}>
                      <CartesianGrid stroke={chartGrid} vertical={false} />
                      <XAxis dataKey="period" tick={{ fill: chartText, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: chartText, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v: unknown) => [fmtN(v as number), "Impressions"]} />
                      <Line type="monotone" dataKey="impressions" stroke="#E30000" strokeWidth={2} dot={{ fill: "#E30000", r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={glass({ padding: "24px" })}>
                    <div className="label" style={{ marginBottom: "16px" }}>Engagement Rate %</div>
                    {mounted && <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={trendData}>
                        <defs><linearGradient id="gEngTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E30000" stopOpacity={0.3}/><stop offset="100%" stopColor="#E30000" stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid stroke={chartGrid} vertical={false} />
                        <XAxis dataKey="period" tick={{ fill: chartText, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: chartText, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                        <Tooltip formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, "Engagement"]} />
                        <Area type="monotone" dataKey="engagementRate" stroke="#E30000" fill="url(#gEngTrend)" strokeWidth={1.5} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>}
                  </div>
                  <div style={glass({ padding: "24px" })}>
                    <div className="label" style={{ marginBottom: "16px" }}>Follower Count</div>
                    {mounted && <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={trendData}>
                        <defs><linearGradient id="gFollTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity={0.3}/><stop offset="100%" stopColor={GOLD} stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid stroke={chartGrid} vertical={false} />
                        <XAxis dataKey="period" tick={{ fill: chartText, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: chartText, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtN(v as number)} />
                        <Tooltip formatter={(v: unknown) => [fmtN(v as number), "Followers"]} />
                        <Area type="monotone" dataKey="followerCount" stroke={GOLD} fill="url(#gFollTrend)" strokeWidth={1.5} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>}
                  </div>
                </div>
                {/* MoM deltas */}
                {trendData.length >= 2 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
                    {[
                      { label: "Impressions MoM", cur: trendData[trendData.length-1].impressions, prev: trendData[trendData.length-2].impressions, fmt: fmtN },
                      { label: "Engagement MoM", cur: trendData[trendData.length-1].engagementRate, prev: trendData[trendData.length-2].engagementRate, fmt: (v: number) => fmtPct(v) },
                      { label: "Followers MoM", cur: trendData[trendData.length-1].followerCount, prev: trendData[trendData.length-2].followerCount, fmt: fmtN },
                    ].map(({ label, cur, prev, fmt }) => {
                      const delta = prev > 0 ? ((cur - prev) / prev * 100) : 0;
                      const up = delta >= 0;
                      return (
                        <div key={label} style={glass({ padding: "16px 20px" })}>
                          <div className="label" style={{ marginBottom: "8px" }}>{label}</div>
                          <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "28px", fontWeight: 300, color: T, lineHeight: 1, marginBottom: "4px" }}>{(fmt as (v: number) => string)(cur)}</div>
                          <div style={{ fontSize: "11px", color: up ? "#E30000" : "#CC4422", fontWeight: 400 }}>{up ? "+" : ""}{delta.toFixed(1)}% vs last month</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── REPORT VIEW ── */}
            {mainView === "report" && (
              <>
                {/* KPI cards */}
                {extracted ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
                    {[
                      { label: "Impressions",       value: fmtN(extracted.impressions),            color: GOLD },
                      { label: "Reach",             value: fmtN(extracted.reach),                  color: GOLD },
                      { label: "Engagement Rate",   value: fmtPct(extracted.engagementRate),        color: GOLD },
                      { label: "Total Engagements", value: fmtN(extracted.totalEngagements),        color: GOLD },
                      { label: "Follower Count",    value: fmtN(extracted.followerCount),           color: GOLD },
                      { label: "Follower Growth",   value: extracted.followerGrowth != null ? `${extracted.followerGrowth > 0 ? "+" : ""}${extracted.followerGrowth}` : "—", color: GOLD },
                    ].map(k => (
                      <div key={k.label} style={glass({ padding: "18px 20px 16px", position: "relative", overflow: "hidden" })}>
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: k.color }} />
                        <div className="label" style={{ marginBottom: "10px" }}>{k.label}</div>
                        <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "32px", fontWeight: 400, color: "#0A0A0A", letterSpacing: "-0.02em", lineHeight: 1 }}>{k.value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
                    {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 8 }} />)}
                  </div>
                )}

                {/* Charts */}
                {extracted && (impressionsLine.length > 0 || engagementPie.length > 0) && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    {/* Impressions line */}
                    {impressionsLine.length > 0 && (
                      <div style={glass({ padding: "20px 24px" })}>
                        <div className="label" style={{ marginBottom: "6px" }}>Impressions</div>
                        <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "16px", fontWeight: 300, fontStyle: "normal", color: T, marginBottom: "14px" }}>Per post over period</div>
                        {mounted && <ResponsiveContainer width="100%" height={170}>
                          <LineChart data={impressionsLine}>
                            <CartesianGrid stroke={chartGrid} vertical={false} />
                            <XAxis dataKey="date" tick={{ fill: chartText, fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: chartText, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtN(v as number)} />
                            <Tooltip formatter={(v: unknown) => [fmtN(v as number), "Impressions"]} />
                            <Line type="monotone" dataKey="impressions" stroke="#E30000" strokeWidth={1.5} dot={{ fill: "#E30000", r: 2 }} />
                          </LineChart>
                        </ResponsiveContainer>}
                      </div>
                    )}

                    {/* Engagement pie */}
                    {engagementPie.length > 0 && (
                      <div style={glass({ padding: "20px 24px" })}>
                        <div className="label" style={{ marginBottom: "6px" }}>Engagement Breakdown</div>
                        <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "16px", fontWeight: 300, fontStyle: "normal", color: T, marginBottom: "14px" }}>Reactions, comments, shares, clicks</div>
                        {mounted && <ResponsiveContainer width="100%" height={170}>
                          <PieChart>
                            <Pie data={engagementPie} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                              {engagementPie.map((entry, i) => <Cell key={i} fill={entry.color} fillOpacity={0.8} />)}
                            </Pie>
                            <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: "11px" }} />
                            <Tooltip formatter={(v: unknown) => [fmtN(v as number), ""]} />
                          </PieChart>
                        </ResponsiveContainer>}
                      </div>
                    )}

                    {/* Post type bar */}
                    {postTypeBar.length > 0 && (
                      <div style={glass({ padding: "20px 24px" })}>
                        <div className="label" style={{ marginBottom: "6px" }}>Post Types</div>
                        <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "16px", fontWeight: 300, fontStyle: "normal", color: T, marginBottom: "14px" }}>Count by format</div>
                        {mounted && <ResponsiveContainer width="100%" height={170}>
                          <BarChart data={postTypeBar} barSize={24}>
                            <CartesianGrid stroke={chartGrid} vertical={false} />
                            <XAxis dataKey="type" tick={{ fill: chartText, fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: chartText, fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Bar dataKey="count" fill={GOLD} fillOpacity={0.7} radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>}
                      </div>
                    )}

                    {/* Follower area (if data available) */}
                    {extracted.followerCount != null && (
                      <div style={glass({ padding: "20px 24px" })}>
                        <div className="label" style={{ marginBottom: "6px" }}>Follower Summary</div>
                        <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "16px", fontWeight: 300, fontStyle: "normal", color: T, marginBottom: "20px" }}>End of period</div>
                        <div style={{ display: "flex", gap: "24px", alignItems: "flex-end" }}>
                          <div>
                            <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "48px", fontWeight: 300, color: T, lineHeight: 1, letterSpacing: "-0.02em" }}>{fmtN(extracted.followerCount)}</div>
                            <div style={{ fontSize: "11px", color: T3, marginTop: "4px" }}>Total followers</div>
                          </div>
                          {extracted.followerGrowth != null && (
                            <div>
                              <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "32px", fontWeight: 300, color: "#E30000", lineHeight: 1, letterSpacing: "-0.02em" }}>{extracted.followerGrowth > 0 ? "+" : ""}{extracted.followerGrowth}</div>
                              <div style={{ fontSize: "11px", color: T3, marginTop: "4px" }}>This period</div>
                            </div>
                          )}
                          {extracted.followerGrowthPercent != null && (
                            <div>
                              <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "32px", fontWeight: 300, color: "#E30000", lineHeight: 1 }}>{fmtPct(extracted.followerGrowthPercent)}</div>
                              <div style={{ fontSize: "11px", color: T3, marginTop: "4px" }}>Growth rate</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Posts table */}
                {sortedPosts.length > 0 && (
                  <div style={glass()}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #E5E5E5" }}>
                      <div className="label" style={{ marginBottom: "4px" }}>Post Performance</div>
                      <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "18px", fontWeight: 300, fontStyle: "normal", color: T }}>Sortable by any metric</div>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #E5E5E5" }}>
                          {[
                            { key: "date", label: "Date" },
                            { key: "content", label: "Content" },
                            { key: "impressions", label: "Impressions" },
                            { key: "engagementRate", label: "Eng. Rate" },
                            { key: "reactions", label: "Reactions" },
                            { key: "comments", label: "Comments" },
                            { key: "clicks", label: "Clicks" },
                          ].map(({ key, label }) => (
                            <th key={key} onClick={() => { if (sortBy === key) setSortDir(d => d === "desc" ? "asc" : "desc"); else { setSortBy(key); setSortDir("desc"); } }} style={colStyle(key)}>
                              {label} {sortBy === key ? (sortDir === "desc" ? "↓" : "↑") : ""}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPosts.map((p, i) => {
                          const isTop = extracted?.topPost?.content === p.content;
                          const isExpanded = expandedPost === i;
                          return (
                            <tr key={i} style={{ borderBottom: "1px solid #E5E5E5", borderLeft: isTop ? `3px solid ${GOLD}` : "3px solid transparent", cursor: "pointer", background: isExpanded ? "rgba(227,0,0,0.03)" : "transparent" }} onClick={() => setExpandedPost(isExpanded ? null : i)}>
                              <td style={{ padding: "12px 16px", fontSize: "12px", color: T3, whiteSpace: "nowrap" }}>{p.date ?? "—"}</td>
                              <td style={{ padding: "12px 16px", fontSize: "12px", color: T2, maxWidth: 220 }}>
                                {isExpanded ? p.content : `${(p.content ?? "").slice(0, 80)}${(p.content?.length ?? 0) > 80 ? "…" : ""}`}
                              </td>
                              <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 400, color: T }}>{fmtN(p.impressions)}</td>
                              <td style={{ padding: "12px 16px" }}><span style={{ fontSize: "12px", fontWeight: 400, color: "#E30000" }}>{fmtPct(p.engagementRate)}</span></td>
                              <td style={{ padding: "12px 16px", fontSize: "12px", color: T2 }}>{fmtN(p.reactions)}</td>
                              <td style={{ padding: "12px 16px", fontSize: "12px", color: T2 }}>{fmtN(p.comments)}</td>
                              <td style={{ padding: "12px 16px", fontSize: "12px", color: T2 }}>{fmtN(p.clicks)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {extracted?.topPost && <div style={{ padding: "10px 20px", fontSize: "11px", color: T3, borderTop: "1px solid #E5E5E5" }}>Gold border = top performing post of the period</div>}
                  </div>
                )}

                {/* Narrative section */}
                <div style={glass({ padding: "24px" })}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                    <div>
                      <div className="label" style={{ marginBottom: "4px" }}>Narrative</div>
                      <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "18px", fontWeight: 300, fontStyle: "normal", color: T }}>AI-generated analysis</div>
                    </div>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {(["agency", "client"] as const).map(t => (
                        <button key={t} onClick={() => setNarrativeTab(t)} style={{ padding: "6px 14px", borderRadius: "8px", border: `1px solid ${narrativeTab === t ? GOLD : "#E5E5E5"}`, background: narrativeTab === t ? `${GOLD}14` : "transparent", color: narrativeTab === t ? GOLD : T2, fontSize: "12px", fontWeight: 500, cursor: "pointer", textTransform: "capitalize", fontFamily: "inherit" }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  {!selectedReport.narrative_agency && !selectedReport.narrative_client ? (
                    <div style={{ padding: "24px", textAlign: "center", color: T3, fontSize: "13px", background: "#F5F5F5", borderRadius: "8px" }}>
                      {selectedReport.extracted_data ? "Generating narratives…" : "Upload a PDF to generate narratives"}
                      {selectedReport.extracted_data && <div style={{ marginTop: "8px" }}><Spinner /></div>}
                    </div>
                  ) : (
                    <>
                      <textarea
                        value={narrativeTab === "agency" ? agencyNarrative : clientNarrative}
                        onChange={e => {
                          if (narrativeTab === "agency") setAgencyNarrative(e.target.value);
                          else setClientNarrative(e.target.value);
                          setNarrativeDirty(true);
                        }}
                        rows={10}
                        style={{ ...INPUT, resize: "vertical", lineHeight: 1.75, marginBottom: "12px" }}
                        placeholder={narrativeTab === "agency" ? "Agency analysis will appear here…" : "Client summary will appear here…"}
                      />
                      {narrativeDirty && (
                        <GlassBtn variant="primary" onClick={handleSaveNarratives} disabled={narrativeSaving} style={{ gap: "6px" }}>
                          {narrativeSaving ? <><Spinner /> Saving…</> : "Save Changes"}
                        </GlassBtn>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}
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
  const panelBg  = "#E5E5E5";

  return (
    <div style={{ marginBottom: "24px" }}>
      <label style={{ display: "block", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "7px" }}>
        Company Logo — Background Removal
      </label>

      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* File picker */}
        <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "#F5F5F5", border: "1px solid #E5E5E5", borderRadius: "8px", fontSize: "12px", color: T3, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap", letterSpacing: "0.04em" }}>
          {logo.file ? logo.file.name : currentLogoSrc ? "Replace logo…" : "Choose file…"}
          <input id={inputId} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        </label>

        {/* Processing spinner */}
        {logo.processing && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 14px", background: "rgba(227,0,0,0.06)", border: "1px solid rgba(227,0,0,0.18)", borderRadius: "8px", fontSize: "12px", color: GOLD }}>
            <Spinner /> Removing background…
          </div>
        )}

        {/* Before / After previews */}
        {(rawSrc || origSrc || dispSrc || currentLogoSrc) && !logo.processing && (
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>

            {/* Before */}
            {rawSrc && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "10px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "5px" }}>Original</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={rawSrc} alt="original" style={{ height: "60px", maxWidth: "140px", objectFit: "contain", background: panelBg, borderRadius: "8px", padding: "6px", border: "1px solid #E5E5E5" }} />
              </div>
            )}

            {/* Current logo (edit mode, no new upload yet) */}
            {!rawSrc && currentLogoSrc && !origSrc && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "10px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "5px" }}>Current</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentLogoSrc} alt="current" style={{ height: "60px", maxWidth: "140px", objectFit: "contain", background: panelBg, borderRadius: "8px", padding: "6px", border: "1px solid #E5E5E5" }} />
              </div>
            )}

            {/* After bg removal (original transparent) */}
            {origSrc && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "10px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "5px" }}>
                  Transparent
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={origSrc} alt="transparent" style={{ height: "60px", maxWidth: "140px", objectFit: "contain", background: "repeating-conic-gradient(rgba(255,255,255,0.05) 0% 25%, transparent 0% 50%) 0 0 / 10px 10px", borderRadius: "8px", padding: "6px", border: "1px solid #E5E5E5" }} />
                {logo.brightness !== null && (
                  <div style={{ fontSize: "10px", color: "#999999", marginTop: "3px" }}>
                    Brightness: {Math.round(logo.brightness)}
                  </div>
                )}
              </div>
            )}

            {/* Display version (what will be saved & shown) */}
            {dispSrc && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(227,0,0,0.6)", marginBottom: "5px" }}>
                  Display {logo.inverted ? "(inverted)" : "(original)"}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={dispSrc} alt="display" style={{ height: "60px", maxWidth: "140px", objectFit: "contain", background: "#F5F5F5", borderRadius: "8px", padding: "6px", border: "1px solid rgba(227,0,0,0.20)" }} />
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
                    background: logo.inverted ? "rgba(227,0,0,0.10)" : "transparent",
                    border: logo.inverted ? "1px solid rgba(227,0,0,0.25)" : "1px solid #E5E5E5",
                    borderRadius: "8px",
                    fontSize: "12px", fontWeight: 500,
                    color: logo.inverted ? "#E30000" : T3,
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease",
                  }}
                >
                  {/* Toggle switch visual */}
                  <span style={{ width: "28px", height: "16px", borderRadius: "8px", background: logo.inverted ? "#E30000" : "#E5E5E5", display: "inline-block", position: "relative", flexShrink: 0, transition: "background 0.2s ease" }}>
                    <span style={{ position: "absolute", top: "2px", left: logo.inverted ? "14px" : "2px", width: "12px", height: "12px", borderRadius: "50%", background: "#fff", transition: "left 0.2s ease" }} />
                  </span>
                  Invert for dark background
                </button>
                {logo.inverted && logo.brightness !== null && logo.brightness < 128 && (
                  <div style={{ fontSize: "10px", color: "rgba(227,0,0,0.5)", marginTop: "4px", textAlign: "center" }}>Auto-detected dark logo</div>
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
          <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "32px", fontWeight: 300, fontStyle: "normal", color: T, lineHeight: 1 }}>Clients</div>
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
          }} style={{ ...glass({ padding: "24px", position: "relative", overflow: "hidden" }), cursor: "pointer", transition: "all 0.15s ease" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: GOLD }} />
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: c.color, flexShrink: 0 }} />
              <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "18px", fontWeight: 400, color: "#0A0A0A", letterSpacing: "-0.01em" }}>{c.name}</div>
            </div>
            <div style={{ fontSize: "13px", color: "#666666", marginBottom: "12px", fontFamily: "Helvetica, Arial, sans-serif" }}>{c.tagline}</div>
            <div style={{ fontSize: "11px", color: "#999999", marginBottom: "12px", letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "Helvetica, Arial, sans-serif" }}>{c.timezone}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {(Array.isArray(c.pillars) ? c.pillars : []).slice(0, 4).map((p: Record<string, unknown>, i: number) => (
                <span key={i} style={{ fontSize: "9px", padding: "2px 8px", background: "#F5F5F5", border: "1px solid #E5E5E5", color: T3, borderRadius: "4px", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
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
              <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "22px", fontWeight: 300, fontStyle: "normal", color: T }}>
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
                <label style={{ display: "block", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "7px" }}>{f.label}</label>
                <input type="text" value={editForm[f.key] as string}
                  onChange={e => setEditForm(p => ({ ...p!, [f.key]: e.target.value }))}
                  style={{ ...INPUT, padding: "10px 13px", fontSize: "13px" }}
                  onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                  onBlur={e => e.target.style.borderColor = "#E5E5E5"}
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
                <label style={{ display: "block", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "7px" }}>{f.label}</label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input type="color" value={editForm[f.key] as string}
                    onChange={e => setEditForm(p => ({ ...p!, [f.key]: e.target.value }))}
                    style={{ width: "36px", height: "36px", borderRadius: "8px", border: "1px solid #E5E5E5", cursor: "pointer" }}
                  />
                  <input type="text" value={editForm[f.key] as string}
                    onChange={e => setEditForm(p => ({ ...p!, [f.key]: e.target.value }))}
                    style={{ ...INPUT, padding: "8px 10px", fontSize: "12px" }}
                    onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                    onBlur={e => e.target.style.borderColor = "#E5E5E5"}
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
                <label style={{ display: "block", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "7px" }}>{f.label}</label>
                <textarea value={editForm[f.key] as string}
                  onChange={e => setEditForm(p => ({ ...p!, [f.key]: e.target.value }))}
                  placeholder={(f as Record<string, string>).placeholder}
                  rows={3}
                  style={{ ...INPUT, resize: "none", fontSize: "13px" }}
                  onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                  onBlur={e => e.target.style.borderColor = "#E5E5E5"}
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
                <label style={{ display: "block", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "7px" }}>{f.label}</label>
                <input type="text" value={editForm[f.key] as string}
                  onChange={e => setEditForm(p => ({ ...p!, [f.key]: e.target.value }))}
                  placeholder={(f as Record<string, string>).placeholder}
                  style={{ ...INPUT, padding: "10px 13px", fontSize: "13px" }}
                  onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                  onBlur={e => e.target.style.borderColor = "#E5E5E5"}
                />
              </div>
            ))}
          </div>

          <div style={glassElevated({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px", padding: "16px", border: "1px solid rgba(227,0,0,0.10)" })}>
            <div style={{ gridColumn: "1/-1", fontSize: "10px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(227,0,0,0.6)", marginBottom: "4px" }}>
              Visual generation fonts — used in SVG image creation
            </div>
            {[
              { label: "Headline font (visuals)", key: "headline_font", placeholder: "Google Font name, e.g. Inter" },
              { label: "Body font (visuals)",     key: "body_font",     placeholder: "Google Font name, e.g. DM Sans" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "7px" }}>{f.label}</label>
                <input type="text" value={editForm[f.key] as string}
                  onChange={e => setEditForm(p => ({ ...p!, [f.key]: e.target.value }))}
                  placeholder={(f as Record<string, string>).placeholder}
                  style={{ ...INPUT, padding: "10px 13px", fontSize: "13px" }}
                  onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.25)"}
                  onBlur={e => e.target.style.borderColor = "#E5E5E5"}
                />
              </div>
            ))}
          </div>

          {/* Brand Prompt */}
          <div style={glassElevated({ padding: "20px", marginBottom: "20px", border: "1px solid rgba(227,0,0,0.12)" })}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(227,0,0,0.6)", marginBottom: "2px" }}>
                  AI Image Brand Prompt
                </div>
                <div style={{ fontSize: "11px", color: T3 }}>Prepended to every Ideogram / Flux generation request</div>
              </div>
              <GlassBtn
                onClick={generateBrandPromptForEdit}
                disabled={isGenEditBrandPrompt}
                style={{ background: "rgba(227,0,0,0.08)", border: "1px solid rgba(227,0,0,0.25)", color: GOLD }}
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
              onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
              onBlur={e => e.target.style.borderColor = "#E5E5E5"}
            />
          </div>

          {/* Invert logo toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#F5F5F5", border: "1px solid #E5E5E5", borderRadius: "8px", marginBottom: "20px" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 400, color: T2, marginBottom: "2px" }}>Invert logo for dark backgrounds</div>
              <div style={{ fontSize: "11px", color: T3 }}>Applies brightness(0) invert(1) filter on generated image overlays</div>
            </div>
            <button onClick={() => setEditForm(f => ({ ...f!, invert_logo: !f!.invert_logo }))}
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", background: editForm.invert_logo ? "rgba(227,0,0,0.10)" : "transparent", border: editForm.invert_logo ? "1px solid rgba(227,0,0,0.25)" : "1px solid #E5E5E5", borderRadius: "8px", color: editForm.invert_logo ? "#E30000" : T3, cursor: "pointer", fontFamily: "inherit", fontSize: "11px", fontWeight: 500, transition: "all 0.15s ease" }}>
              <span style={{ width: "28px", height: "16px", borderRadius: "8px", background: editForm.invert_logo ? "#E30000" : "#E5E5E5", display: "inline-block", position: "relative", flexShrink: 0, transition: "background 0.2s ease" }}>
                <span style={{ position: "absolute", top: "2px", left: editForm.invert_logo ? "14px" : "2px", width: "12px", height: "12px", borderRadius: "50%", background: "#fff", transition: "left 0.2s ease" }} />
              </span>
              {editForm.invert_logo ? "On" : "Off"}
            </button>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "7px" }}>Key brand phrases</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {(editForm.key_phrases as string[]).map((p, i) => (
                <div key={i} style={{ display: "flex", gap: "8px" }}>
                  <input type="text" value={p}
                    onChange={e => setEditForm(f => ({ ...f!, key_phrases: (f!.key_phrases as string[]).map((x, idx) => idx === i ? e.target.value : x) }))}
                    style={{ ...INPUT, padding: "9px 12px", fontSize: "13px" }}
                    onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                    onBlur={e => e.target.style.borderColor = "#E5E5E5"}
                  />
                  {i === (editForm.key_phrases as string[]).length - 1 && (
                    <button onClick={() => setEditForm(f => ({ ...f!, key_phrases: [...(f!.key_phrases as string[]), ""] }))}
                      style={{ padding: "9px 16px", background: "#F5F5F5", border: "1px solid #E5E5E5", borderRadius: "8px", color: T3, cursor: "pointer", fontFamily: "inherit", fontSize: "13px" }}>
                      +
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "28px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "7px" }}>Badges / tags</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {(editForm.badges as string[]).map((b, i) => (
                <input key={i} type="text" value={b}
                  onChange={e => setEditForm(f => ({ ...f!, badges: (f!.badges as string[]).map((x, idx) => idx === i ? e.target.value : x) }))}
                  style={{ ...INPUT, width: "140px", padding: "7px 10px", fontSize: "12px" }}
                  onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                  onBlur={e => e.target.style.borderColor = "#E5E5E5"}
                />
              ))}
              <button onClick={() => setEditForm(f => ({ ...f!, badges: [...(f!.badges as string[]), ""] }))}
                style={{ padding: "7px 14px", background: "#F5F5F5", border: "1px solid #E5E5E5", borderRadius: "8px", color: T3, cursor: "pointer", fontFamily: "inherit", fontSize: "12px" }}>
                +
              </button>
            </div>
          </div>

          {/* LinkedIn connection */}
          <div style={{ marginBottom: "24px", padding: "16px 20px", background: "rgba(10,102,194,0.04)", border: "1px solid rgba(10,102,194,0.15)", borderRadius: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#0A66C2", marginBottom: "4px" }}>LinkedIn Account</div>
                {(selectedClient as Record<string,unknown>).linkedin_urn ? (
                  <div style={{ fontSize: "12px", color: T2 }}>
                    Connected as <strong>{(selectedClient as Record<string,unknown>).linkedin_name as string || "LinkedIn user"}</strong>
                  </div>
                ) : (
                  <div style={{ fontSize: "12px", color: T3 }}>Not connected — posts will need to be published manually</div>
                )}
              </div>
              <a href={`/api/auth/linkedin?client_id=${selectedClient.id}`}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "#0A66C2", color: "#fff", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 400, textDecoration: "none", letterSpacing: "0.04em", transition: "opacity 0.15s ease" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                {(selectedClient as Record<string,unknown>).linkedin_urn ? "Reconnect" : "Connect LinkedIn"}
              </a>
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
            <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "22px", fontWeight: 300, fontStyle: "normal", color: T }}>New Client</div>
          </div>

{/* URL extractor */}
<div style={glassElevated({ padding: "20px", marginBottom: "24px", border: "1px solid rgba(227,0,0,0.12)" })}>
  <div style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(227,0,0,0.6)", marginBottom: "8px" }}>
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
      onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
      onBlur={e => e.target.style.borderColor = "#E5E5E5"}
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
                <label style={{ display: "block", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "7px" }}>{f.label}</label>
                <input type="text"
                  value={(form as Record<string, unknown>)[f.key] as string}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ ...INPUT, padding: "10px 13px", fontSize: "13px" }}
                  onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                  onBlur={e => e.target.style.borderColor = "#E5E5E5"}
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
                <label style={{ display: "block", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "7px" }}>{f.label}</label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input type="color"
                    value={(form as Record<string, unknown>)[f.key] as string}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ width: "36px", height: "36px", borderRadius: "8px", border: "1px solid #E5E5E5", cursor: "pointer" }}
                  />
                  <input type="text"
                    value={(form as Record<string, unknown>)[f.key] as string}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ ...INPUT, padding: "8px 10px", fontSize: "12px" }}
                    onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                    onBlur={e => e.target.style.borderColor = "#E5E5E5"}
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
                <label style={{ display: "block", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "7px" }}>{f.label}</label>
                <textarea
                  value={(form as Record<string, unknown>)[f.key] as string}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  rows={3}
                  style={{ ...INPUT, resize: "none", fontSize: "13px" }}
                  onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                  onBlur={e => e.target.style.borderColor = "#E5E5E5"}
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
                <label style={{ display: "block", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "7px" }}>{f.label}</label>
                <input type="text"
                  value={(form as Record<string, unknown>)[f.key] as string}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ ...INPUT, padding: "10px 13px", fontSize: "13px" }}
                  onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                  onBlur={e => e.target.style.borderColor = "#E5E5E5"}
                />
              </div>
            ))}
          </div>

          <div style={glassElevated({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px", padding: "16px", border: "1px solid rgba(227,0,0,0.10)" })}>
            <div style={{ gridColumn: "1/-1", fontSize: "10px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(227,0,0,0.6)", marginBottom: "4px" }}>
              Visual generation fonts — used in SVG image creation
            </div>
            {[
              { label: "Headline font (visuals)", key: "headline_font", placeholder: "Google Font name, e.g. Inter" },
              { label: "Body font (visuals)",     key: "body_font",     placeholder: "Google Font name, e.g. DM Sans" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "7px" }}>{f.label}</label>
                <input type="text"
                  value={(form as Record<string, unknown>)[f.key] as string}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ ...INPUT, padding: "10px 13px", fontSize: "13px" }}
                  onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.25)"}
                  onBlur={e => e.target.style.borderColor = "#E5E5E5"}
                />
              </div>
            ))}
          </div>

          {/* Brand Prompt */}
          <div style={glassElevated({ padding: "20px", marginBottom: "20px", border: "1px solid rgba(227,0,0,0.15)" })}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(227,0,0,0.7)", marginBottom: "2px" }}>
                  AI Image Brand Prompt
                </div>
                <div style={{ fontSize: "11px", color: "#999999" }}>Prepended to every Ideogram / Flux generation request</div>
              </div>
              <GlassBtn
                onClick={generateBrandPromptForNew}
                disabled={isGenBrandPrompt}
                style={{ background: "rgba(227,0,0,0.08)", border: "1px solid rgba(227,0,0,0.25)", color: GOLD }}
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
              onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.45)"}
              onBlur={e => e.target.style.borderColor = "#E5E5E5"}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "7px" }}>Key brand phrases</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {form.key_phrases.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: "8px" }}>
                  <input type="text" value={p}
                    onChange={e => updatePhrase(i, e.target.value)}
                    placeholder={`Phrase ${i + 1}`}
                    style={{ ...INPUT, padding: "9px 12px", fontSize: "13px" }}
                    onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                    onBlur={e => e.target.style.borderColor = "#E5E5E5"}
                  />
                  {i === form.key_phrases.length - 1 && (
                    <button onClick={() => setForm(f => ({ ...f, key_phrases: [...f.key_phrases, ""] }))}
                      style={{ padding: "9px 16px", background: "#F5F5F5", border: "1px solid #E5E5E5", borderRadius: "8px", color: T3, cursor: "pointer", fontFamily: "inherit", fontSize: "13px" }}>
                      +
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "7px" }}>Badges / tags</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {form.badges.map((b, i) => (
                <input key={i} type="text" value={b}
                  onChange={e => updateBadge(i, e.target.value)}
                  placeholder="Tag"
                  style={{ ...INPUT, width: "140px", padding: "7px 10px", fontSize: "12px" }}
                  onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                  onBlur={e => e.target.style.borderColor = "#E5E5E5"}
                />
              ))}
              <button onClick={() => setForm(f => ({ ...f, badges: [...f.badges, ""] }))}
                style={{ padding: "7px 14px", background: "#F5F5F5", border: "1px solid #E5E5E5", borderRadius: "8px", color: T3, cursor: "pointer", fontFamily: "inherit", fontSize: "12px" }}>
                +
              </button>
            </div>
          </div>

          <div style={{ marginBottom: "28px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "12px" }}>Content pillars</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {form.pillars.map((p, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 140px 1fr", gap: "8px", alignItems: "center" }}>
                  <div style={{ fontSize: "12px", fontWeight: 400, color: "#999999", padding: "9px 0" }}>{p.day}</div>
                  <input type="text" value={p.type}
                    onChange={e => updatePillar(i, "type", e.target.value)}
                    placeholder="Post type"
                    style={{ ...INPUT, padding: "9px 12px", fontSize: "13px" }}
                    onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                    onBlur={e => e.target.style.borderColor = "#E5E5E5"}
                  />
                  <input type="text" value={p.example}
                    onChange={e => updatePillar(i, "example", e.target.value)}
                    placeholder="Content direction / example topic"
                    style={{ ...INPUT, padding: "9px 12px", fontSize: "13px" }}
                    onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                    onBlur={e => e.target.style.borderColor = "#E5E5E5"}
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
          <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "32px", fontWeight: 300, fontStyle: "normal", color: T, lineHeight: 1 }}>Invoices</div>
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
              <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "20px", fontWeight: 300, fontStyle: "normal", color: T }}>Invoice</div>
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
                <label style={{ display: "block", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "7px" }}>{f.label}</label>
                <input
                  type={f.type}
                  value={(form as Record<string, unknown>)[f.key] as string}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value }))}
                  style={{ ...INPUT, padding: "10px 13px", fontSize: "13px" }}
                  onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                  onBlur={e => e.target.style.borderColor = "#E5E5E5"}
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
                    onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                    onBlur={e => e.target.style.borderColor = "#E5E5E5"}
                  />
                  <input
                    type="number" value={item.qty}
                    onChange={e => updateItem(i, "qty", Number(e.target.value))}
                    placeholder="Qty"
                    style={{ ...INPUT, padding: "9px 12px", fontSize: "13px", textAlign: "center" }}
                    onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                    onBlur={e => e.target.style.borderColor = "#E5E5E5"}
                  />
                  <input
                    type="number" value={item.rate}
                    onChange={e => updateItem(i, "rate", Number(e.target.value))}
                    placeholder="Rate ($)"
                    style={{ ...INPUT, padding: "9px 12px", fontSize: "13px" }}
                    onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
                    onBlur={e => e.target.style.borderColor = "#E5E5E5"}
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
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #E5E5E5", fontSize: "13px", color: "#666666" }}>
                <span>Subtotal</span><span>${formTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
              {form.tax_rate > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #E5E5E5", fontSize: "13px", color: "#666666" }}>
                  <span>Tax ({form.tax_rate}%)</span><span>${formTax.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", fontFamily: "var(--font-raleway), sans-serif", fontSize: "20px", fontWeight: 300, color: T }}>
                <span>Total</span><span>${(formTotal + formTax).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "7px" }}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Payment terms, notes to client…"
              style={{ ...INPUT, resize: "none", fontSize: "13px" }}
              onFocus={e => e.target.style.borderColor = "rgba(227,0,0,0.35)"}
              onBlur={e => e.target.style.borderColor = "#E5E5E5"}
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
          <p style={{ fontSize: "14px", color: T3, fontFamily: "var(--font-raleway), sans-serif", fontStyle: "normal" }}>No invoices yet. Create your first one above.</p>
        </div>
      ) : (
        <div style={glass()}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #E5E5E5" }}>
                  {["Invoice #","Client","Date","Due","Amount","Status","Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "12px 20px", fontSize: "10px", fontWeight: 400, letterSpacing: "0.1em", textTransform: "uppercase", color: "#999999", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv.id} style={{ borderBottom: i < invoices.length - 1 ? "1px solid #E5E5E5" : "none" }}>
                    <td style={{ padding: "14px 20px", fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em", color: T2 }}>{inv.number}</td>
                    <td style={{ padding: "14px 20px", fontSize: "13px", color: T }}>{inv.client_name}</td>
                    <td style={{ padding: "14px 20px", fontSize: "11px", color: T3 }}>{inv.date}</td>
                    <td style={{ padding: "14px 20px", fontSize: "11px", color: inv.status === "overdue" ? "#d07070" : T3 }}>{inv.due_date}</td>
                    <td style={{ padding: "14px 20px", fontFamily: "var(--font-raleway), sans-serif", fontSize: "16px", fontWeight: 400, color: "#0A0A0A" }}>
                      ${total(inv).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "14px 20px" }}><StatusBadge status={inv.status} /></td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {inv.status === "pending"  && <button onClick={() => updateStatus(inv.id, "paid")}    style={{ fontSize: "10px", color: "#E30000", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase" }}>Mark paid</button>}
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
    <div style={{ minHeight: "100vh", background: "#F5F5F5", color: "#1A1A1A", fontFamily: "Helvetica, Arial, sans-serif", overflowX: "hidden" }}>

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
        <img src="/linkwright-logo-white.png" alt="Linkwright" style={{ height: "26px", width: "auto", objectFit: "contain", filter: "brightness(0)" }} />

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
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "#1A1A1A"; el.style.color = "#F5F5F5"; }}
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
            textTransform: "uppercase", color: "#999999",
            marginBottom: "36px",
          }}>
            <div style={{ width: "28px", height: "0.5px", background: "rgba(26,26,26,0.35)" }} />
            LinkedIn Growth Agency
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: "var(--font-raleway), sans-serif",
            fontSize: "clamp(52px, 6vw, 84px)", fontWeight: 300,
            lineHeight: 1.05, letterSpacing: "-0.02em", color: "#1A1A1A",
            marginBottom: "32px",
          }}>
            Build influence.<br/>
            <em style={{ fontStyle: "normal", color: "rgba(26,26,26,0.50)" }}>Generate pipeline.</em><br/>
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
                fontFamily: "Helvetica, Arial, sans-serif",
                fontSize: "12px", fontWeight: 500, letterSpacing: "0.12em",
                textTransform: "uppercase",
                background: hoverClient ? "rgba(26,26,26,0.85)" : "#1A1A1A",
                color: "#F5F5F5", padding: "14px 36px",
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
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, #E30000 0%, transparent 100%)" }} />

          {/* Bottom caption */}
          <div style={{ padding: "48px 40px", position: "relative", zIndex: 1 }}>
            <div style={{ width: "1px", height: "40px", background: "rgba(244,241,236,0.20)", marginBottom: "20px" }} />
            <p style={{
              fontFamily: "var(--font-raleway), sans-serif",
              fontSize: "20px", fontWeight: 300, fontStyle: "normal",
              color: "rgba(244,241,236,0.70)", lineHeight: 1.5, maxWidth: "320px",
            }}>
              "Your LinkedIn profile is your most valuable real estate in professional media."
            </p>
            <div style={{ marginTop: "24px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/linkwright-logo-white.png" alt="Linkwright" style={{ height: "20px", objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.35 }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee strip ── */}
      <div style={{
        background: "#1A1814", color: "#F5F5F5",
        padding: "18px 0", overflow: "hidden",
        borderTop: "0.5px solid rgba(26,26,26,0.20)",
      }}>
        <div className="marquee-track" style={{ display: "flex", gap: "60px", whiteSpace: "nowrap" }}>
          {taglineItems.map((t, i) => (
            <span key={i} style={{
              fontFamily: "var(--font-raleway), sans-serif",
              fontSize: "17px", fontWeight: 300, fontStyle: "normal",
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
          fontFamily: "var(--font-raleway), sans-serif",
          fontSize: "clamp(36px, 4vw, 56px)", fontWeight: 300,
          lineHeight: 1.1, letterSpacing: "-0.02em", color: "#1A1A1A",
          maxWidth: "700px", marginBottom: "64px",
        }}>
          Everything you need to own LinkedIn in your category.
        </h2>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1px", background: "#E5E5E5",
          border: "0.5px solid #E5E5E5",
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
          fontFamily: "var(--font-raleway), sans-serif",
          fontSize: "clamp(36px, 5vw, 68px)", fontWeight: 300, fontStyle: "normal",
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
                fontFamily: "var(--font-raleway), sans-serif",
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
            fontFamily: "var(--font-raleway), sans-serif",
            fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 300,
            lineHeight: 1.1, letterSpacing: "-0.02em", color: "#1A1A1A",
            marginBottom: "24px",
          }}>
            Two ways<br/><em style={{ fontStyle: "normal", color: "rgba(26,26,26,0.50)" }}>into the platform.</em>
          </h2>
          <p style={{ fontSize: "15px", fontWeight: 300, lineHeight: 1.8, color: "rgba(26,26,26,0.55)", maxWidth: "400px" }}>
            Clients review and approve content through the dedicated portal. Our internal team manages production in the studio.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Client card */}
          <a href="/portal/login" style={{
            display: "block", padding: "36px 40px",
            background: "#FFFFFF", border: "0.5px solid #E5E5E5",
            textDecoration: "none", color: "inherit",
            transition: "border-color 0.25s, box-shadow 0.25s",
          }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(26,26,26,0.30)"; el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "#E5E5E5"; el.style.boxShadow = "none"; }}
          >
            <div style={{ fontSize: "10px", fontWeight: 400, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(26,26,26,0.35)", marginBottom: "12px" }}>01</div>
            <div style={{
              fontFamily: "var(--font-raleway), sans-serif",
              fontSize: "24px", fontWeight: 400, color: "#1A1A1A", marginBottom: "8px",
            }}>Client Portal</div>
            <p style={{ fontSize: "14px", fontWeight: 300, color: "rgba(26,26,26,0.55)", lineHeight: 1.6, marginBottom: "20px" }}>
              Review drafts, approve content, and track your LinkedIn performance.
            </p>
            <span style={{ fontSize: "12px", fontWeight: 500, color: "#E30000", letterSpacing: "0.06em" }}>Access portal →</span>
          </a>

          {/* Team card */}
          <a href="/login" style={{
            display: "block", padding: "36px 40px",
            background: "#F5F5F5", border: "0.5px solid #E5E5E5",
            textDecoration: "none", color: "inherit",
            transition: "border-color 0.25s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,26,26,0.25)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#E5E5E5"; }}
          >
            <div style={{ fontSize: "10px", fontWeight: 400, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(26,26,26,0.35)", marginBottom: "12px" }}>02</div>
            <div style={{
              fontFamily: "var(--font-raleway), sans-serif",
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
      <footer style={{ background: "#1A1814", color: "#F5F5F5", padding: "64px 48px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "48px", marginBottom: "48px" }}>
          <div>
            <div style={{ marginBottom: "20px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/linkwright-logo-white.png" alt="Linkwright" style={{ height: "32px", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
            </div>
            <p style={{
              fontFamily: "var(--font-raleway), sans-serif",
              fontSize: "17px", fontWeight: 300, fontStyle: "normal",
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
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F5F5F5"; }}
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
        background: hover ? "#1A1814" : "#F5F5F5",
        padding: "48px 40px", position: "relative", overflow: "hidden",
        cursor: "default", transition: "background 0.3s",
      }}
    >
      <span style={{ display: "block", fontFamily: "var(--font-raleway), sans-serif", fontSize: "13px", color: hover ? "rgba(244,241,236,0.35)" : "rgba(26,26,26,0.30)", marginBottom: "48px", transition: "color 0.3s" }}>{num}</span>
      <h3 style={{
        fontFamily: "var(--font-raleway), sans-serif",
        fontSize: "24px", fontWeight: 400, color: hover ? "#F5F5F5" : "#1A1A1A",
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

// ── Client Users Tab ──────────────────────────────────────────────────────────
function ClientUsersTab({ clients, notify, onCompanyAdded }: {
  clients: Company[];
  notify: (m: string, t?: "default" | "success" | "error") => void;
  onCompanyAdded: () => void;
}) {
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [threadMessages, setThreadMessages] = useState<ClientMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [submittingUser, setSubmittingUser] = useState(false);
  const [submittingCompany, setSubmittingCompany] = useState(false);

  const emptyUserForm = {
    first_name: "", last_name: "", email: "", job_title: "",
    phone: "", role: "user", company_id: "", notes: "",
  };
  const [userForm, setUserForm] = useState({ ...emptyUserForm });

  const emptyCompanyForm = {
    company_name: "", first_name: "", last_name: "",
    email: "", job_title: "", phone: "", notes: "",
  };
  const [companyForm, setCompanyForm] = useState({ ...emptyCompanyForm });

  const fetchUsers = useCallback(async () => {
    try {
      const r = await fetch("/api/client-users");
      const d = await r.json();
      setUsers(d.users || []);
    } catch { /* ignore */ }
  }, []);

  const fetchThreads = useCallback(async () => {
    try {
      const r = await fetch("/api/client-messages");
      const d = await r.json();
      setThreads(d.threads || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchUsers(); fetchThreads(); }, [fetchUsers, fetchThreads]);

  // Poll threads while this tab is mounted (tab is only mounted when active).
  useEffect(() => {
    const iv = setInterval(() => { fetchThreads(); }, 15000);
    return () => clearInterval(iv);
  }, [fetchThreads]);

  const openThread = useCallback(async (userId: number) => {
    setActiveThreadId(userId);
    try {
      const r = await fetch(`/api/client-messages?userId=${userId}&markRead=1`);
      const d = await r.json();
      setThreadMessages(d.messages || []);
      // Refresh threads so the unread badge clears after marking read.
      fetchThreads();
    } catch { setThreadMessages([]); }
  }, [fetchThreads]);

  // Per-company role counts among active users.
  const companyRoleCounts: Record<string, Record<string, number>> = {};
  for (const u of users) {
    if (!u.active) continue;
    companyRoleCounts[u.company_id] = companyRoleCounts[u.company_id] || {};
    companyRoleCounts[u.company_id][u.role] = (companyRoleCounts[u.company_id][u.role] || 0) + 1;
  }
  const roleDisabled = (role: string): boolean => {
    if (!userForm.company_id) return false;
    const used = companyRoleCounts[userForm.company_id]?.[role] || 0;
    return used >= (ROLE_LIMITS[role] ?? Infinity);
  };

  const submitUser = async () => {
    if (!userForm.first_name.trim() || !userForm.last_name.trim() || !userForm.email.trim()) {
      notify("First name, last name and email are required", "error"); return;
    }
    if (!userForm.company_id) { notify("Please select a company", "error"); return; }
    setSubmittingUser(true);
    try {
      const r = await fetch("/api/client-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: userForm.first_name, last_name: userForm.last_name,
          email: userForm.email, job_title: userForm.job_title, phone: userForm.phone,
          role: userForm.role, company_id: userForm.company_id, notes: userForm.notes,
        }),
      });
      const d = await r.json();
      if (!r.ok) { notify(d.error || "Failed to add user", "error"); setSubmittingUser(false); return; }
      if (d.emailSent === false) notify(`User added, but welcome email failed. ${d.emailError || ""}`, "error");
      else notify("User added and welcome email sent", "success");
      setUserForm({ ...emptyUserForm });
      fetchUsers();
    } catch { notify("Error adding user", "error"); }
    setSubmittingUser(false);
  };

  const submitCompany = async () => {
    if (!companyForm.company_name.trim()) { notify("Company name is required", "error"); return; }
    if (!companyForm.first_name.trim() || !companyForm.last_name.trim() || !companyForm.email.trim()) {
      notify("Owner first name, last name and email are required", "error"); return;
    }
    setSubmittingCompany(true);
    try {
      const r = await fetch("/api/client-users/create-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: { name: companyForm.company_name },
          owner: {
            first_name: companyForm.first_name, last_name: companyForm.last_name,
            email: companyForm.email, job_title: companyForm.job_title,
            phone: companyForm.phone, notes: companyForm.notes,
          },
        }),
      });
      const d = await r.json();
      if (!r.ok) { notify(d.error || "Failed to create company", "error"); setSubmittingCompany(false); return; }
      if (d.emailSent === false) notify(`Company created, but welcome email failed. ${d.emailError || ""}`, "error");
      else notify(`Company ${d.companyName || companyForm.company_name} created with owner`, "success");
      setCompanyForm({ ...emptyCompanyForm });
      fetchUsers();
      onCompanyAdded();
    } catch { notify("Error creating company", "error"); }
    setSubmittingCompany(false);
  };

  const resendWelcome = async (id: number) => {
    try {
      const r = await fetch(`/api/client-users/${id}/resend`, { method: "POST" });
      const d = await r.json();
      if (d.success) notify("Welcome email resent", "success");
      else notify(d.error || "Failed to resend email", "error");
    } catch { notify("Failed to resend email", "error"); }
  };

  const toggleActive = async (u: ClientUser) => {
    const next = !u.active;
    try {
      const r = await fetch(`/api/client-users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); notify(d.error || "Failed to update", "error"); return; }
      notify(next ? "User reactivated" : "User deactivated", "success");
      fetchUsers();
    } catch { notify("Failed to update user", "error"); }
  };

  const deleteUser = async (u: ClientUser) => {
    if (typeof window !== "undefined" && !window.confirm(`Permanently delete ${u.first_name} ${u.last_name}? This frees their email to be invited again.`)) return;
    try {
      const r = await fetch(`/api/client-users/${u.id}`, { method: "DELETE" });
      if (!r.ok) { const d = await r.json().catch(() => ({})); notify(d.error || "Failed to delete", "error"); return; }
      notify("User deleted. Their email is now free.", "success");
      fetchUsers();
    } catch { notify("Failed to delete user", "error"); }
  };

  const changeRole = async (u: ClientUser, role: string) => {
    if (role === u.role) return;
    try {
      const r = await fetch(`/api/client-users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); notify(d.error || "Failed to change role", "error"); return; }
      notify("Role updated", "success");
      fetchUsers();
    } catch { notify("Failed to change role", "error"); }
  };

  const sendReply = async () => {
    if (!activeThreadId || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const r = await fetch("/api/client-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: activeThreadId, body: replyText }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); notify(d.error || "Failed to send reply", "error"); setSendingReply(false); return; }
      setReplyText("");
      openThread(activeThreadId);
    } catch { notify("Failed to send reply", "error"); }
    setSendingReply(false);
  };

  const labelStyle: React.CSSProperties = { fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", color: T2, marginBottom: "5px", display: "block", textTransform: "uppercase" as const };
  const fieldWrap: React.CSSProperties = { marginBottom: "12px" };

  const statusLabel = (u: ClientUser) =>
    !u.active ? "Deactivated" : u.must_reset_password ? "Pending password reset" : "Active";
  const statusColor = (u: ClientUser) =>
    !u.active ? T3 : u.must_reset_password ? GOLD : "#E30000";

  const fmtDate = (s: string | null) => {
    if (!s) return "—";
    const d = new Date(s);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 400, letterSpacing: "-0.01em", margin: 0 }}>Client Users</h1>
        <div style={{ fontSize: "11px", color: T3, marginTop: "4px" }}>{users.length} users · manage portal access and messages</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
        {/* FORM 1 — Add user to existing company */}
        <div style={glass({ padding: "22px" })}>
          <h2 style={{ fontSize: "15px", fontWeight: 500, margin: "0 0 4px" }}>Add user to existing company</h2>
          <div style={{ fontSize: "11px", color: T3, marginBottom: "18px" }}>Invite a person to an existing client company.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={fieldWrap}>
              <label style={labelStyle}>First name</label>
              <input style={INPUT} value={userForm.first_name} onChange={e => setUserForm(f => ({ ...f, first_name: e.target.value }))} />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Last name</label>
              <input style={INPUT} value={userForm.last_name} onChange={e => setUserForm(f => ({ ...f, last_name: e.target.value }))} />
            </div>
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Email</label>
            <input type="email" style={INPUT} value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={fieldWrap}>
              <label style={labelStyle}>Job title</label>
              <input style={INPUT} value={userForm.job_title} onChange={e => setUserForm(f => ({ ...f, job_title: e.target.value }))} />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Phone</label>
              <input style={INPUT} value={userForm.phone} onChange={e => setUserForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={fieldWrap}>
              <label style={labelStyle}>Company</label>
              <select style={INPUT} value={userForm.company_id} onChange={e => setUserForm(f => ({ ...f, company_id: e.target.value }))}>
                <option value="">Select a company</option>
                {clients.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Role</label>
              <select style={INPUT} value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
                {(["owner", "administrator", "user"] as const).map(role => {
                  const disabled = roleDisabled(role);
                  return (
                    <option key={role} value={role} disabled={disabled} style={disabled ? { color: T3 } : undefined}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}{disabled ? " (limit reached)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Notes (internal only)</label>
            <textarea style={{ ...INPUT, minHeight: "60px", resize: "vertical" as const }} value={userForm.notes} onChange={e => setUserForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <button onClick={submitUser} disabled={submittingUser}
            style={{ marginTop: "6px", padding: "10px 20px", borderRadius: "8px", border: "none", background: GOLD, color: "#fff", fontSize: "13px", fontWeight: 500, cursor: submittingUser ? "default" : "pointer", opacity: submittingUser ? 0.6 : 1, fontFamily: "inherit" }}>
            {submittingUser ? "Adding…" : "Add user"}
          </button>
        </div>

        {/* FORM 2 — New company + owner */}
        <div style={glass({ padding: "22px" })}>
          <h2 style={{ fontSize: "15px", fontWeight: 500, margin: "0 0 4px" }}>New company + owner</h2>
          <div style={{ fontSize: "11px", color: T3, marginBottom: "18px" }}>Create a brand new company and its owner account in one step.</div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Company name</label>
            <input style={INPUT} value={companyForm.company_name} onChange={e => setCompanyForm(f => ({ ...f, company_name: e.target.value }))} />
          </div>
          <div style={{ fontSize: "10px", fontWeight: 400, letterSpacing: "0.08em", color: T3, textTransform: "uppercase" as const, margin: "8px 0 12px" }}>Owner details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={fieldWrap}>
              <label style={labelStyle}>First name</label>
              <input style={INPUT} value={companyForm.first_name} onChange={e => setCompanyForm(f => ({ ...f, first_name: e.target.value }))} />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Last name</label>
              <input style={INPUT} value={companyForm.last_name} onChange={e => setCompanyForm(f => ({ ...f, last_name: e.target.value }))} />
            </div>
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Email</label>
            <input type="email" style={INPUT} value={companyForm.email} onChange={e => setCompanyForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={fieldWrap}>
              <label style={labelStyle}>Job title</label>
              <input style={INPUT} value={companyForm.job_title} onChange={e => setCompanyForm(f => ({ ...f, job_title: e.target.value }))} />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Phone</label>
              <input style={INPUT} value={companyForm.phone} onChange={e => setCompanyForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Notes (internal only)</label>
            <textarea style={{ ...INPUT, minHeight: "60px", resize: "vertical" as const }} value={companyForm.notes} onChange={e => setCompanyForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <button onClick={submitCompany} disabled={submittingCompany}
            style={{ marginTop: "6px", padding: "10px 20px", borderRadius: "8px", border: "none", background: GOLD, color: "#fff", fontSize: "13px", fontWeight: 500, cursor: submittingCompany ? "default" : "pointer", opacity: submittingCompany ? 0.6 : 1, fontFamily: "inherit" }}>
            {submittingCompany ? "Creating…" : "Create company + owner"}
          </button>
        </div>
      </div>

      {/* Lower grid: users table + messages inbox */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
        {/* USERS TABLE */}
        <div style={glass({ padding: "22px" })}>
          <h2 style={{ fontSize: "15px", fontWeight: 500, margin: "0 0 16px" }}>All client users</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ textAlign: "left", color: T3, fontSize: "10px", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                  <th style={{ padding: "8px 10px 8px 0", fontWeight: 500 }}>Name</th>
                  <th style={{ padding: "8px 10px", fontWeight: 500 }}>Email</th>
                  <th style={{ padding: "8px 10px", fontWeight: 500 }}>Role</th>
                  <th style={{ padding: "8px 10px", fontWeight: 500 }}>Company</th>
                  <th style={{ padding: "8px 10px", fontWeight: 500 }}>Status</th>
                  <th style={{ padding: "8px 10px", fontWeight: 500 }}>Last login</th>
                  <th style={{ padding: "8px 0 8px 10px", fontWeight: 500 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: "20px 0", color: T3, textAlign: "center" }}>No client users yet.</td></tr>
                )}
                {users.map((u, i) => (
                  <tr key={u.id} style={{ borderTop: i === 0 ? "1px solid #E5E5E5" : "1px solid #E5E5E5" }}>
                    <td style={{ padding: "10px 10px 10px 0", color: T }}>{u.first_name} {u.last_name}</td>
                    <td style={{ padding: "10px", color: T2 }}>{u.email}</td>
                    <td style={{ padding: "10px", color: T2 }}>
                      <select value={u.role} onChange={e => changeRole(u, e.target.value)}
                        style={{ background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: "8px", padding: "4px 6px", fontSize: "12px", color: T2, fontFamily: "Helvetica, Arial, sans-serif", textTransform: "capitalize" as const, cursor: "pointer" }}>
                        {(["owner", "administrator", "user"] as const).map(r => (
                          <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "10px", color: T2 }}>{u.company_name}</td>
                    <td style={{ padding: "10px" }}>
                      <span style={{ color: statusColor(u), fontWeight: 500 }}>{statusLabel(u)}</span>
                    </td>
                    <td style={{ padding: "10px", color: T2 }}>{fmtDate(u.last_login)}</td>
                    <td style={{ padding: "10px 0 10px 10px", whiteSpace: "nowrap" as const }}>
                      <button onClick={() => resendWelcome(u.id)}
                        style={{ fontSize: "11px", color: GOLD, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", marginRight: "12px" }}>
                        Resend welcome email
                      </button>
                      <button onClick={() => toggleActive(u)}
                        style={{ fontSize: "11px", color: u.active ? "#C0392B" : "#E30000", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                        {u.active ? "Deactivate" : "Reactivate"}
                      </button>
                      {!u.active && (
                        <button onClick={() => deleteUser(u)}
                          style={{ fontSize: "11px", color: "#C0392B", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", marginLeft: "12px", fontWeight: 400 }}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MESSAGES INBOX */}
        <div style={glass({ padding: "22px" })}>
          <h2 style={{ fontSize: "15px", fontWeight: 500, margin: "0 0 16px" }}>Messages</h2>
          {activeThreadId === null ? (
            <div>
              {threads.length === 0 && <div style={{ color: T3, fontSize: "12px" }}>No messages yet.</div>}
              {threads.map((t, i) => (
                <div key={t.client_user_id} onClick={() => openThread(t.client_user_id)}
                  style={{ padding: "12px 4px", borderTop: i === 0 ? "none" : "1px solid #E5E5E5", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px", color: T, fontWeight: 500 }}>{t.first_name} {t.last_name}</span>
                      {t.unread > 0 && (
                        <span style={{ fontSize: "10px", fontWeight: 400, color: "#fff", background: GOLD, borderRadius: "10px", padding: "1px 7px" }}>{t.unread}</span>
                      )}
                    </div>
                    <div style={{ fontSize: "11px", color: T3, marginTop: "1px" }}>{t.company_name}</div>
                    <div style={{ fontSize: "12px", color: T2, marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{t.last_body}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", height: "440px" }}>
              <button onClick={() => { setActiveThreadId(null); setThreadMessages([]); setReplyText(""); fetchThreads(); }}
                style={{ fontSize: "11px", color: GOLD, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", padding: "0 0 12px" }}>
                ← Back to inbox
              </button>
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
                {threadMessages.length === 0 && <div style={{ color: T3, fontSize: "12px" }}>No messages in this thread.</div>}
                {threadMessages.map(m => {
                  const isAdmin = m.sender === "admin";
                  return (
                    <div key={m.id} style={{ alignSelf: isAdmin ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                      <div style={{
                        background: isAdmin ? GOLD : "#F5F5F5",
                        color: isAdmin ? "#fff" : T,
                        border: isAdmin ? "none" : "1px solid #E5E5E5",
                        borderRadius: "10px", padding: "8px 12px", fontSize: "12px", lineHeight: 1.5, whiteSpace: "pre-wrap" as const,
                      }}>{m.body}</div>
                      <div style={{ fontSize: "9px", color: T3, marginTop: "3px", textAlign: isAdmin ? "right" : "left" }}>{fmtDate(m.created_at)}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                <input style={{ ...INPUT, flex: 1 }} placeholder="Type a reply…" value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }} />
                <button onClick={sendReply} disabled={sendingReply || !replyText.trim()}
                  style={{ padding: "0 18px", borderRadius: "8px", border: "none", background: GOLD, color: "#fff", fontSize: "13px", fontWeight: 500, cursor: (sendingReply || !replyText.trim()) ? "default" : "pointer", opacity: (sendingReply || !replyText.trim()) ? 0.6 : 1, fontFamily: "inherit" }}>
                  {sendingReply ? "…" : "Send"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
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
  const [imgPrompt, setImgPrompt]     = useState("");
  const [isImgGen, setIsImgGen]       = useState(false);
  const [bellOpen, setBellOpen]       = useState(false);
  const [clientUsersUnread, setClientUsersUnread] = useState(0);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("linkedin_connected")) { notify("LinkedIn connected successfully ✓", "success"); window.history.replaceState({}, "", window.location.pathname); }
    if (params.get("linkedin_error")) { notify(`LinkedIn connection failed: ${params.get("linkedin_error")}`, "error"); window.history.replaceState({}, "", window.location.pathname); }
  }, [notify]);

  const fetchClientUsersUnread = useCallback(async () => {
    try {
      const r = await fetch("/api/client-messages");
      const d = await r.json();
      const threads: { unread?: number }[] = d.threads || [];
      setClientUsersUnread(threads.reduce((sum, t) => sum + (t.unread || 0), 0));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchClientUsersUnread();
    if (tab !== "clientusers") return;
    const iv = setInterval(() => { fetchClientUsersUnread(); }, 15000);
    return () => clearInterval(iv);
  }, [tab, fetchClientUsersUnread]);

  const switchCompany = (c: Company) => {
    setAc(c); setAp(c.pillars[0]); setPost(""); setSvg(""); setImgUrl(""); setImgProvider(""); setImgPrompt("");
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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    try {
      const r = await fetch("/api/image-generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company: ac, pillar: ap, visualType: vizType, postContent: postContentOverride ?? post, editRequest }), signal: controller.signal });
      clearTimeout(timer);
      const d = await r.json();
      if (d.imageUrl) { setImgUrl(d.imageUrl); setImgProvider(d.provider || ""); setImgPrompt(d.prompt || ""); notify("Image generated", "success"); }
      else notify(d.error || "Image generation failed", "error");
    } catch (e) {
      clearTimeout(timer);
      const isTimeout = e instanceof Error && e.name === "AbortError";
      notify(isTimeout ? "Image generation timed out — please try again" : "Image generation failed", "error");
    }
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
    await fetch("/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company_id: ac!.id, company_name: ac!.name, post_type: ap!.type, scheduled_day: ap!.day, content: post, status, image_url: imageUrl || null }) });
    setIsSave(false); notify(`Saved as ${status}`, "success"); fetchPosts(); fetchAllPosts();
  };

  const sendForApproval = async (imageUrl?: string) => {
    if (!post) return;
    setIsSave(true);
    await fetch("/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company_id: ac!.id, company_name: ac!.name, post_type: ap!.type, scheduled_day: ap!.day, content: post, status: "pending_approval", image_url: imageUrl || null }) });
    setIsSave(false); notify("Sent for client approval ✓", "success"); fetchPosts(); fetchAllPosts();
  };

  const copy = (t: string) => { navigator.clipboard.writeText(t); notify("Copied to clipboard", "success"); };

  const downloadSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${ac!.id}-${vizType}-${Date.now()}.svg`; a.click();
    notify("SVG downloaded", "success");
  };
if (authRole === undefined) {
  return <div style={{ minHeight: "100vh", background: "#F5F5F5" }} />;
}
if (authRole === null) {
  window.location.replace("/landing");
  return <div style={{ minHeight: "100vh", background: "#F5F5F5" }} />;
}
if (loadingClients || !ac || !ap) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#F5F5F5",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#999999",
      fontSize: "14px",
    }}>
      Loading clients…
    </div>
  );
}
  // Count posts with change-request notes (returned to draft with client feedback)
  const changeRequestCount = posts.filter(p => p.status === "draft" && p.notes).length;
  const pendingApprovalAll = allPosts.filter(p => p.status === "pending_approval");
  const changeRequestAll   = allPosts.filter(p => p.status === "draft" && p.notes);
  const bellCount = pendingApprovalAll.length + changeRequestAll.length;

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: "overview",  label: "Overview"  },
    { id: "compose",   label: "Compose"   },
    { id: "library",   label: "Library", badge: changeRequestCount },
    { id: "calendar",  label: "Calendar"  },
    { id: "reports",   label: "Reports"   },
    { id: "invoices",  label: "Invoices"  },
    { id: "clients",   label: "Clients"   },
    { id: "clientusers", label: "Client Users", badge: clientUsersUnread },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F5F5F5", color: "#0A0A0A", fontFamily: "Helvetica, Arial, sans-serif", paddingTop: "64px" }}>

      {/* Toast */}
      {note && <Toast message={note} type={noteType} />}

      {/* ── Nav ── */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "#0A0A0A",
      }}>
        <div style={{ padding: "0 32px", height: "64px", display: "flex", alignItems: "center", gap: "40px" }}>

          {/* Wordmark */}
          <a href="/" style={{ flexShrink: 0, textDecoration: "none", display: "flex", alignItems: "center" }}>
            <span style={{
              fontFamily: "var(--font-raleway), sans-serif",
              fontSize: "18px", fontWeight: 200,
              color: "#FFFFFF", letterSpacing: "0.1em", whiteSpace: "nowrap",
            }}>
              LINKWRIGHT
            </span>
          </a>

          <div style={{ flex: 1 }} />

          {/* Company switcher + back to main site + logout */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            <CompanySwitcher ac={ac} clients={clients} onChange={switchCompany} />
            <a href="/" style={{
              fontSize: "13px", fontWeight: 400,
              color: "#FFFFFF",
              textDecoration: "none",
              padding: "8px 16px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: "999px",
              fontFamily: "var(--font-raleway), sans-serif",
              transition: "all 0.15s ease",
              cursor: "pointer",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#FFFFFF"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.4)"; }}
            >
              ← Back to main site
            </a>
            <a href="/portal" target="_blank" rel="noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              padding: "8px 16px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: "999px",
              color: "#FFFFFF",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 400,
              fontFamily: "var(--font-raleway), sans-serif",
              transition: "all 0.15s ease",
              cursor: "pointer",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#FFFFFF"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.4)"; }}
              title="Open client portal"
            >
              Portal ↗
            </a>
            {/* Notifications bell */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setBellOpen(o => !o)}
                style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", background: bellOpen ? "#E30000" : "transparent", border: `1px solid ${bellOpen ? "#E30000" : "rgba(255,255,255,0.4)"}`, borderRadius: "999px", color: "#FFFFFF", cursor: "pointer", transition: "all 0.15s ease", fontFamily: "inherit" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1.5a4 4 0 0 1 4 4v2.5l1 1.5H2l1-1.5V5.5a4 4 0 0 1 4-4zM5.5 11.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
                {bellCount > 0 && (
                  <span style={{ position: "absolute", top: "-4px", right: "-4px", minWidth: "14px", height: "14px", borderRadius: "7px", background: "#cc3333", color: "#fff", fontSize: "8px", fontWeight: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", border: "1.5px solid #F5F5F5" }}>
                    {bellCount}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: "320px", background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", zIndex: 200, overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid #E5E5E5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: T3 }}>Needs Attention</span>
                    {bellCount === 0 && <span style={{ fontSize: "11px", color: T3 }}>All clear</span>}
                  </div>
                  <div style={{ maxHeight: "360px", overflowY: "auto" }}>
                    {bellCount === 0 ? (
                      <div style={{ padding: "32px 18px", textAlign: "center", color: T3, fontSize: "13px" }}>No pending items</div>
                    ) : (
                      <>
                        {pendingApprovalAll.map(p => (
                          <div key={p.id} onClick={() => { setTab("library"); setBellOpen(false); }}
                            style={{ padding: "12px 18px", borderBottom: "1px solid #E5E5E5", cursor: "pointer", transition: "background 0.12s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#F5F5F5"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                              <span style={{ fontSize: "9px", fontWeight: 400, padding: "2px 7px", background: "rgba(227,0,0,0.10)", color: "#B00000", border: "1px solid rgba(227,0,0,0.25)", borderRadius: "4px", letterSpacing: "0.08em" }}>PENDING</span>
                              <span style={{ fontSize: "11px", color: T3 }}>{p.company_name}</span>
                            </div>
                            <div style={{ fontSize: "12px", color: T2, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{p.content.slice(0, 100)}</div>
                          </div>
                        ))}
                        {changeRequestAll.map(p => (
                          <div key={p.id} onClick={() => { setTab("library"); setBellOpen(false); }}
                            style={{ padding: "12px 18px", borderBottom: "1px solid #E5E5E5", cursor: "pointer", transition: "background 0.12s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#F5F5F5"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                              <span style={{ fontSize: "9px", fontWeight: 400, padding: "2px 7px", background: "rgba(204,51,51,0.08)", color: "#cc3333", border: "1px solid rgba(204,51,51,0.20)", borderRadius: "4px", letterSpacing: "0.08em" }}>CHANGE REQ</span>
                              <span style={{ fontSize: "11px", color: T3 }}>{p.company_name}</span>
                            </div>
                            <div style={{ fontSize: "12px", color: T2, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{p.content.slice(0, 100)}</div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <a href="/login" style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "8px 16px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: "999px",
              color: "#FFFFFF",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 400,
              fontFamily: "var(--font-raleway), sans-serif",
              transition: "all 0.15s ease",
              cursor: "pointer",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#FFFFFF"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.4)"; }}
              title="Sign out"
            >
              Sign out
            </a>
          </div>
        </div>

      </header>

      {/* ── Body: left sidebar + content column ── */}
      <div style={{ display: "flex", alignItems: "stretch", minHeight: "calc(100vh - 64px)" }}>

        {/* Left sidebar nav */}
        <aside style={{
          width: "220px", flexShrink: 0,
          background: "#FFFFFF",
          borderRight: "1px solid #E5E5E5",
          padding: "24px 12px",
          display: "flex", flexDirection: "column", gap: "4px",
        }}>
          <div style={{
            fontFamily: "Helvetica, Arial, sans-serif",
            fontSize: "11px", color: "#999999",
            letterSpacing: "0.15em", textTransform: "uppercase",
            padding: "0 12px", marginBottom: "8px",
          }}>
            Workspace
          </div>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px",
                  width: "100%", textAlign: "left",
                  padding: "12px 24px",
                  background: active ? "#E30000" : "transparent",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px", fontWeight: active ? 600 : 400,
                  color: active ? "#FFFFFF" : "#666666",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  fontFamily: "Helvetica, Arial, sans-serif",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#F5F5F5"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <span>{t.label}</span>
                {t.badge && t.badge > 0 ? (
                  <span style={{ minWidth: "18px", height: "18px", borderRadius: "999px", background: active ? "#FFFFFF" : "#E30000", color: active ? "#E30000" : "#FFFFFF", fontSize: "10px", fontWeight: 400, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
                    {t.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </aside>

        {/* Content column */}
        <div style={{ flex: 1, minWidth: 0, background: "#F5F5F5", display: "flex", flexDirection: "column" }}>

      {/* Scrolling marquee */}
      <div style={{
        height: "40px",
        background: "#FFFFFF",
        borderBottom: "1px solid #E5E5E5",
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
              fontFamily: "Helvetica, Arial, sans-serif",
              whiteSpace: "nowrap",
            }}>
              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: c.color, display: "inline-block", flexShrink: 0 }} />
              <span style={{ color: T2 }}>{c.name}</span>
              <span style={{ color: "#E5E5E5" }}>·</span>
              <span>{c.tagline || c.timezone}</span>
              <span style={{ color: "#E5E5E5" }}>·</span>
              <span>{c.timezone}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Light image banner — services.png with cream overlay, matching landing page split section */}
      <div style={{ position: "relative", height: "160px", overflow: "hidden", background: "#ECECEC" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/services.png" alt="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "brightness(1.05) contrast(1.05) saturate(0.6)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(245,245,245,0.85) 0%, rgba(245,245,245,0.65) 100%)" }} />
        <div style={{ position: "relative", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "10px" }}>
          <div style={{ width: "28px", height: "1px", background: "#E30000" }} />
          <p style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "clamp(18px, 2vw, 28px)", fontWeight: 400, fontStyle: "normal", color: "#0A0A0A", letterSpacing: "-0.01em" }}>
            {ac ? ac.name : "Content Studio"}
          </p>
          <div style={{ width: "28px", height: "1px", background: "#E30000" }} />
        </div>
      </div>

      {/* ── Main content ── */}
      <main style={{ flex: 1, maxWidth: "1400px", width: "100%", margin: "0 auto", padding: "32px 32px 80px" }}>
        {tab === "overview"  && <OverviewTab  ac={ac} clients={clients} posts={posts} allPosts={allPosts} />}
        {tab === "compose"   && (
          <ComposeTab
            ac={ac} ap={ap} setAp={setAp}
            post={post} setPost={setPost}
            isGen={isGen} isSave={isSave} isVisual={isVisual} isRefining={isRefining} isVisualRefining={isVisualRefining}
            svg={svg} setSvg={setSvg} vizType={vizType} setVizType={setVizType}
            refineRequest={refineRequest} setRefineRequest={setRefineRequest}
            svgRefineRequest={svgRefineRequest} setSvgRefineRequest={setSvgRefineRequest}
            imgUrl={imgUrl} imgProvider={imgProvider} imgPrompt={imgPrompt} isImgGen={isImgGen} clearImgUrl={() => setImgUrl("")}
            generate={generate} generateVisual={generateVisual} generateAiImage={generateAiImage} refinePost={refinePost} refineVisual={refineVisual}
            savePost={savePost} sendForApproval={sendForApproval} copy={copy} downloadSvg={downloadSvg} notify={notify}
          />
        )}
        {tab === "library"   && (
          <LibraryTab
            ac={ac} posts={posts} filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            fetchPosts={() => { fetchPosts(); fetchAllPosts(); }} notify={notify} copy={copy}
          />
        )}
        {tab === "calendar"  && <CalendarTab  ac={ac} clients={clients} allPosts={allPosts} />}
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
        {tab === "clientusers" && (
          <ClientUsersTab
            clients={clients}
            notify={notify}
            onCompanyAdded={() => {
              fetch("/api/clients")
                .then(r => r.json())
                .then(d => { if (d.clients && d.clients.length > 0) setClients(d.clients); });
            }}
          />
        )}
      </main>
        </div>
      </div>

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
