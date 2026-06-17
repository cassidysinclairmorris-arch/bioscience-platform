"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────────
type ClientRole = "owner" | "administrator" | "user";
type UserSession = { role: "agency" | "client"; clientId: string | null; email: string; clientRole?: ClientRole; firstName?: string };
type TeamMember = { id: number; first_name: string; last_name: string; email: string; role: ClientRole; must_reset_password: number; last_login: string | null };
type Client = {
  id: string; name: string; tagline: string | null; color: string;
  logo_file: string | null;
  brand: { accent_color: string | null; dark_color: string | null; light_color: string | null; } | null;
};
type Post = {
  id: number; company_id: string; company_name: string; post_type: string;
  scheduled_day: string; content: string;
  status: "draft" | "pending_approval" | "approved" | "scheduled" | "posted";
  notes: string | null; image_url: string | null; week_number: number | null; created_at: string; updated_at: string;
};
type PostAnalytic = {
  id: number; post_id: number; impressions: number; engagement_rate: number;
  clicks: number; likes: number; comments: number; reposts: number; recorded_at: string;
};
type PortalTab = "dashboard" | "approval" | "history" | "reports" | "team" | "messages";

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
    <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", padding: "4px 12px", borderRadius: "999px", background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: "nowrap" }}>
      {status.replace("_", " ")}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
        <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#999999", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ display: "block", width: "24px", height: "1px", background: "#E30000", flexShrink: 0 }} />
          Client Portal
        </p>
        <h2 style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "clamp(26px, 2.5vw, 40px)", fontWeight: 700, fontStyle: "normal", lineHeight: 1.15, letterSpacing: "-0.01em", color: "#0A0A0A", marginBottom: "12px" }}>
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
            <button onClick={() => onNavigate("approval")} style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#E30000", background: "none", border: "none", cursor: "pointer", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "3px", transition: "all 0.15s ease" }}>
              Review →
            </button>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
        {statCards.map((s, i) => (
          <div key={i} style={glass({ padding: "24px", borderTop: `3px solid ${s.color}` })}>
            <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "13px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#999999", marginBottom: "12px" }}>{s.label}</div>
            <div style={{ fontSize: "32px", fontWeight: 700, fontFamily: "var(--font-raleway), sans-serif", color: s.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</div>
            {s.action && (
              <button onClick={s.action} style={{ marginTop: "10px", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: s.color, background: "none", border: "none", cursor: "pointer", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "3px", transition: "all 0.15s ease" }}>
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
            <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "20px", fontWeight: 700, fontStyle: "normal", letterSpacing: "-0.01em", color: "#0A0A0A" }}>Needs Your Review</div>
            <StatusPill status="pending_approval" />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {pendingPosts.slice(0, 3).map((p, i) => (
              <div key={p.id} style={{ padding: "16px 24px", borderBottom: i < Math.min(pendingPosts.length, 3) - 1 ? "1px solid #E5E5E5" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", fontWeight: 600, color: "#666666", textTransform: "uppercase", letterSpacing: "0.06em" }}>{p.post_type}</span>
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
              <button onClick={() => onNavigate("approval")} style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "13px", color: accentColor, background: "none", border: "none", cursor: "pointer", fontWeight: 600, transition: "all 0.15s ease" }}>
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
        <div style={{ fontSize: "18px", fontWeight: 600, fontStyle: "normal", color: "#0A0A0A", marginBottom: "8px", fontFamily: "var(--font-raleway), sans-serif" }}>All caught up!</div>
        <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "14px", color: "#999999" }}>No posts are waiting for your approval right now.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "20px", fontWeight: 700, fontStyle: "normal", letterSpacing: "-0.01em", color: "#0A0A0A" }}>Approval Queue</div>
        <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", fontWeight: 600, padding: "4px 12px", background: "rgba(227,0,0,0.10)", border: "1px solid rgba(227,0,0,0.30)", color: "#E30000", borderRadius: "999px" }}>
          {pendingPosts.length} pending
        </span>
      </div>
      {pendingPosts.map(p => (
        <div key={p.id} style={glass({ overflow: "hidden" })}>
          {/* Header */}
          <div style={{ padding: "14px 24px", borderBottom: "1px solid #E5E5E5", display: "flex", alignItems: "center", gap: "10px", background: "#F5F5F5", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", fontWeight: 600, padding: "4px 12px", background: "rgba(227,0,0,0.10)", border: `1px solid rgba(227,0,0,0.30)`, color: accentColor, borderRadius: "999px", letterSpacing: "0.02em" }}>
              {p.post_type}
            </span>
            <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#666666" }}>{p.scheduled_day}</span>
            <span style={{ marginLeft: "auto", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#999999" }}>{formatDate(p.created_at)}</span>
          </div>

          {/* Content */}
          <div style={{ padding: "24px" }}>
            {p.image_url && (
              <div style={{ marginBottom: "16px", borderRadius: "8px", overflow: "hidden", border: "1px solid #E5E5E5" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url} alt="Post visual" style={{ width: "100%", maxHeight: "360px", objectFit: "cover", display: "block" }} />
              </div>
            )}
            <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "15px", lineHeight: 1.6, color: "#0A0A0A", whiteSpace: "pre-wrap" }}>{p.content}</p>
          </div>

          {/* Actions */}
          <div style={{ padding: "14px 24px", borderTop: "1px solid #E5E5E5", background: "#F5F5F5" }}>
            {requestingId === p.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999" }}>
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
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 18px", background: "#E30000", border: "1px solid #E30000", borderRadius: "8px", fontSize: "13px", fontWeight: 600, color: "#FFFFFF", cursor: !noteText[p.id]?.trim() || busy === p.id ? "not-allowed" : "pointer", opacity: !noteText[p.id]?.trim() || busy === p.id ? 0.5 : 1, fontFamily: "Helvetica, Arial, sans-serif", transition: "all 0.15s ease" }}
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
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 22px", background: accentColor, border: `1px solid ${accentColor}`, borderRadius: "8px", fontSize: "13px", fontWeight: 600, color: "#FFFFFF", cursor: busy === p.id ? "not-allowed" : "pointer", fontFamily: "Helvetica, Arial, sans-serif", transition: "all 0.15s ease" }}
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
        <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "18px", fontWeight: 600, color: "#0A0A0A", marginBottom: "8px" }}>No published posts yet</div>
        <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "14px", color: "#999999" }}>Your published posts will appear here once they go live.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "20px", fontWeight: 700, fontStyle: "normal", letterSpacing: "-0.01em", marginBottom: "8px", color: "#0A0A0A" }}>
        Post History
      </div>
      {postedPosts.map((p, i) => {
        const an = analytics[p.id];
        return (
          <div key={p.id} style={glass({ overflow: "hidden" })}>
            <div style={{ padding: "14px 24px", borderBottom: "1px solid #E5E5E5", display: "flex", alignItems: "center", gap: "10px", background: "#F5F5F5", flexWrap: "wrap" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#E30000", flexShrink: 0 }} />
              <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", fontWeight: 600, padding: "4px 12px", background: "rgba(227,0,0,0.10)", border: `1px solid rgba(227,0,0,0.30)`, color: accentColor, borderRadius: "999px", letterSpacing: "0.02em" }}>{p.post_type}</span>
              <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#666666" }}>{p.scheduled_day}</span>
              <StatusPill status="posted" />
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
                    <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "13px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#999999", marginBottom: "2px" }}>{m.label}</div>
                    <div style={{ fontSize: "32px", fontWeight: 700, color: "#0A0A0A", fontFamily: "var(--font-raleway), sans-serif" }}>{m.value}</div>
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
        <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "18px", fontWeight: 600, fontStyle: "normal", color: "#0A0A0A" }}>No published reports yet</div>
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
            <button key={r.id} onClick={() => setSelectedId(r.id)} style={{ padding: "7px 14px", borderRadius: "999px", border: `1px solid ${r.id === selectedId ? accentColor : "#E5E5E5"}`, background: r.id === selectedId ? "rgba(227,0,0,0.10)" : "#FFFFFF", color: r.id === selectedId ? accentColor : "#666666", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease" }}>
              {r.period_start.slice(0, 7)} {r.type === "weekly" ? "(weekly)" : ""}
            </button>
          ))}
        </div>
        {selectedReport && (
          <button onClick={handleExport} disabled={exporting} style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "9px 18px", background: accentColor, border: `1px solid ${accentColor}`, borderRadius: "8px", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "13px", fontWeight: 600, color: "#FFFFFF", cursor: "pointer", opacity: exporting ? 0.7 : 1, transition: "all 0.15s ease" }}>
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
              <div style={{ fontSize: "32px", fontWeight: 700, fontStyle: "normal", fontFamily: "var(--font-raleway), sans-serif", color: "#0A0A0A", letterSpacing: "-0.02em", marginBottom: "4px" }}>{client.name}</div>
              <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#666666" }}>{selectedReport.period_start} – {selectedReport.period_end}</div>
              {selectedReport.published_at && <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#999999", marginTop: "4px" }}>Published {new Date(selectedReport.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginBottom: "6px" }}>Prepared by</div>
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
                  <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "13px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#999999", marginBottom: "8px" }}>{k.label}</div>
                  <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "32px", fontWeight: 700, color: k.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{k.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Top posts */}
          {extracted?.posts && extracted.posts.length > 0 && (
            <div style={glass({ overflow: "hidden" })}>
              <div style={{ padding: "24px", borderBottom: "1px solid #E5E5E5" }}>
                <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "20px", fontWeight: 700, fontStyle: "normal", color: "#0A0A0A" }}>Top Posts This Period</div>
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
                        {p.engagementRate != null && <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: accentColor, fontWeight: 600 }}>{fmtPct(p.engagementRate)} engagement</span>}
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
              <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "20px", fontWeight: 700, fontStyle: "normal", marginBottom: "16px", color: "#0A0A0A" }}>Performance Summary</div>
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
  const th: React.CSSProperties = { textAlign: "left", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", fontWeight: 600, padding: "0 12px 10px" };
  const td: React.CSSProperties = { fontFamily: "Helvetica, Arial, sans-serif", fontSize: "14px", color: "#0A0A0A", padding: "12px", borderTop: "1px solid #E5E5E5", verticalAlign: "middle" };

  return (
    <div style={{ maxWidth: "980px", margin: "0 auto" }}>
      <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "20px", fontWeight: 700, fontStyle: "normal", marginBottom: "6px", color: "#0A0A0A" }}>Team</div>
      <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "14px", color: "#666666", marginBottom: "24px" }}>
        Manage administrators and users for your company.
      </p>

      {/* Add form */}
      <div style={glass({ padding: "24px" })}>
        <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#666666", marginBottom: "16px" }}>
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
          style={{ padding: "11px 22px", background: accentColor, color: "#FFFFFF", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: "Helvetica, Arial, sans-serif", transition: "all 0.15s ease" }}>
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
                          style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: accentColor, background: "none", border: "none", cursor: "pointer", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "3px", padding: 0, transition: "all 0.15s ease" }}>
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
                            style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: "#E30000", background: "none", border: "none", cursor: "pointer", fontWeight: 600, transition: "all 0.15s ease" }}>
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
      <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "20px", fontWeight: 700, fontStyle: "normal", marginBottom: "6px", color: "#0A0A0A" }}>Messages</div>
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
                <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: m.sender === "client" ? "#E30000" : "#999999", marginBottom: "4px", fontWeight: 600 }}>
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
          style={{ padding: "0 22px", background: accentColor, color: "#FFFFFF", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: sending || !text.trim() ? "default" : "pointer", opacity: sending || !text.trim() ? 0.55 : 1, fontFamily: "Helvetica, Arial, sans-serif", transition: "all 0.15s ease" }}>
          Send
        </button>
      </div>
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
    const [pendingRes, postedRes] = await Promise.all([
      fetch(`/api/posts?company_id=${clientId}&status=pending_approval`),
      fetch(`/api/posts?company_id=${clientId}&status=posted`),
    ]);
    const [pendingData, postedData] = await Promise.all([pendingRes.json(), postedRes.json()]);
    setPendingPosts(pendingData.posts || []);
    setPostedPosts(postedData.posts || []);

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
          <span style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "12px", color: toast.type === "success" ? "#E30000" : toast.type === "error" ? "#E30000" : "#666666", fontWeight: 700 }}>
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
                  <span style={{ minWidth: "16px", height: "16px", borderRadius: "999px", background: "#E30000", color: "#FFFFFF", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "9px", fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
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
      <div style={{ position: "relative", height: "200px", overflow: "hidden", background: "#FFFFFF", borderBottom: "1px solid #E5E5E5" }}>
        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 48px" }}>
          <div style={{ width: "28px", height: "2px", background: accentColor, marginBottom: "20px" }} />
          <p style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: "clamp(22px, 3vw, 42px)", fontWeight: 700, fontStyle: "normal", color: "#0A0A0A", lineHeight: 1.2, maxWidth: "600px", letterSpacing: "-0.01em" }}>
            {client.name}
          </p>
          {client.tagline && (
            <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11px", color: "#999999", marginTop: "10px", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600 }}>{client.tagline}</p>
          )}
          <div style={{ width: "28px", height: "2px", background: accentColor, marginTop: "20px" }} />
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
          <HistoryTab postedPosts={postedPosts} analytics={analytics} accentColor={accentColor} />
        )}
        {tab === "reports" && (
          <ReportsTab client={client} accentColor={accentColor} />
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
