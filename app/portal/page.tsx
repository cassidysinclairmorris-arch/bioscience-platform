"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { LINKEDIN_METRICS, SIGNAL_METRICS, tierIncludesSignal } from "@/lib/tiers";
import { buildSeries, yearsIn, type Granularity } from "@/lib/report-series";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────
type ClientRole = "owner" | "administrator" | "user";
type UserSession = { role: "agency" | "client"; clientId: string | null; email: string; clientRole?: ClientRole; firstName?: string };
type TeamMember = { id: number; first_name: string; last_name: string; email: string; role: ClientRole; must_reset_password: number; last_login: string | null };
type Pillar = { id: number; type: string; day: string; color: string | null };
type Client = {
  id: string; name: string; tagline: string | null; color: string;
  logo_file: string | null;
  brand: { accent_color: string | null; dark_color: string | null; light_color: string | null; } | null;
  pillars?: Pillar[];
  tier?: string | null;
};
type ReportUploadRow = { id: number; client_id: string; period: string; metric_key: string; value: number | null; image_url: string | null };
type AssetFileType = "image" | "document" | "slideshow" | "video";
type Asset = {
  id: number; client_id: string; pillar_id: number | null; uploaded_by: number | null;
  file_url: string; file_name: string; file_type: AssetFileType; file_size: number;
  notes: string | null; created_at: string; updated_at: string;
  pillar_type?: string | null; uploader_first_name?: string | null; uploader_last_name?: string | null;
};
type Post = {
  id: number; company_id: string; company_name: string; post_type: string;
  scheduled_day: string; content: string;
  status: "draft" | "pending_approval" | "approved" | "scheduled" | "posted";
  notes: string | null; image_url: string | null; week_number: number | null; created_at: string; updated_at: string;
  assets?: { id: number; url: string; kind: string; sort_order: number }[];
};
type PostAnalytic = {
  id: number; post_id: number; impressions: number; engagement_rate: number;
  clicks: number; likes: number; comments: number; reposts: number; recorded_at: string;
};
type PortalTab = "dashboard" | "approval" | "history" | "reports" | "library" | "team" | "messages";

type PortalMessage = { id: number; client_user_id: number; sender: "client" | "admin"; body: string; created_at: string; read_at: string | null };
type Report = {
  id: number;
  client_id: string;
  type: "monthly" | "weekly";
  period_start: string;
  period_end: string;
  status: "draft" | "published";
  extracted_data: string | null;
  narrative_client: string | null;
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
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function glass(extra?: React.CSSProperties): React.CSSProperties {
  return { background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: "12px", ...extra };
}

function Spinner() {
  return <span style={{ width: "14px", height: "14px", border: "1.5px solid #E5E5E5", borderTopColor: "#0A0A0A", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block", flexShrink: 0 }} />;
}

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; border: string }> = {
    draft:            { bg: "#F5F5F5",          color: "#666666",   border: "#E5E5E5"          },
    pending_approval: { bg: "rgba(227,0,0,0.10)", color: "#E30000", border: "rgba(227,0,0,0.30)" },
    approved:         { bg: "rgba(10,10,10,0.10)", color: "#0A0A0A", border: "rgba(10,10,10,0.20)" },
    scheduled:        { bg: "rgba(10,10,10,0.10)", color: "#0A0A0A", border: "rgba(10,10,10,0.20)" },
    posted:           { bg: "rgba(227,0,0,0.10)", color: "#E30000", border: "rgba(227,0,0,0.30)" },
  };
  const s = cfg[status] ?? cfg.draft;
  return (
    <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase", padding: "4px 12px", borderRadius: "999px", background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: "nowrap" }}>
      {status.replace("_", " ")}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Post visuals (single image, or a carousel when a post has multiple) ────────
function PostVisuals({ post }: { post: Post }) {
  const assets = (post.assets && post.assets.length)
    ? [...post.assets].sort((a, b) => a.sort_order - b.sort_order)
    : (post.image_url ? [{ id: 0, url: post.image_url, kind: "image", sort_order: 0 }] : []);
  const [idx, setIdx] = useState(0);
  if (!assets.length) return null;
  const i = Math.min(idx, assets.length - 1);
  const multi = assets.length > 1;
  const arrow: React.CSSProperties = {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    width: "34px", height: "34px", borderRadius: "999px",
    background: "rgba(10,10,10,0.55)", color: "#FFFFFF", border: "none",
    fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "Helvetica, Arial, sans-serif", transition: "all 0.15s ease",
  };
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden", border: "1px solid #E5E5E5", background: "#F5F5F5" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={assets[i].url} alt={`Visual ${i + 1}`} style={{ width: "100%", maxHeight: "360px", objectFit: "cover", display: "block" }} />
        {multi && (
          <>
            <button onClick={() => setIdx((i - 1 + assets.length) % assets.length)} aria-label="Previous visual" style={{ ...arrow, left: "10px" }}>‹</button>
            <button onClick={() => setIdx((i + 1) % assets.length)} aria-label="Next visual" style={{ ...arrow, right: "10px" }}>›</button>
            <div style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(10,10,10,0.7)", color: "#FFFFFF", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", padding: "3px 9px", borderRadius: "999px" }}>{i + 1} / {assets.length}</div>
            <div style={{ position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "6px" }}>
              {assets.map((_, d) => (
                <span key={d} style={{ width: "6px", height: "6px", borderRadius: "50%", background: d === i ? "#E30000" : "rgba(255,255,255,0.75)" }} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardTab({ client, pendingPosts, postedPosts, accentColor, onNavigate }: {
  client: Client; pendingPosts: Post[]; postedPosts: Post[]; accentColor: string;
  onNavigate: (tab: PortalTab) => void;
}) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const publishedThisMonth = postedPosts.filter(p => p.updated_at >= monthStart).length;

  const statCards = [
    { label: "Awaiting Your Approval", value: pendingPosts.length, color: "#E30000",  action: pendingPosts.length > 0 ? () => onNavigate("approval") : undefined, actionLabel: "Review now →" },
    { label: "Published This Month",   value: publishedThisMonth,  color: "#0A0A0A",  action: () => onNavigate("history"),  actionLabel: "View history →" },
    { label: "Total Published",        value: postedPosts.length,  color: "#E30000" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Welcome */}
      <div style={glass({ padding: "24px", borderTop: "3px solid #E30000" })}>
        <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", fontWeight: 400, letterSpacing: "0.18em", textTransform: "uppercase", color: "#999999", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ display: "block", width: "24px", height: "1px", background: "#E30000", flexShrink: 0 }} />
          Client Portal
        </p>
        <h2 style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "clamp(26px, 2.5vw, 40px)", fontWeight: 400, fontStyle: "normal", lineHeight: 1.15, letterSpacing: "-0.01em", color: "#0A0A0A", marginBottom: "12px" }}>
          Welcome back, {client.name}
        </h2>
        {client.tagline && (
          <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "14px", color: "#666666", lineHeight: 1.7 }}>{client.tagline}</p>
        )}
        {pendingPosts.length > 0 && (
          <div style={{ marginTop: "24px", display: "inline-flex", alignItems: "center", gap: "10px", padding: "10px 18px", background: "rgba(227,0,0,0.10)", border: "1px solid rgba(227,0,0,0.30)", borderRadius: "8px" }}>
            <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "13px", color: "#E30000", fontWeight: 500 }}>
              {pendingPosts.length} post{pendingPosts.length !== 1 ? "s" : ""} awaiting your approval
            </span>
            <button onClick={() => onNavigate("approval")} style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#E30000", background: "none", border: "none", cursor: "pointer", fontWeight: 400, textDecoration: "underline", textUnderlineOffset: "3px", transition: "all 0.15s ease" }}>
              Review →
            </button>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
        {statCards.map((s, i) => (
          <div key={i} style={glass({ padding: "24px", borderTop: `3px solid ${s.color}` })}>
            <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "13px", fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase", color: "#999999", marginBottom: "12px" }}>{s.label}</div>
            <div style={{ fontSize: "32px", fontWeight: 400, fontFamily: "var(--font-raleway), sans-serif", color: s.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</div>
            {s.action && (
              <button onClick={s.action} style={{ marginTop: "10px", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: s.color, background: "none", border: "none", cursor: "pointer", fontWeight: 400, textDecoration: "underline", textUnderlineOffset: "3px", transition: "all 0.15s ease" }}>
                {s.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Recent pending posts preview */}
      {pendingPosts.length > 0 && (
        <div style={glass({ padding: "0", overflow: "hidden" })}>
          <div style={{ padding: "24px", borderBottom: "1px solid #E5E5E5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "20px", fontWeight: 400, fontStyle: "normal", letterSpacing: "-0.01em", color: "#0A0A0A" }}>Needs Your Review</div>
            <StatusPill status="pending_approval" />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {pendingPosts.slice(0, 3).map((p, i) => (
              <div key={p.id} style={{ padding: "16px 24px", borderBottom: i < Math.min(pendingPosts.length, 3) - 1 ? "1px solid #E5E5E5" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", fontWeight: 400, color: "#666666", textTransform: "uppercase", letterSpacing: "0.06em" }}>{p.post_type}</span>
                  <span style={{ color: "#E5E5E5" }}>·</span>
                  <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#999999" }}>{p.scheduled_day}</span>
                  <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#999999", marginLeft: "auto" }}>{formatDate(p.created_at)}</span>
                </div>
                <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "15px", color: "#0A0A0A", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {p.content}
                </p>
              </div>
            ))}
          </div>
          {pendingPosts.length > 3 && (
            <div style={{ padding: "14px 24px", borderTop: "1px solid #E5E5E5", textAlign: "center" }}>
              <button onClick={() => onNavigate("approval")} style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "13px", color: accentColor, background: "none", border: "none", cursor: "pointer", fontWeight: 400, transition: "all 0.15s ease" }}>
                View all {pendingPosts.length} posts →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Approval Queue ─────────────────────────────────────────────────────────────
function ApprovalTab({ client, pendingPosts, accentColor, onRefresh, onToast }: {
  client: Client; pendingPosts: Post[]; accentColor: string;
  onRefresh: () => void; onToast: (m: string, t?: "success" | "error") => void;
}) {
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [noteText, setNoteText]         = useState<Record<number, string>>({});
  const [busy, setBusy]                 = useState<number | null>(null);

  const approve = async (p: Post) => {
    setBusy(p.id);
    await fetch("/api/posts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, status: "approved" }) });
    setBusy(null); onToast("Post approved!", "success"); onRefresh();
  };

  const requestChanges = async (p: Post) => {
    const note = noteText[p.id]?.trim();
    if (!note) return;
    setBusy(p.id);
    await fetch("/api/posts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, status: "draft", notes: note }) });
    setBusy(null);
    setRequestingId(null);
    setNoteText(prev => { const n = { ...prev }; delete n[p.id]; return n; });
    onToast("Changes requested. Post returned to drafts.", "success");
    onRefresh();
  };

  if (pendingPosts.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(227,0,0,0.10)", border: "1px solid rgba(227,0,0,0.30)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#E30000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ fontSize: "18px", fontWeight: 400, fontStyle: "normal", color: "#0A0A0A", marginBottom: "8px", fontFamily: "var(--font-raleway), sans-serif" }}>All caught up!</div>
        <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "14px", color: "#999999" }}>No posts are waiting for your approval right now.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "20px", fontWeight: 400, fontStyle: "normal", letterSpacing: "-0.01em", color: "#0A0A0A" }}>Approval Queue</div>
        <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", fontWeight: 400, padding: "4px 12px", background: "rgba(227,0,0,0.10)", border: "1px solid rgba(227,0,0,0.30)", color: "#E30000", borderRadius: "999px" }}>
          {pendingPosts.length} pending
        </span>
      </div>
      {pendingPosts.map(p => (
        <div key={p.id} style={glass({ overflow: "hidden" })}>
          {/* Header */}
          <div style={{ padding: "14px 24px", borderBottom: "1px solid #E5E5E5", display: "flex", alignItems: "center", gap: "10px", background: "#F5F5F5", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", fontWeight: 400, padding: "4px 12px", background: "rgba(227,0,0,0.10)", border: `1px solid rgba(227,0,0,0.30)`, color: accentColor, borderRadius: "999px", letterSpacing: "0.02em" }}>
              {p.post_type}
            </span>
            <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#666666" }}>{p.scheduled_day}</span>
            <span style={{ marginLeft: "auto", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#999999" }}>{formatDate(p.created_at)}</span>
          </div>

          {/* Content */}
          <div style={{ padding: "24px" }}>
            <PostVisuals post={p} />
            <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "15px", lineHeight: 1.6, color: "#0A0A0A", whiteSpace: "pre-wrap" }}>{p.content}</p>
          </div>

          {/* Actions */}
          <div style={{ padding: "14px 24px", borderTop: "1px solid #E5E5E5", background: "#F5F5F5" }}>
            {requestingId === p.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999" }}>
                  Describe what you&apos;d like changed
                </label>
                <textarea
                  value={noteText[p.id] || ""}
                  onChange={e => setNoteText(prev => ({ ...prev, [p.id]: e.target.value }))}
                  rows={3}
                  placeholder="e.g. Please make the tone more technical, and add a reference to our FDA approval timeline…"
                  style={{ width: "100%", background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: "8px", padding: "11px 14px", fontSize: "14px", color: "#0A0A0A", outline: "none", fontFamily: "Helvetica, Arial, sans-serif", lineHeight: 1.6, resize: "none", boxSizing: "border-box", transition: "all 0.15s ease" }}
                  onFocus={e => e.target.style.borderColor = "#0A0A0A"}
                  onBlur={e => e.target.style.borderColor = "#E5E5E5"}
                  autoFocus
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => requestChanges(p)}
                    disabled={!noteText[p.id]?.trim() || busy === p.id}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 18px", background: "#E30000", border: "1px solid #E30000", borderRadius: "8px", fontSize: "13px", fontWeight: 400, color: "#FFFFFF", cursor: !noteText[p.id]?.trim() || busy === p.id ? "not-allowed" : "pointer", opacity: !noteText[p.id]?.trim() || busy === p.id ? 0.5 : 1, fontFamily: "Helvetica, Arial, sans-serif", transition: "all 0.15s ease" }}
                  >
                    {busy === p.id ? <Spinner /> : null}
                    Submit request
                  </button>
                  <button onClick={() => setRequestingId(null)} style={{ padding: "9px 18px", background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: "8px", fontSize: "13px", color: "#666666", cursor: "pointer", fontFamily: "Helvetica, Arial, sans-serif", transition: "all 0.15s ease" }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  onClick={() => approve(p)}
                  disabled={busy === p.id}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 22px", background: accentColor, border: `1px solid ${accentColor}`, borderRadius: "8px", fontSize: "13px", fontWeight: 400, color: "#FFFFFF", cursor: busy === p.id ? "not-allowed" : "pointer", fontFamily: "Helvetica, Arial, sans-serif", transition: "all 0.15s ease" }}
                  onMouseEnter={e => { if (busy !== p.id) (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                >
                  {busy === p.id ? <Spinner /> : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  Approve
                </button>
                <button
                  onClick={() => setRequestingId(p.id)}
                  style={{ padding: "9px 18px", background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: "8px", fontSize: "13px", fontWeight: 500, color: "#0A0A0A", cursor: "pointer", fontFamily: "Helvetica, Arial, sans-serif", transition: "all 0.15s ease" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#0A0A0A"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#E5E5E5"; }}
                >
                  Request changes
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Post History ──────────────────────────────────────────────────────────────
function HistoryTab({ postedPosts, analytics, accentColor }: {
  postedPosts: Post[]; analytics: Record<number, PostAnalytic>; accentColor: string;
}) {
  if (postedPosts.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(227,0,0,0.10)", border: "1px solid rgba(227,0,0,0.30)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#E30000" }} />
        </div>
        <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "18px", fontWeight: 400, color: "#0A0A0A", marginBottom: "8px" }}>No posts here yet</div>
        <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "14px", color: "#999999" }}>Posts you approve will appear here, through to publishing.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "20px", fontWeight: 400, fontStyle: "normal", letterSpacing: "-0.01em", marginBottom: "8px", color: "#0A0A0A" }}>
        Post History
      </div>
      {postedPosts.map((p, i) => {
        const an = analytics[p.id];
        return (
          <div key={p.id} style={glass({ overflow: "hidden" })}>
            <div style={{ padding: "14px 24px", borderBottom: "1px solid #E5E5E5", display: "flex", alignItems: "center", gap: "10px", background: "#F5F5F5", flexWrap: "wrap" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#E30000", flexShrink: 0 }} />
              <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", fontWeight: 400, padding: "4px 12px", background: "rgba(227,0,0,0.10)", border: `1px solid rgba(227,0,0,0.30)`, color: accentColor, borderRadius: "999px", letterSpacing: "0.02em" }}>{p.post_type}</span>
              <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#666666" }}>{p.scheduled_day}</span>
              <StatusPill status={p.status} />
              <span style={{ marginLeft: "auto", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#999999" }}>{formatDate(p.updated_at)}</span>
            </div>
            <div style={{ padding: "24px" }}>
              <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "15px", lineHeight: 1.6, color: "#0A0A0A", whiteSpace: "pre-wrap", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {p.content}
              </p>
            </div>
            {an && (
              <div style={{ padding: "12px 24px", borderTop: "1px solid #E5E5E5", display: "flex", gap: "24px", flexWrap: "wrap" }}>
                {[
                  { label: "Impressions",  value: an.impressions.toLocaleString() },
                  { label: "Engagement",   value: `${an.engagement_rate.toFixed(1)}%` },
                  { label: "Clicks",       value: an.clicks.toLocaleString() },
                  { label: "Likes",        value: an.likes.toLocaleString() },
                  { label: "Comments",     value: an.comments.toLocaleString() },
                  { label: "Reposts",      value: an.reposts.toLocaleString() },
                ].map(m => (
                  <div key={m.label}>
                    <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "13px", fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase", color: "#999999", marginBottom: "2px" }}>{m.label}</div>
                    <div style={{ fontSize: "32px", fontWeight: 400, color: "#0A0A0A", fontFamily: "var(--font-raleway), sans-serif" }}>{m.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Reports ────────────────────────────────────────────────────────────────────
const FACTOR_COLORS = ["#E30000", "#0A0A0A", "#666666", "#B00000", "#999999", "#333333", "#CC4422", "#7A7A7A", "#B85C00", "#555555", "#990000"];

// A small growth sparkline shown above each metric on the client side. Trends
// up in red when the metric is growing, muted grey when it is not. Renders
// nothing until there are at least two months to compare.
function Sparkline({ series, idKey, mounted }: { series: { period: string; value: number }[]; idKey: string; mounted: boolean }) {
  if (!mounted || series.length < 2) return null;
  const up = series[series.length - 1].value >= series[0].value;
  const color = up ? "#E30000" : "#999999";
  const gid = `sp-${idKey}`;
  return (
    <div style={{ height: "42px", marginBottom: "8px" }}>
      <ResponsiveContainer width="100%" height={42}>
        <AreaChart data={series} margin={{ top: 4, bottom: 2, left: 0, right: 0 }}>
          <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.25} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gid})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Read-only month-over-month chart for the client. Same shape as the studio one:
// toggle factors to see how each metric moves over time.
function PortalTrendChart({ history, tier }: { history: ReportUploadRow[]; tier: string | null }) {
  const factors = [...LINKEDIN_METRICS, ...SIGNAL_METRICS.filter(m => tierIncludesSignal(tier, m.key))];
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<string[]>(["impressions", "engagement_rate"]);
  const [gran, setGran] = useState<Granularity>("monthly");
  const [year, setYear] = useState<string>("");

  useEffect(() => { setMounted(true); }, []);
  // Default to the most recent year with data, so monthly shows a full Jan-Dec axis.
  useEffect(() => {
    const ys = yearsIn(history);
    if (ys.length && !ys.includes(year)) setYear(ys[ys.length - 1]);
  }, [history]); // eslint-disable-line react-hooks/exhaustive-deps

  const years = yearsIn(history);
  const effYear = gran === "yearly" ? "all" : (year || years[years.length - 1] || "all");
  const data = buildSeries(history, gran, effYear);
  const labelFor = (k: string) => factors.find(f => f.key === k)?.label ?? k;
  const colorFor = (k: string) => FACTOR_COLORS[Math.max(0, factors.findIndex(f => f.key === k)) % FACTOR_COLORS.length];
  const toggle = (k: string) => setActive(a => a.includes(k) ? a.filter(x => x !== k) : [...a, k]);

  if (history.length === 0) return null;

  const pill = (onSel: boolean): React.CSSProperties => ({ padding: "5px 12px", borderRadius: "999px", border: `1px solid ${onSel ? "#E30000" : "#E5E5E5"}`, background: onSel ? "rgba(227,0,0,0.10)" : "#FFFFFF", color: onSel ? "#E30000" : "#666666", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", cursor: "pointer" });

  return (
    <div style={glass({ overflow: "hidden" })}>
      <div style={{ padding: "24px", borderBottom: "1px solid #E5E5E5" }}>
        <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", fontWeight: 400, letterSpacing: "0.18em", textTransform: "uppercase", color: "#E30000", marginBottom: "6px" }}>Over Time</div>
        <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "20px", fontWeight: 400, color: "#0A0A0A" }}>Watch each metric move over time.</div>
      </div>
      <div style={{ padding: "20px 24px" }}>
        {/* View: monthly / quarterly / yearly, and year filter */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "12px" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            {(["monthly", "quarterly", "yearly"] as Granularity[]).map(g => (
              <button key={g} onClick={() => setGran(g)} style={{ ...pill(gran === g), textTransform: "capitalize" }}>{g}</button>
            ))}
          </div>
          {gran !== "yearly" && years.length > 0 && (
            <div style={{ display: "flex", gap: "6px" }}>
              {years.map(y => <button key={y} onClick={() => setYear(y)} style={pill(effYear === y)}>{y}</button>)}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
          {factors.map(f => {
            const on = active.includes(f.key);
            return (
              <button key={f.key} onClick={() => toggle(f.key)} style={{ padding: "6px 12px", borderRadius: "999px", border: `1px solid ${on ? colorFor(f.key) : "#E5E5E5"}`, background: on ? colorFor(f.key) : "#FFFFFF", color: on ? "#FFFFFF" : "#666666", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", cursor: "pointer" }}>
                {f.label}
              </button>
            );
          })}
        </div>
        {mounted && (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data}>
              <CartesianGrid stroke="#E5E5E5" vertical={false} />
              <XAxis dataKey="period" interval={0} tick={{ fill: "#999999", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#999999", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px" }} />
              {active.map(k => (
                <Line key={k} type="monotone" dataKey={k} name={labelFor(k)} stroke={colorFor(k)} strokeWidth={2} dot={{ r: 3, fill: colorFor(k) }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// Previous calendar month for a 'YYYY-MM' string.
function prevMonth(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  const d = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  return `${d.y}-${String(d.m).padStart(2, "0")}`;
}

function ReportsTab({ client, accentColor }: {
  client: Client; accentColor: string;
  postedPosts?: Post[]; pendingPosts?: Post[];
}) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports?clientId=${client.id}&status=published`)
      .then(r => r.json())
      .then(d => {
        const list: Report[] = d.reports ?? [];
        setReports(list);
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .finally(() => setLoading(false));
  }, [client.id]);

  const selectedReport = reports.find(r => r.id === selectedId) ?? null;
  const extracted: ExtractedData | null = selectedReport?.extracted_data ? JSON.parse(selectedReport.extracted_data) : null;

  // Entered metric values + screenshots for the report's month, plus the prior
  // month so Signal metrics can show a small trend indicator.
  const period = selectedReport ? selectedReport.period_start.slice(0, 7) : null;
  const prevPeriod = period ? prevMonth(period) : null;
  const [uploads, setUploads] = useState<Record<string, ReportUploadRow>>({});
  const [prevUploads, setPrevUploads] = useState<Record<string, ReportUploadRow>>({});
  useEffect(() => {
    const toMap = (arr: ReportUploadRow[]) => {
      const m: Record<string, ReportUploadRow> = {};
      arr.forEach(u => { m[u.metric_key] = u; });
      return m;
    };
    if (!period) { setUploads({}); setPrevUploads({}); return; }
    fetch(`/api/reports/upload?clientId=${client.id}&period=${period}`)
      .then(r => (r.ok ? r.json() : { uploads: [] })).then(d => setUploads(toMap(d.uploads || []))).catch(() => {});
    if (prevPeriod) {
      fetch(`/api/reports/upload?clientId=${client.id}&period=${prevPeriod}`)
        .then(r => (r.ok ? r.json() : { uploads: [] })).then(d => setPrevUploads(toMap(d.uploads || []))).catch(() => {});
    } else {
      setPrevUploads({});
    }
  }, [client.id, period, prevPeriod]);

  // Full metric history across every month, for the growth sparklines and the
  // over-time chart. One fetch, shared by both.
  const [history, setHistory] = useState<ReportUploadRow[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    fetch(`/api/reports/upload?clientId=${client.id}`)
      .then(r => (r.ok ? r.json() : { uploads: [] })).then(d => setHistory(d.uploads || [])).catch(() => {});
  }, [client.id]);
  const seriesFor = (key: string) =>
    history.filter(h => h.metric_key === key && h.value != null)
      .sort((a, b) => (a.period < b.period ? -1 : 1))
      .map(h => ({ period: h.period, value: h.value as number }));

  const fmtN = (n: number | null | undefined) => {
    if (n == null) return "—";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };
  const fmtPct = (n: number | null | undefined) => n == null ? "—" : `${Number(n).toFixed(1)}%`;

  const handleExport = async () => {
    if (!selectedReport) return;
    setExporting(true);
    const res = await fetch(`/api/reports/export-pdf?id=${selectedReport.id}&audience=client`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${client.name.replace(/\s+/g, "-")}-${selectedReport.type}-${selectedReport.period_start.slice(0, 7)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExporting(false);
  };

  if (loading) {
    return <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {[...Array(3)].map((_, i) => <div key={i} style={{ height: 60, borderRadius: 12, background: "#F5F5F5", animation: "pulse 1.5s ease-in-out infinite" }} />)}
    </div>;
  }

  if (reports.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", padding: "80px 40px", textAlign: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(227,0,0,0.10)", border: "1px solid rgba(227,0,0,0.30)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 18V6a2 2 0 012-2h9l5 5v9a2 2 0 01-2 2H6a2 2 0 01-2-2z" stroke={accentColor} strokeWidth="1.5"/><path d="M14 4v5h5M8 12h8M8 16h5" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
        <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "18px", fontWeight: 400, fontStyle: "normal", color: "#0A0A0A" }}>No published reports yet</div>
        <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "14px", color: "#999999" }}>Your Linkwright team will publish performance reports here.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Report selector + export */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {reports.map(r => (
            <button key={r.id} onClick={() => setSelectedId(r.id)} style={{ padding: "7px 14px", borderRadius: "999px", border: `1px solid ${r.id === selectedId ? accentColor : "#E5E5E5"}`, background: r.id === selectedId ? "rgba(227,0,0,0.10)" : "#FFFFFF", color: r.id === selectedId ? accentColor : "#666666", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", fontWeight: 400, cursor: "pointer", transition: "all 0.15s ease" }}>
              {r.period_start.slice(0, 7)} {r.type === "weekly" ? "(weekly)" : ""}
            </button>
          ))}
        </div>
        {selectedReport && (
          <button onClick={handleExport} disabled={exporting} style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "9px 18px", background: accentColor, border: `1px solid ${accentColor}`, borderRadius: "8px", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "13px", fontWeight: 400, color: "#FFFFFF", cursor: "pointer", opacity: exporting ? 0.7 : 1, transition: "all 0.15s ease" }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 9v2h9V9M6.5 1v7M4 6l2.5 2.5L9 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {exporting ? "Generating…" : "Export PDF"}
          </button>
        )}
      </div>

      {selectedReport && (
        <>
          {/* Brand header */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: "12px", borderTop: "3px solid #E30000", padding: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "32px", fontWeight: 400, fontStyle: "normal", fontFamily: "var(--font-raleway), sans-serif", color: "#0A0A0A", letterSpacing: "-0.02em", marginBottom: "4px" }}>{client.name}</div>
              <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#666666" }}>{selectedReport.period_start} – {selectedReport.period_end}</div>
              {selectedReport.published_at && <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#999999", marginTop: "4px" }}>Published {new Date(selectedReport.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "6px" }}>Prepared by</div>
              <span style={{ fontFamily: "var(--font-raleway), sans-serif", fontWeight: 200, fontSize: "16px", letterSpacing: "0.1em", color: "#0A0A0A" }}>LINKWRIGHT</span>
            </div>
          </div>

          {/* KPI cards */}
          {extracted && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
              {[
                { label: "Impressions",       value: fmtN(extracted.impressions),        color: "#0A0A0A" },
                { label: "Reach",             value: fmtN(extracted.reach),              color: accentColor },
                { label: "Engagement Rate",   value: fmtPct(extracted.engagementRate),   color: accentColor },
                { label: "Total Engagements", value: fmtN(extracted.totalEngagements),   color: "#0A0A0A" },
                { label: "Followers",         value: fmtN(extracted.followerCount),      color: accentColor },
                { label: "Follower Growth",   value: extracted.followerGrowth != null ? `${extracted.followerGrowth > 0 ? "+" : ""}${extracted.followerGrowth}` : "—", color: "#0A0A0A" },
              ].map(k => (
                <div key={k.label} style={glass({ padding: "24px", borderTop: `3px solid ${k.color}` })}>
                  <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "13px", fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase", color: "#999999", marginBottom: "8px" }}>{k.label}</div>
                  <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "32px", fontWeight: 400, color: k.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{k.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* This period at a glance — read-only summary of the entered numbers */}
          {(() => {
            const summary = LINKEDIN_METRICS
              .filter(m => m.unit === "number" && uploads[m.key]?.value != null)
              .map(m => ({ label: m.label, value: uploads[m.key]!.value as number }));
            if (summary.length === 0) return null;
            const eng = uploads["engagement_rate"]?.value;
            return (
              <div style={glass({ overflow: "hidden" })}>
                <div style={{ padding: "24px", borderBottom: "1px solid #E5E5E5" }}>
                  <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", fontWeight: 400, letterSpacing: "0.18em", textTransform: "uppercase", color: accentColor, marginBottom: "6px" }}>This Month</div>
                  <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "20px", fontWeight: 400, color: "#0A0A0A" }}>At a glance{eng != null ? ` · ${eng}% engagement` : ""}</div>
                </div>
                <div style={{ padding: "24px" }}>
                  {mounted && (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={summary} layout="vertical" margin={{ left: 20, right: 40 }}>
                        <CartesianGrid stroke="#E5E5E5" horizontal={false} />
                        <XAxis type="number" tick={{ fill: "#999999", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="label" width={110} tick={{ fill: "#666666", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(v: unknown) => [Number(v).toLocaleString(), ""]} />
                        <Bar dataKey="value" fill={accentColor} fillOpacity={0.85} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            );
          })()}

          {/* LinkedIn performance — number with a growth sparkline. No screenshots
              on the client side; the raw evidence stays in the agency studio. */}
          <div style={glass({ overflow: "hidden" })}>
            <div style={{ padding: "24px", borderBottom: "1px solid #E5E5E5" }}>
              <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", fontWeight: 400, letterSpacing: "0.18em", textTransform: "uppercase", color: accentColor, marginBottom: "6px" }}>LinkedIn Performance</div>
              <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "20px", fontWeight: 400, color: "#0A0A0A" }}>The numbers, straight from LinkedIn.</div>
            </div>
            <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
              {LINKEDIN_METRICS.map(m => {
                const u = uploads[m.key];
                const val = u?.value != null ? (m.unit === "percent" ? `${u.value}%` : fmtN(u.value)) : "—";
                return (
                  <div key={m.key} style={{ border: "1px solid #E5E5E5", borderRadius: "12px", padding: "16px 16px 14px" }}>
                    <Sparkline series={seriesFor(m.key)} idKey={`li-${m.key}`} mounted={mounted} />
                    <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase", color: "#999999", marginBottom: "4px" }}>{m.label}</div>
                    <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "26px", fontWeight: 400, color: "#0A0A0A", lineHeight: 1 }}>{val}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Linkwright Signal — tier-gated. Locked cards show no number. */}
          <div style={glass({ overflow: "hidden" })}>
            <div style={{ padding: "24px", borderBottom: "1px solid #E5E5E5" }}>
              <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", fontWeight: 400, letterSpacing: "0.18em", textTransform: "uppercase", color: accentColor, marginBottom: "6px" }}>Linkwright Signal</div>
              <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "20px", fontWeight: 400, color: "#0A0A0A" }}>Our proprietary read on your growth.</div>
            </div>
            <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
              {SIGNAL_METRICS.map(m => {
                const included = tierIncludesSignal(client.tier, m.key);
                if (!included) {
                  return (
                    <div key={m.key} style={{ border: "1px solid #E5E5E5", borderRadius: "12px", padding: "20px", background: "#FAFAFA", display: "flex", flexDirection: "column", gap: "10px" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke="#999999" strokeWidth="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="#999999" strokeWidth="1.5"/></svg>
                      <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase", color: "#999999" }}>{m.label}</div>
                      <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "13px", color: "#666666" }}>Unlocks at {m.minTierName}</div>
                    </div>
                  );
                }
                const u = uploads[m.key];
                const pu = prevUploads[m.key];
                const trend = (u?.value != null && pu?.value != null) ? u.value - pu.value : null;
                const val = u?.value != null ? (m.unit === "percent" ? `${u.value}%` : fmtN(u.value)) : "—";
                return (
                  <div key={m.key} style={{ border: "1px solid #E5E5E5", borderRadius: "12px", padding: "20px", borderTop: `3px solid ${accentColor}` }}>
                    <Sparkline series={seriesFor(m.key)} idKey={`sig-${m.key}`} mounted={mounted} />
                    <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase", color: "#999999", marginBottom: "8px" }}>{m.label}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                      <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "30px", fontWeight: 400, color: "#0A0A0A", lineHeight: 1 }}>{val}</div>
                      {trend != null && trend !== 0 && (
                        <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", fontWeight: 500, color: trend > 0 ? accentColor : "#999999" }}>
                          {trend > 0 ? "▲" : "▼"} {m.unit === "percent" ? `${Math.abs(trend).toFixed(1)}%` : fmtN(Math.abs(trend))}
                        </span>
                      )}
                    </div>
                    {trend != null && trend !== 0 && (
                      <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", color: "#999999", marginTop: "6px" }}>vs last month</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Metrics over time */}
          <PortalTrendChart history={history} tier={client.tier ?? null} />

          {/* Top posts */}
          {extracted?.posts && extracted.posts.length > 0 && (
            <div style={glass({ overflow: "hidden" })}>
              <div style={{ padding: "24px", borderBottom: "1px solid #E5E5E5" }}>
                <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "20px", fontWeight: 400, fontStyle: "normal", color: "#0A0A0A" }}>Top Posts This Period</div>
              </div>
              <div>
                {extracted.posts.slice(0, 5).map((p, i) => (
                  <div key={i} style={{ padding: "14px 24px", borderBottom: i < 4 ? "1px solid #E5E5E5" : "none", display: "flex", gap: "14px", alignItems: "flex-start" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: accentColor, marginTop: "6px", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "15px", color: "#0A0A0A", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: "4px" }}>
                        {p.content ?? "—"}
                      </p>
                      <div style={{ display: "flex", gap: "16px" }}>
                        {p.impressions != null && <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#666666", fontWeight: 500 }}>{fmtN(p.impressions)} impressions</span>}
                        {p.engagementRate != null && <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: accentColor, fontWeight: 400 }}>{fmtPct(p.engagementRate)} engagement</span>}
                        {p.date && <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#999999" }}>{p.date}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Client narrative — NEVER show agency narrative */}
          {selectedReport.narrative_client && (
            <div style={glass({ padding: "24px" })}>
              <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "20px", fontWeight: 400, fontStyle: "normal", marginBottom: "16px", color: "#0A0A0A" }}>Performance Summary</div>
              <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "15px", lineHeight: 1.6, color: "#0A0A0A", whiteSpace: "pre-wrap" }}>{selectedReport.narrative_client}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Team tab (owners and administrators only) ────────────────────────────────
const ROLE_LABEL: Record<ClientRole, string> = { owner: "Owner", administrator: "Administrator", user: "User" };

function TeamTab({ myRole, accentColor, onToast }: {
  myRole: ClientRole;
  accentColor: string;
  onToast: (msg: string, type?: "success" | "error" | "default") => void;
}) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", job_title: "", phone: "", role: "user" as ClientRole });

  const load = useCallback(() => {
    return fetch("/api/portal/team")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d && Array.isArray(d.team)) setTeam(d.team); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const adminCount = team.filter(m => m.role === "administrator").length;
  const adminLimitReached = adminCount >= 5;

  const add = async () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      onToast("Please fill in name and email.", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/portal/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add team member.");
      onToast(data.emailSent ? "Team member added. Invite sent." : `Added, but the email failed: ${data.emailError}`, data.emailSent ? "success" : "error");
      setForm({ first_name: "", last_name: "", email: "", job_title: "", phone: "", role: "user" });
      await load();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Could not add team member.", "error");
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (m: TeamMember, role: ClientRole) => {
    const res = await fetch(`/api/portal/team/${m.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) { onToast(data.error || "Could not change role.", "error"); return; }
    onToast("Role updated.", "success");
    await load();
  };

  const resend = async (m: TeamMember) => {
    const res = await fetch(`/api/portal/team/${m.id}/resend`, { method: "POST" });
    const data = await res.json();
    onToast(res.ok ? "Invite resent." : (data.error || "Could not resend."), res.ok ? "success" : "error");
  };

  const deactivate = async (m: TeamMember) => {
    const res = await fetch(`/api/portal/team/${m.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: false }),
    });
    const data = await res.json();
    if (!res.ok) { onToast(data.error || "Could not remove.", "error"); return; }
    onToast("Team member removed.", "success");
    await load();
  };

  const inputStyle: React.CSSProperties = { background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: "8px", padding: "11px 13px", fontSize: "14px", fontFamily: "Helvetica, Arial, sans-serif", color: "#0A0A0A", outline: "none", width: "100%", boxSizing: "border-box", transition: "all 0.15s ease" };
  const th: React.CSSProperties = { textAlign: "left", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", fontWeight: 400, padding: "0 12px 10px" };
  const td: React.CSSProperties = { fontFamily: "Helvetica, Arial, sans-serif", fontSize: "14px", color: "#0A0A0A", padding: "12px", borderTop: "1px solid #E5E5E5", verticalAlign: "middle" };

  return (
    <div style={{ maxWidth: "980px", margin: "0 auto" }}>
      <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "20px", fontWeight: 400, fontStyle: "normal", marginBottom: "6px", color: "#0A0A0A" }}>Team</div>
      <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "14px", color: "#666666", marginBottom: "24px" }}>
        Manage administrators and users for your company.
      </p>

      {/* Add form */}
      <div style={glass({ padding: "24px" })}>
        <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase", color: "#666666", marginBottom: "16px" }}>
          Add a team member
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
          <input style={inputStyle} placeholder="First name" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} onFocus={e => e.target.style.borderColor = "#0A0A0A"} onBlur={e => e.target.style.borderColor = "#E5E5E5"} />
          <input style={inputStyle} placeholder="Last name" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} onFocus={e => e.target.style.borderColor = "#0A0A0A"} onBlur={e => e.target.style.borderColor = "#E5E5E5"} />
          <input style={inputStyle} placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} onFocus={e => e.target.style.borderColor = "#0A0A0A"} onBlur={e => e.target.style.borderColor = "#E5E5E5"} />
          <input style={inputStyle} placeholder="Job title (optional)" value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} onFocus={e => e.target.style.borderColor = "#0A0A0A"} onBlur={e => e.target.style.borderColor = "#E5E5E5"} />
          <input style={inputStyle} placeholder="Phone (optional)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} onFocus={e => e.target.style.borderColor = "#0A0A0A"} onBlur={e => e.target.style.borderColor = "#E5E5E5"} />
          <select style={inputStyle} value={form.role} onChange={e => setForm({ ...form, role: e.target.value as ClientRole })} onFocus={e => e.target.style.borderColor = "#0A0A0A"} onBlur={e => e.target.style.borderColor = "#E5E5E5"}>
            <option value="user">User</option>
            <option value="administrator" disabled={adminLimitReached}>
              Administrator{adminLimitReached ? " (limit reached)" : ""}
            </option>
          </select>
        </div>
        <button onClick={add} disabled={busy}
          style={{ padding: "11px 22px", background: accentColor, color: "#FFFFFF", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 400, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: "Helvetica, Arial, sans-serif", transition: "all 0.15s ease" }}>
          {busy ? "Adding..." : "Add and send invite"}
        </button>
      </div>

      {/* Team table */}
      <div style={glass({ padding: "20px 20px 8px", marginTop: "20px" })}>
        {loading ? (
          <div style={{ fontFamily: "Helvetica, Arial, sans-serif", color: "#999999", fontSize: "14px", padding: "8px 12px 16px" }}>Loading...</div>
        ) : team.length === 0 ? (
          <div style={{ fontFamily: "Helvetica, Arial, sans-serif", color: "#999999", fontSize: "14px", padding: "8px 12px 16px" }}>No team members yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Name</th><th style={th}>Email</th><th style={th}>Role</th><th style={th}>Status</th><th style={th}>Last login</th><th style={th}></th></tr></thead>
            <tbody>
              {team.map(m => {
                const isOwnerRow = m.role === "owner";
                // Owners manage admins and users; administrators manage users only.
                const canManage = myRole === "owner" ? m.role !== "owner" : m.role === "user";
                return (
                  <tr key={m.id}>
                    <td style={td}>{m.first_name} {m.last_name}</td>
                    <td style={td}>{m.email}</td>
                    <td style={td}>
                      {/* Owner can change admin/user roles; admin can promote users to administrator */}
                      {!isOwnerRow && myRole === "owner" ? (
                        <select value={m.role} onChange={e => changeRole(m, e.target.value as ClientRole)}
                          style={{ ...inputStyle, padding: "6px 8px", width: "auto", fontSize: "12px" }}>
                          <option value="administrator">Administrator</option>
                          <option value="user">User</option>
                        </select>
                      ) : !isOwnerRow && myRole === "administrator" && m.role === "user" ? (
                        <button onClick={() => changeRole(m, "administrator")}
                          style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: accentColor, background: "none", border: "none", cursor: "pointer", fontWeight: 400, textDecoration: "underline", textUnderlineOffset: "3px", padding: 0, transition: "all 0.15s ease" }}>
                          Promote to admin
                        </button>
                      ) : (
                        ROLE_LABEL[m.role]
                      )}
                    </td>
                    <td style={td}>{m.must_reset_password ? "Pending password reset" : "Active"}</td>
                    <td style={td}>{m.last_login ? formatDate(m.last_login) : "Never"}</td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                      {canManage && (
                        <>
                          <button onClick={() => resend(m)}
                            style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#666666", background: "none", border: "none", cursor: "pointer", marginRight: "14px", transition: "all 0.15s ease" }}>
                            Resend
                          </button>
                          <button onClick={() => deactivate(m)}
                            style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#E30000", background: "none", border: "none", cursor: "pointer", fontWeight: 400, transition: "all 0.15s ease" }}>
                            Remove
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Messages tab ────────────────────────────────────────────────────────────
function MessagesTab({ accentColor, onViewed }: { accentColor: string; onViewed: () => void }) {
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback((markRead: boolean) => {
    return fetch(`/api/client-messages${markRead ? "?markRead=1" : ""}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d && Array.isArray(d.messages)) setMessages(d.messages);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(true).then(() => onViewed());
    const iv = setInterval(() => load(false), 15000);
    return () => clearInterval(iv);
  }, [load, onViewed]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/client-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        setText("");
        await load(true);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto" }}>
      <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "20px", fontWeight: 400, fontStyle: "normal", marginBottom: "6px", color: "#0A0A0A" }}>Messages</div>
      <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "14px", color: "#666666", marginBottom: "24px" }}>Message your team at Linkwright. We reply here.</p>

      <div style={{ background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: "12px", padding: "24px", minHeight: "320px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {loading ? (
          <div style={{ fontFamily: "Helvetica, Arial, sans-serif", color: "#999999", fontSize: "14px" }}>Loading...</div>
        ) : messages.length === 0 ? (
          <div style={{ fontFamily: "Helvetica, Arial, sans-serif", color: "#999999", fontSize: "14px" }}>No messages yet. Send the first one below.</div>
        ) : (
          messages.map(m => (
            <div key={m.id} style={{ display: "flex", justifyContent: m.sender === "client" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "78%", padding: "11px 15px", borderRadius: "12px", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "15px", lineHeight: 1.55, whiteSpace: "pre-wrap",
                background: m.sender === "client" ? "rgba(227,0,0,0.10)" : "#F5F5F5",
                border: `1px solid ${m.sender === "client" ? "rgba(227,0,0,0.30)" : "#E5E5E5"}`,
                color: "#0A0A0A" }}>
                <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: m.sender === "client" ? "#E30000" : "#999999", marginBottom: "4px", fontWeight: 400 }}>
                  {m.sender === "client" ? "You" : "Linkwright"}
                </div>
                {m.body}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") send(); }}
          placeholder="Write a message"
          style={{ flex: 1, background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: "8px", padding: "12px 14px", fontSize: "14px", fontFamily: "Helvetica, Arial, sans-serif", color: "#0A0A0A", outline: "none", transition: "all 0.15s ease" }}
          onFocus={e => e.target.style.borderColor = "#0A0A0A"}
          onBlur={e => e.target.style.borderColor = "#E5E5E5"}
        />
        <button onClick={send} disabled={sending || !text.trim()}
          style={{ padding: "0 22px", background: accentColor, color: "#FFFFFF", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 400, cursor: sending || !text.trim() ? "default" : "pointer", opacity: sending || !text.trim() ? 0.55 : 1, fontFamily: "Helvetica, Arial, sans-serif", transition: "all 0.15s ease" }}>
          Send
        </button>
      </div>
    </div>
  );
}

// ── Asset library ───────────────────────────────────────────────────────────
const ASSET_TABS: { id: AssetFileType; label: string }[] = [
  { id: "image", label: "Images" },
  { id: "document", label: "Documents" },
  { id: "slideshow", label: "Slideshows" },
  { id: "video", label: "Video" },
];

// Map a picked file to one of the four library categories.
function assetTypeForFile(file: File): AssetFileType {
  const t = file.type.toLowerCase();
  const n = file.name.toLowerCase();
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("video/")) return "video";
  if (t.includes("presentation") || t.includes("powerpoint") || /\.pptx?$/.test(n)) return "slideshow";
  return "document";
}

function formatSize(bytes: number) {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

// Simple line icon per file type, shown when there is no image thumbnail.
function AssetIcon({ type }: { type: AssetFileType }) {
  const common = { width: 26, height: 26, fill: "none", stroke: "#E30000", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (type === "video") return <svg viewBox="0 0 24 24" {...common}><rect x="2" y="5" width="14" height="14" rx="2" /><path d="M16 10l6-3v10l-6-3z" /></svg>;
  if (type === "slideshow") return <svg viewBox="0 0 24 24" {...common}><rect x="3" y="4" width="18" height="12" rx="1" /><path d="M8 20h8M12 16v4" /></svg>;
  if (type === "document") return <svg viewBox="0 0 24 24" {...common}><path d="M6 2h9l5 5v15a0 0 0 0 1 0 0H6a0 0 0 0 1 0 0z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>;
  return <svg viewBox="0 0 24 24" {...common}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>;
}

// Upload (asset === null) or edit (asset provided) modal. Owner/administrator
// only; the caller gates whether this ever renders.
function AssetModal({ client, asset, accentColor, onClose, onDone, onToast }: {
  client: Client; asset: Asset | null; accentColor: string;
  onClose: () => void; onDone: () => void;
  onToast: (m: string, t?: "success" | "error" | "default") => void;
}) {
  const editing = asset !== null;
  const [file, setFile] = useState<File | null>(null);
  const [pillarId, setPillarId] = useState<string>(asset?.pillar_id != null ? String(asset.pillar_id) : "");
  const [notes, setNotes] = useState(asset?.notes || "");
  const [busy, setBusy] = useState(false);
  const pillars = client.pillars || [];

  const inputStyle: React.CSSProperties = { background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: "8px", padding: "11px 13px", fontSize: "14px", fontFamily: "Helvetica, Arial, sans-serif", color: "#0A0A0A", outline: "none", width: "100%", boxSizing: "border-box", transition: "all 0.15s ease" };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (editing) {
        const res = await fetch(`/api/assets/${asset!.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pillar_id: pillarId || null, notes: notes.trim() || null }),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Could not save."); }
        onToast("Asset updated.", "success");
      } else {
        if (!file) { onToast("Choose a file first.", "error"); setBusy(false); return; }
        // Direct browser to Blob upload so large video files skip the function body limit.
        const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/assets/upload" });
        const res = await fetch("/api/assets", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: client.id,
            pillar_id: pillarId || null,
            file_url: blob.url,
            file_name: file.name,
            file_type: assetTypeForFile(file),
            file_size: file.size,
            notes: notes.trim() || null,
          }),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Upload failed."); }
        onToast("File uploaded.", "success");
      }
      onDone();
      onClose();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Something went wrong.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(10,10,10,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div onClick={e => e.stopPropagation()} style={glass({ padding: "28px", width: "100%", maxWidth: "460px", boxShadow: "0 10px 40px rgba(0,0,0,0.18)" })}>
        <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "20px", fontWeight: 400, color: "#0A0A0A", marginBottom: "20px" }}>
          {editing ? "Edit asset" : "Upload asset"}
        </div>

        {!editing && (
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "8px" }}>File</label>
            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{ ...inputStyle, padding: "9px 12px" }} />
            {file && <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#666666", marginTop: "6px" }}>{file.name} · {formatSize(file.size)}</div>}
          </div>
        )}
        {editing && (
          <div style={{ marginBottom: "16px", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "14px", color: "#0A0A0A" }}>{asset!.file_name}</div>
        )}

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "8px" }}>Content pillar (optional)</label>
          <select value={pillarId} onChange={e => setPillarId(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = "#0A0A0A"} onBlur={e => e.target.style.borderColor = "#E5E5E5"}>
            <option value="">No pillar</option>
            {pillars.map(p => <option key={p.id} value={p.id}>{p.type}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "8px" }}>Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Context or guidance for this file" style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }} onFocus={e => e.target.style.borderColor = "#0A0A0A"} onBlur={e => e.target.style.borderColor = "#E5E5E5"} />
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={submit} disabled={busy} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "11px 22px", background: accentColor, border: `1px solid ${accentColor}`, borderRadius: "8px", fontSize: "13px", fontWeight: 400, color: "#FFFFFF", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: "Helvetica, Arial, sans-serif" }}>
            {busy ? <Spinner /> : null}
            {editing ? "Save changes" : "Upload"}
          </button>
          <button onClick={onClose} style={{ padding: "11px 18px", background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: "8px", fontSize: "13px", color: "#666666", cursor: "pointer", fontFamily: "Helvetica, Arial, sans-serif" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function LibraryTab({ client, canManage, accentColor, onToast }: {
  client: Client; canManage: boolean; accentColor: string;
  onToast: (m: string, t?: "success" | "error" | "default") => void;
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeTab, setTypeTab] = useState<AssetFileType>("image");
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return fetch(`/api/assets?clientId=${client.id}`)
      .then(r => (r.ok ? r.json() : { assets: [] }))
      .then(d => setAssets(d.assets || []))
      .finally(() => setLoading(false));
  }, [client.id]);
  useEffect(() => { load(); }, [load]);

  const remove = async (a: Asset) => {
    if (!window.confirm(`Delete "${a.file_name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/assets/${a.id}`, { method: "DELETE" });
    if (res.ok) { onToast("Asset deleted.", "success"); load(); }
    else onToast("Could not delete asset.", "error");
  };

  const shown = assets.filter(a => a.file_type === typeTab);
  const countFor = (t: AssetFileType) => assets.filter(a => a.file_type === t).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "20px", fontWeight: 400, letterSpacing: "-0.01em", color: "#0A0A0A" }}>Asset Library</div>
        {canManage && (
          <button onClick={() => setUploading(true)} style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "9px 18px", background: accentColor, border: `1px solid ${accentColor}`, borderRadius: "8px", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "13px", fontWeight: 400, color: "#FFFFFF", cursor: "pointer" }}>
            <span style={{ fontSize: "15px", lineHeight: 1 }}>+</span> Upload
          </button>
        )}
      </div>

      {/* Type tabs */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {ASSET_TABS.map(t => {
          const active = typeTab === t.id;
          return (
            <button key={t.id} onClick={() => setTypeTab(t.id)} style={{ padding: "7px 14px", borderRadius: "999px", border: `1px solid ${active ? accentColor : "#E5E5E5"}`, background: active ? "rgba(227,0,0,0.10)" : "#FFFFFF", color: active ? accentColor : "#666666", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", fontWeight: 400, cursor: "pointer", transition: "all 0.15s ease" }}>
              {t.label} {countFor(t.id) > 0 ? `(${countFor(t.id)})` : ""}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px" }}>
          {[...Array(3)].map((_, i) => <div key={i} style={{ height: 220, borderRadius: 12, background: "#F5F5F5", animation: "pulse 1.5s ease-in-out infinite" }} />)}
        </div>
      ) : shown.length === 0 ? (
        <div style={{ textAlign: "center", padding: "72px 0" }}>
          <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(227,0,0,0.10)", border: "1px solid rgba(227,0,0,0.30)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <AssetIcon type={typeTab} />
          </div>
          <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "18px", fontWeight: 400, color: "#0A0A0A", marginBottom: "8px" }}>No files here yet</div>
          <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "14px", color: "#999999" }}>
            {canManage ? "Upload files for your team to use." : "Files shared by your team will appear here."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px" }}>
          {shown.map(a => (
            <div key={a.id} style={glass({ overflow: "hidden", display: "flex", flexDirection: "column" })}>
              {/* Thumbnail / icon */}
              <div style={{ height: "150px", background: "#F5F5F5", borderBottom: "1px solid #E5E5E5", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {a.file_type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.file_url} alt={a.file_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <AssetIcon type={a.file_type} />
                )}
              </div>
              {/* Body */}
              <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "14px", fontWeight: 500, color: "#0A0A0A", wordBreak: "break-word", lineHeight: 1.4 }}>{a.file_name}</div>
                {a.pillar_type && (
                  <span style={{ alignSelf: "flex-start", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", fontWeight: 400, padding: "3px 10px", background: "rgba(227,0,0,0.10)", border: "1px solid rgba(227,0,0,0.30)", color: accentColor, borderRadius: "999px", letterSpacing: "0.02em" }}>{a.pillar_type}</span>
                )}
                {a.notes && <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "13px", color: "#666666", lineHeight: 1.5, margin: 0 }}>{a.notes}</p>}
                <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", color: "#999999", marginTop: "auto" }}>
                  {formatSize(a.file_size)} · {formatDate(a.created_at)}
                </div>
              </div>
              {/* Actions */}
              <div style={{ padding: "10px 16px", borderTop: "1px solid #E5E5E5", display: "flex", alignItems: "center", gap: "14px", background: "#F5F5F5" }}>
                <a href={`${a.file_url}?download=1`} style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#0A0A0A", textDecoration: "none", fontWeight: 500 }}>Download</a>
                {canManage && (
                  <>
                    <button onClick={() => setEditing(a)} style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#666666", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Edit</button>
                    <button onClick={() => remove(a)} style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#E30000", background: "none", border: "none", cursor: "pointer", padding: 0, marginLeft: "auto" }}>Delete</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <AssetModal client={client} asset={null} accentColor={accentColor} onClose={() => setUploading(false)} onDone={load} onToast={onToast} />
      )}
      {editing && (
        <AssetModal client={client} asset={editing} accentColor={accentColor} onClose={() => setEditing(null)} onDone={load} onToast={onToast} />
      )}
    </div>
  );
}

// ── Main portal ───────────────────────────────────────────────────────────────
export default function PortalPage() {
  const [session, setSession]       = useState<UserSession | null>(null);
  const [client, setClient]         = useState<Client | null>(null);
  const [clients, setClients]       = useState<Client[]>([]);
  const [tab, setTab]               = useState<PortalTab>("dashboard");
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [postedPosts, setPostedPosts]   = useState<Post[]>([]);
  const [historyPosts, setHistoryPosts] = useState<Post[]>([]);
  const [analytics, setAnalytics]   = useState<Record<number, PostAnalytic>>({});
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState<{ msg: string; type: "success" | "error" | "default" } | null>(null);
  const router = useRouter();

  const notify = (msg: string, type: "success" | "error" | "default" = "default") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPosts = useCallback(async (clientId: string) => {
    const [pendingRes, approvedRes, scheduledRes, postedRes] = await Promise.all([
      fetch(`/api/posts?company_id=${clientId}&status=pending_approval`),
      fetch(`/api/posts?company_id=${clientId}&status=approved`),
      fetch(`/api/posts?company_id=${clientId}&status=scheduled`),
      fetch(`/api/posts?company_id=${clientId}&status=posted`),
    ]);
    const [pendingData, approvedData, scheduledData, postedData] = await Promise.all([
      pendingRes.json(), approvedRes.json(), scheduledRes.json(), postedRes.json(),
    ]);
    setPendingPosts(pendingData.posts || []);
    setPostedPosts(postedData.posts || []);
    // Post History holds everything the client has signed off on: approved,
    // scheduled, and already posted. Newest first.
    const hist = [
      ...(approvedData.posts || []),
      ...(scheduledData.posts || []),
      ...(postedData.posts || []),
    ].sort((a: Post, b: Post) => (b.updated_at || "").localeCompare(a.updated_at || ""));
    setHistoryPosts(hist);

    // Fetch analytics for posted posts
    if (postedData.posts?.length > 0) {
      const anaRes = await fetch(`/api/analytics?client_id=${clientId}`);
      if (anaRes.ok) {
        const anaData = await anaRes.json();
        const map: Record<number, PostAnalytic> = {};
        (anaData.analytics || []).forEach((a: PostAnalytic) => { if (a.post_id) map[a.post_id] = a; });
        setAnalytics(map);
      }
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => { if (!r.ok) { router.push("/client/login"); return null; } return r.json(); })
      .then(data => {
        if (!data) return;
        // Agency users (admin@gorlin.com) get full access; clients must have a clientId
        if (!data.email || (data.role !== "agency" && !data.clientId)) {
          router.push("/client/login"); return;
        }
        setSession(data);
      });
  }, [router]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/clients")
      .then(r => r.json())
      .then(d => {
        const cl: Client[] = d.clients || [];
        setClients(cl);
        const target = session.clientId
          ? cl.find(c => c.id === session.clientId) || null
          : cl[0] || null;
        setClient(target);
        if (target) fetchPosts(target.id);
        setLoading(false);
      });
  }, [session, fetchPosts]);

  // Poll unread message count for the badge (client sessions only).
  useEffect(() => {
    if (!session || session.role !== "client") return;
    let active = true;
    const load = () =>
      fetch("/api/client-messages")
        .then(r => (r.ok ? r.json() : null))
        .then(d => { if (active && d && typeof d.unread === "number") setUnreadMessages(d.unread); })
        .catch(() => {});
    load();
    const iv = setInterval(load, 20000);
    return () => { active = false; clearInterval(iv); };
  }, [session]);

  const handleSignOut = async () => {
    try { await fetch("/api/client/logout", { method: "POST" }); } catch {}
    window.location.href = "/client/login";
  };

  const handleClientSwitch = (c: Client) => {
    setClient(c);
    fetchPosts(c.id);
  };

  const handleRefresh = () => {
    if (client) fetchPosts(client.id);
  };

  if (loading || !session) {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", color: "#999999", fontSize: "14px", fontFamily: "Helvetica, Arial, sans-serif" }}>
        <Spinner /> Loading…
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center", color: "#666666", fontSize: "14px", fontFamily: "Helvetica, Arial, sans-serif", flexDirection: "column", gap: "12px" }}>
        <p>No client account linked to your profile.</p>
        <a href="/client/login" style={{ color: "#E30000", fontSize: "13px", cursor: "pointer" }}>Back to login</a>
      </div>
    );
  }

  // Single brand accent across the portal.
  const accentColor = "#E30000";

  const TABS: { id: PortalTab; label: string; badge?: number }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "approval",  label: "Approval Queue", badge: pendingPosts.length },
    { id: "history",   label: "Post History" },
    { id: "reports",   label: "Reports" },
    { id: "library",   label: "Library" },
    ...(session.clientRole === "owner" || session.clientRole === "administrator"
      ? [{ id: "team" as const, label: "Team" }]
      : []),
    ...(session.role === "client"
      ? [{ id: "messages" as const, label: "Messages", badge: unreadMessages }]
      : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F5F5F5", color: "#0A0A0A", fontFamily: "Helvetica, Arial, sans-serif", paddingTop: "64px" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: "24px", right: "24px", zIndex: 9999,
          display: "flex", alignItems: "center", gap: "10px",
          padding: "12px 20px",
          background: "#FFFFFF",
          border: `1px solid ${toast.type === "error" ? "rgba(227,0,0,0.30)" : "#E5E5E5"}`,
          borderRadius: "12px",
          animation: "toastIn 0.3s cubic-bezier(0.16,1,0.3,1) both",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}>
          <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: toast.type === "success" ? "#E30000" : toast.type === "error" ? "#E30000" : "#666666", fontWeight: 400 }}>
            {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "●"}
          </span>
          <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "13px", fontWeight: 500, color: "#0A0A0A" }}>{toast.msg}</span>
        </div>
      )}

      {/* Nav */}
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "#0A0A0A" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 32px", height: "64px", display: "flex", alignItems: "center", gap: "24px" }}>

          {/* Logo */}
          <a href="/" style={{ flexShrink: 0, textDecoration: "none", display: "flex", alignItems: "center", gap: "20px" }}>
            <span style={{
              fontFamily: "var(--font-raleway), sans-serif",
              fontSize: "18px", fontWeight: 200,
              color: "#FFFFFF", letterSpacing: "0.1em", whiteSpace: "nowrap",
            }}>
              LINKWRIGHT
            </span>
          </a>

          {/* Agency client switcher */}
          {session.role === "agency" && clients.length > 1 && (
            <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
              {clients.slice(0, 5).map(c => (
                <button key={c.id} onClick={() => handleClientSwitch(c)}
                  style={{ padding: "5px 12px", borderRadius: "999px", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", fontWeight: 500, background: client.id === c.id ? "#E30000" : "transparent", border: "none", color: client.id === c.id ? "#FFFFFF" : "#999999", cursor: "pointer", transition: "all 0.15s ease" }}>
                  {c.name.split(" ")[0]}
                </button>
              ))}
            </div>
          )}

          {/* Tabs */}
          <nav style={{ display: "flex", gap: "0px", flex: 1, justifyContent: "center" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ position: "relative", padding: "8px 18px", background: "transparent", border: "none", borderBottom: tab === t.id ? "2px solid #E30000" : "2px solid transparent", fontSize: "13px", fontWeight: 400, letterSpacing: "0.04em", color: tab === t.id ? "#FFFFFF" : "#999999", cursor: "pointer", transition: "all 0.15s ease", fontFamily: "Helvetica, Arial, sans-serif", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "-1px" }}>
                {t.label}
                {t.badge && t.badge > 0 ? (
                  <span style={{ minWidth: "16px", height: "16px", borderRadius: "999px", background: "#E30000", color: "#FFFFFF", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "9px", fontWeight: 400, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {t.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          {/* Right: company name + sign out */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
            <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "13px", fontWeight: 500, color: "#999999", whiteSpace: "nowrap" }}>{client.name}</span>
            <button onClick={handleSignOut} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px 16px", background: "transparent", border: "1px solid #FFFFFF", borderRadius: "999px", color: "#FFFFFF", cursor: "pointer", fontFamily: "var(--font-raleway), sans-serif", fontWeight: 400, fontSize: "13px", transition: "all 0.15s ease" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FFFFFF"; (e.currentTarget as HTMLElement).style.color = "#0A0A0A"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#FFFFFF"; }}
              title="Sign out">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Banner */}
      <div style={{ position: "relative", height: "240px", overflow: "hidden", background: "#0A0A0A", borderBottom: "1px solid #E5E5E5" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/1.png" alt="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/red-circle.png" alt="" aria-hidden="true" style={{ position: "absolute", top: "-100px", right: "-90px", width: "340px", height: "340px", opacity: 0.6, mixBlendMode: "screen", pointerEvents: "none" }} />
        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 48px" }}>
          <div style={{ width: "28px", height: "2px", background: "#E30000", marginBottom: "20px" }} />
          <p style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "clamp(22px, 3vw, 42px)", fontWeight: 400, fontStyle: "normal", color: "#FFFFFF", lineHeight: 1.2, maxWidth: "600px", letterSpacing: "-0.01em", margin: 0 }}>
            {client.name}
          </p>
          {client.tagline && (
            <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.7)", marginTop: "10px", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 400 }}>{client.tagline}</p>
          )}
          <div style={{ width: "28px", height: "2px", background: "#E30000", marginTop: "20px" }} />
        </div>
      </div>

      {/* Main */}
      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "36px 32px 80px" }}>
        {tab === "dashboard" && (
          <DashboardTab client={client} pendingPosts={pendingPosts} postedPosts={postedPosts} accentColor={accentColor} onNavigate={setTab} />
        )}
        {tab === "approval" && (
          <ApprovalTab client={client} pendingPosts={pendingPosts} accentColor={accentColor} onRefresh={handleRefresh} onToast={notify} />
        )}
        {tab === "history" && (
          <HistoryTab postedPosts={historyPosts} analytics={analytics} accentColor={accentColor} />
        )}
        {tab === "reports" && (
          <ReportsTab client={client} accentColor={accentColor} />
        )}
        {tab === "library" && (
          <LibraryTab
            client={client}
            canManage={session.role === "agency" || session.clientRole === "owner" || session.clientRole === "administrator"}
            accentColor={accentColor}
            onToast={notify}
          />
        )}
        {tab === "team" && (session.clientRole === "owner" || session.clientRole === "administrator") && (
          <TeamTab myRole={session.clientRole} accentColor={accentColor} onToast={notify} />
        )}
        {tab === "messages" && (
          <MessagesTab accentColor={accentColor} onViewed={() => setUnreadMessages(0)} />
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(20px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @media print {
          header { display: none !important; }
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>
    </div>
  );
}
