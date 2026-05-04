"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────────
type UserSession = { role: "agency" | "client"; clientId: string | null; email: string };
type Client = {
  id: string; name: string; tagline: string | null; color: string;
  logo_file: string | null;
  brand: { accent_color: string | null; dark_color: string | null; light_color: string | null; } | null;
};
type Post = {
  id: number; company_id: string; company_name: string; post_type: string;
  scheduled_day: string; content: string;
  status: "draft" | "pending_approval" | "approved" | "scheduled" | "posted";
  notes: string | null; week_number: number | null; created_at: string; updated_at: string;
};
type PostAnalytic = {
  id: number; post_id: number; impressions: number; engagement_rate: number;
  clicks: number; likes: number; comments: number; reposts: number; recorded_at: string;
};
type PortalTab = "dashboard" | "approval" | "history" | "reports";

// ── Helpers ───────────────────────────────────────────────────────────────────
function glass(extra?: React.CSSProperties): React.CSSProperties {
  return { background: "#FFFFFF", border: "1px solid rgba(26,26,26,0.08)", borderRadius: "12px", ...extra };
}

function Spinner() {
  return <span style={{ width: "14px", height: "14px", border: "1.5px solid rgba(26,26,26,0.14)", borderTopColor: "#1A1A1A", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block", flexShrink: 0 }} />;
}

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; border: string }> = {
    draft:            { bg: "rgba(26,26,26,0.04)",    color: "rgba(26,26,26,0.55)",    border: "rgba(26,26,26,0.12)"    },
    pending_approval: { bg: "rgba(201,168,76,0.08)",  color: "#9C7A2A",                border: "rgba(201,168,76,0.30)"  },
    approved:         { bg: "rgba(26,26,26,0.08)",   color: "#1A1A1A",                border: "rgba(26,26,26,0.25)"   },
    scheduled:        { bg: "rgba(26,26,26,0.08)",  color: "#1A1A1A",                border: "rgba(26,26,26,0.25)"  },
    posted:           { bg: "rgba(201,168,76,0.08)",  color: "#8A8680",                border: "rgba(201,168,76,0.28)"  },
  };
  const s = cfg[status] ?? cfg.draft;
  return (
    <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 10px", borderRadius: "20px", background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: "nowrap" }}>
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
    { label: "Awaiting Your Approval", value: pendingPosts.length, color: "#C9A84C",  glow: "rgba(201,168,76,0.12)", action: pendingPosts.length > 0 ? () => onNavigate("approval") : undefined, actionLabel: "Review now →" },
    { label: "Published This Month",   value: publishedThisMonth,  color: "#1A1A1A",  glow: "rgba(26,26,26,0.04)",   action: () => onNavigate("history"),  actionLabel: "View history →" },
    { label: "Total Published",        value: postedPosts.length,  color: "#C9A84C",  glow: "rgba(201,168,76,0.08)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Welcome */}
      <div style={glass({ padding: "40px 44px", borderTop: "3px solid #C9A84C" })}>
        <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(26,26,26,0.40)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ display: "block", width: "24px", height: "0.5px", background: "#C9A84C", flexShrink: 0 }} />
          Client Portal
        </p>
        <h2 style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "clamp(26px, 2.5vw, 40px)", fontWeight: 300, fontStyle: "italic", lineHeight: 1.15, letterSpacing: "-0.01em", color: "#1A1A1A", marginBottom: "12px" }}>
          Welcome back, {client.name}
        </h2>
        {client.tagline && (
          <p style={{ fontSize: "14px", fontWeight: 300, color: "rgba(26,26,26,0.50)", lineHeight: 1.7 }}>{client.tagline}</p>
        )}
        {pendingPosts.length > 0 && (
          <div style={{ marginTop: "24px", display: "inline-flex", alignItems: "center", gap: "10px", padding: "10px 18px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.30)", borderRadius: "8px" }}>
            <span style={{ fontSize: "13px", color: "#9C7A2A", fontWeight: 500 }}>
              {pendingPosts.length} post{pendingPosts.length !== 1 ? "s" : ""} awaiting your approval
            </span>
            <button onClick={() => onNavigate("approval")} style={{ fontSize: "12px", color: "#9C7A2A", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "3px" }}>
              Review →
            </button>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
        {statCards.map((s, i) => (
          <div key={i} style={glass({ padding: "24px 28px", borderTop: `3px solid ${s.color}`, background: `linear-gradient(135deg, rgba(26,26,26,0.02), ${s.glow})` })}>
            <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(26,26,26,0.45)", marginBottom: "12px" }}>{s.label}</div>
            <div style={{ fontSize: "54px", fontWeight: 300, fontFamily: "var(--font-cormorant, Georgia, serif)", color: s.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</div>
            {s.action && (
              <button onClick={s.action} style={{ marginTop: "10px", fontSize: "12px", color: s.color, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "3px", opacity: 0.8 }}>
                {s.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Recent pending posts preview */}
      {pendingPosts.length > 0 && (
        <div style={glass({ padding: "0", overflow: "hidden" })}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(26,26,26,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "24px", fontWeight: 300, fontStyle: "italic", letterSpacing: "-0.01em" }}>Needs Your Review</div>
            <StatusPill status="pending_approval" />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {pendingPosts.slice(0, 3).map((p, i) => (
              <div key={p.id} style={{ padding: "16px 24px", borderBottom: i < Math.min(pendingPosts.length, 3) - 1 ? "1px solid rgba(26,26,26,0.06)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "rgba(26,26,26,0.55)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{p.post_type}</span>
                  <span style={{ color: "rgba(26,26,26,0.20)" }}>·</span>
                  <span style={{ fontSize: "11px", color: "rgba(26,26,26,0.40)" }}>{p.scheduled_day}</span>
                  <span style={{ fontSize: "11px", color: "rgba(26,26,26,0.35)", marginLeft: "auto" }}>{formatDate(p.created_at)}</span>
                </div>
                <p style={{ fontSize: "13px", color: "rgba(26,26,26,0.65)", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {p.content}
                </p>
              </div>
            ))}
          </div>
          {pendingPosts.length > 3 && (
            <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(26,26,26,0.06)", textAlign: "center" }}>
              <button onClick={() => onNavigate("approval")} style={{ fontSize: "13px", color: accentColor, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
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
        <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.22)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ fontSize: "30px", fontWeight: 300, fontStyle: "italic", color: "#1A1A1A", marginBottom: "8px", fontFamily: "var(--font-cormorant, Georgia, serif)" }}>All caught up!</div>
        <p style={{ fontSize: "14px", color: "rgba(26,26,26,0.40)" }}>No posts are waiting for your approval right now.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        <div style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "32px", fontWeight: 300, fontStyle: "italic", letterSpacing: "-0.02em" }}>Approval Queue</div>
        <span style={{ fontSize: "12px", fontWeight: 600, padding: "3px 10px", background: "rgba(201,168,76,0.10)", border: "1px solid rgba(201,168,76,0.30)", color: "#9C7A2A", borderRadius: "20px" }}>
          {pendingPosts.length} pending
        </span>
      </div>
      {pendingPosts.map(p => (
        <div key={p.id} style={glass({ overflow: "hidden", border: `1px solid ${accentColor}20` })}>
          {/* Header */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(26,26,26,0.07)", display: "flex", alignItems: "center", gap: "10px", background: "rgba(26,26,26,0.02)", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", background: `${accentColor}18`, border: `1px solid ${accentColor}40`, color: accentColor, borderRadius: "8px", letterSpacing: "0.02em" }}>
              {p.post_type}
            </span>
            <span style={{ fontSize: "12px", color: "rgba(26,26,26,0.50)" }}>{p.scheduled_day}</span>
            <span style={{ marginLeft: "auto", fontSize: "11px", color: "rgba(26,26,26,0.35)" }}>{formatDate(p.created_at)}</span>
          </div>

          {/* Content */}
          <div style={{ padding: "20px 24px" }}>
            <p style={{ fontSize: "14px", lineHeight: 1.8, color: "rgba(26,26,26,0.85)", whiteSpace: "pre-wrap" }}>{p.content}</p>
          </div>

          {/* Actions */}
          <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(26,26,26,0.07)", background: "rgba(26,26,26,0.01)" }}>
            {requestingId === p.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.45)" }}>
                  Describe what you&apos;d like changed
                </label>
                <textarea
                  value={noteText[p.id] || ""}
                  onChange={e => setNoteText(prev => ({ ...prev, [p.id]: e.target.value }))}
                  rows={3}
                  placeholder="e.g. Please make the tone more technical, and add a reference to our FDA approval timeline…"
                  style={{ width: "100%", background: "#FFFFFF", border: "1px solid rgba(26,26,26,0.12)", borderRadius: "10px", padding: "11px 14px", fontSize: "14px", color: "#1A1A1A", outline: "none", fontFamily: "inherit", lineHeight: 1.6, resize: "none", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = "rgba(204,51,51,0.40)"}
                  onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
                  autoFocus
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => requestChanges(p)}
                    disabled={!noteText[p.id]?.trim() || busy === p.id}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 18px", background: "rgba(204,51,51,0.08)", border: "1px solid rgba(204,51,51,0.25)", borderRadius: "10px", fontSize: "13px", fontWeight: 600, color: "#cc3333", cursor: !noteText[p.id]?.trim() || busy === p.id ? "not-allowed" : "pointer", opacity: !noteText[p.id]?.trim() || busy === p.id ? 0.5 : 1, fontFamily: "inherit" }}
                  >
                    {busy === p.id ? <Spinner /> : null}
                    Submit request
                  </button>
                  <button onClick={() => setRequestingId(null)} style={{ padding: "9px 18px", background: "transparent", border: "1px solid rgba(26,26,26,0.12)", borderRadius: "10px", fontSize: "13px", color: "rgba(26,26,26,0.55)", cursor: "pointer", fontFamily: "inherit" }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  onClick={() => approve(p)}
                  disabled={busy === p.id}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 22px", background: `${accentColor}20`, border: `1px solid ${accentColor}50`, borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: accentColor, cursor: busy === p.id ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.15s ease" }}
                  onMouseEnter={e => { if (busy !== p.id) (e.currentTarget as HTMLElement).style.background = `${accentColor}30`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${accentColor}20`; }}
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
                  style={{ padding: "9px 18px", background: "rgba(26,26,26,0.04)", border: "1px solid rgba(26,26,26,0.12)", borderRadius: "10px", fontSize: "13px", fontWeight: 500, color: "rgba(26,26,26,0.65)", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(26,26,26,0.08)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(26,26,26,0.04)"; }}
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
        <div style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.15 }}>📋</div>
        <p style={{ fontSize: "14px", color: "rgba(26,26,26,0.35)" }}>No published posts yet.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "32px", fontWeight: 300, fontStyle: "italic", letterSpacing: "-0.02em", marginBottom: "8px" }}>
        Post History
      </div>
      {postedPosts.map((p, i) => {
        const an = analytics[p.id];
        return (
          <div key={p.id} style={glass({ overflow: "hidden" })}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(26,26,26,0.07)", display: "flex", alignItems: "center", gap: "10px", background: "rgba(26,26,26,0.02)", flexWrap: "wrap" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#C9A84C", flexShrink: 0 }} />
              <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", background: `${accentColor}18`, border: `1px solid ${accentColor}30`, color: accentColor, borderRadius: "6px", letterSpacing: "0.02em" }}>{p.post_type}</span>
              <span style={{ fontSize: "12px", color: "rgba(26,26,26,0.45)" }}>{p.scheduled_day}</span>
              <StatusPill status="posted" />
              <span style={{ marginLeft: "auto", fontSize: "11px", color: "rgba(26,26,26,0.35)" }}>{formatDate(p.updated_at)}</span>
            </div>
            <div style={{ padding: "18px 24px" }}>
              <p style={{ fontSize: "14px", lineHeight: 1.75, color: "rgba(26,26,26,0.75)", whiteSpace: "pre-wrap", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {p.content}
              </p>
            </div>
            {an && (
              <div style={{ padding: "12px 24px", borderTop: "1px solid rgba(26,26,26,0.06)", display: "flex", gap: "24px", flexWrap: "wrap" }}>
                {[
                  { label: "Impressions",  value: an.impressions.toLocaleString() },
                  { label: "Engagement",   value: `${an.engagement_rate.toFixed(1)}%` },
                  { label: "Clicks",       value: an.clicks.toLocaleString() },
                  { label: "Likes",        value: an.likes.toLocaleString() },
                  { label: "Comments",     value: an.comments.toLocaleString() },
                  { label: "Reposts",      value: an.reposts.toLocaleString() },
                ].map(m => (
                  <div key={m.label}>
                    <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.35)", marginBottom: "2px" }}>{m.label}</div>
                    <div style={{ fontSize: "22px", fontWeight: 300, color: accentColor, fontFamily: "var(--font-cormorant, Georgia, serif)" }}>{m.value}</div>
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
function ReportsTab({ client, postedPosts, pendingPosts, accentColor }: {
  client: Client; postedPosts: Post[]; pendingPosts: Post[]; accentColor: string;
}) {
  const now = new Date();
  const months = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (2 - i), 1);
    return { key: d.toISOString().slice(0, 7), label: d.toLocaleString("default", { month: "short", year: "numeric" }) };
  });

  const postsPerMonth = months.map(m => ({
    label: m.label,
    count: postedPosts.filter(p => p.updated_at.startsWith(m.key)).length,
  }));

  const maxCount = Math.max(...postsPerMonth.map(m => m.count), 1);

  const printReport = () => {
    window.print();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} id="portal-report">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "32px", fontWeight: 300, fontStyle: "italic", letterSpacing: "-0.02em" }}>
          LinkedIn Performance Report
        </div>
        <button
          onClick={printReport}
          style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "9px 18px", background: `${accentColor}18`, border: `1px solid ${accentColor}40`, borderRadius: "10px", fontSize: "13px", fontWeight: 600, color: accentColor, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${accentColor}28`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${accentColor}18`; }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 10v2h10v-2M7 2v7M4.5 6.5L7 9l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Export PDF
        </button>
      </div>

      {/* Brand header card */}
      <div style={{ background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}08)`, border: `1px solid ${accentColor}30`, borderRadius: "16px", padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "38px", fontWeight: 300, fontStyle: "italic", fontFamily: "var(--font-cormorant, Georgia, serif)", color: "#1A1A1A", letterSpacing: "-0.02em", marginBottom: "4px" }}>{client.name}</div>
          {client.tagline && <div style={{ fontSize: "13px", color: "rgba(26,26,26,0.50)" }}>{client.tagline}</div>}
          <div style={{ fontSize: "11px", color: "rgba(26,26,26,0.35)", marginTop: "8px" }}>
            Report generated {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(26,26,26,0.40)", marginBottom: "8px" }}>Powered by</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/linkwright-logo.png" alt="Linkwright" style={{ height: "24px", objectFit: "contain" }} />
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {[
          { label: "Total Published",    value: postedPosts.length,  color: "#1A1A1A" },
          { label: "Pending Approval",   value: pendingPosts.length, color: "#C9A84C" },
          { label: "Published This Month", value: postsPerMonth[postsPerMonth.length - 1]?.count || 0, color: "#C9A84C" },
          { label: "Avg Posts / Month",  value: Math.round(postedPosts.length / Math.max(months.length, 1)), color: "#1A1A1A" },
        ].map((s, i) => (
          <div key={i} style={glass({ padding: "20px 24px", borderTop: `2px solid ${s.color}` })}>
            <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(26,26,26,0.40)", marginBottom: "10px" }}>{s.label}</div>
            <div style={{ fontSize: "48px", fontWeight: 300, fontFamily: "var(--font-cormorant, Georgia, serif)", color: s.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Posts per month bar chart */}
      <div style={glass({ padding: "24px" })}>
        <div style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "24px", fontWeight: 300, fontStyle: "italic", letterSpacing: "-0.01em", marginBottom: "20px" }}>Posts Published by Month</div>
        <div style={{ display: "flex", gap: "24px", alignItems: "flex-end", height: "120px" }}>
          {postsPerMonth.map(m => (
            <div key={m.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: accentColor }}>{m.count}</div>
              <div style={{ width: "100%", height: `${(m.count / maxCount) * 80}px`, minHeight: "4px", background: `linear-gradient(180deg, ${accentColor}, ${accentColor}60)`, borderRadius: "6px 6px 0 0", transition: "height 0.3s ease" }} />
              <div style={{ fontSize: "11px", color: "rgba(26,26,26,0.45)", fontWeight: 500 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent posts table */}
      {postedPosts.length > 0 && (
        <div style={glass({ overflow: "hidden" })}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(26,26,26,0.08)" }}>
            <div style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "24px", fontWeight: 300, fontStyle: "italic", letterSpacing: "-0.01em" }}>Recent Posts</div>
          </div>
          <div>
            {postedPosts.slice(0, 8).map((p, i) => (
              <div key={p.id} style={{ padding: "14px 24px", borderBottom: i < Math.min(postedPosts.length, 8) - 1 ? "1px solid rgba(26,26,26,0.06)" : "none", display: "flex", alignItems: "flex-start", gap: "14px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: accentColor, marginTop: "6px", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "13px", color: "rgba(26,26,26,0.75)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: "4px" }}>
                    {p.content}
                  </p>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <span style={{ fontSize: "11px", color: "rgba(26,26,26,0.40)" }}>{p.post_type}</span>
                    <span style={{ fontSize: "11px", color: "rgba(26,26,26,0.35)" }}>{formatDate(p.updated_at)}</span>
                  </div>
                </div>
                <StatusPill status="posted" />
              </div>
            ))}
          </div>
        </div>
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
  const [analytics, setAnalytics]   = useState<Record<number, PostAnalytic>>({});
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
      .then(r => { if (!r.ok) { router.push("/portal/login"); return null; } return r.json(); })
      .then(data => {
        if (!data) return;
        // Agency users (admin@gorlin.com) get full access; clients must have a clientId
        if (!data.email || (data.role !== "agency" && !data.clientId)) {
          router.push("/portal/login"); return;
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

  const handleClientSwitch = (c: Client) => {
    setClient(c);
    fetchPosts(c.id);
  };

  const handleRefresh = () => {
    if (client) fetchPosts(client.id);
  };

  if (loading || !session) {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F2EE", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", color: "rgba(26,26,26,0.50)", fontSize: "14px" }}>
        <Spinner /> Loading…
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F2EE", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(26,26,26,0.50)", fontSize: "14px", flexDirection: "column", gap: "12px" }}>
        <p>No client account linked to your profile.</p>
        <a href="/portal/login" style={{ color: "#1A1A1A", fontSize: "13px" }}>Back to login</a>
      </div>
    );
  }

  // Six muted, warm-toned accents — all drawn from the same earthy editorial family as the landing page
  const PALETTE = [
    "#C9A84C", // gold (site primary)
    "#8B6F4E", // caramel bronze
    "#7A8B6A", // sage
    "#9B8070", // warm terracotta
    "#8A8096", // muted lavender-gray
    "#6B7A88", // cool slate
  ];
  const paletteIndex = client.id.split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffff, 0) % PALETTE.length;
  const accentColor = PALETTE[paletteIndex];

  const TABS: { id: PortalTab; label: string; badge?: number }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "approval",  label: "Approval Queue", badge: pendingPosts.length },
    { id: "history",   label: "Post History" },
    { id: "reports",   label: "Reports" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F5F2EE", color: "#1A1A1A", fontFamily: "var(--font-dm-sans, system-ui, sans-serif)", paddingTop: "64px" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: "24px", right: "24px", zIndex: 9999,
          display: "flex", alignItems: "center", gap: "10px",
          padding: "12px 20px",
          background: "#FFFFFF",
          border: `1px solid ${toast.type === "success" ? "rgba(201,168,76,0.30)" : toast.type === "error" ? "rgba(204,51,51,0.25)" : "rgba(26,26,26,0.10)"}`,
          borderRadius: "12px",
          animation: "toastIn 0.3s cubic-bezier(0.16,1,0.3,1) both",
          boxShadow: "0 4px 24px rgba(26,26,26,0.10)",
        }}>
          <span style={{ fontSize: "12px", color: toast.type === "success" ? "#8A8680" : toast.type === "error" ? "#cc3333" : "rgba(26,26,26,0.55)", fontWeight: 700 }}>
            {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "✦"}
          </span>
          <span style={{ fontSize: "13px", fontWeight: 500, color: "#1A1A1A" }}>{toast.msg}</span>
        </div>
      )}

      {/* Nav */}
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "rgba(244,241,236,0.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "0.5px solid rgba(26,24,20,0.10)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 32px", height: "64px", display: "flex", alignItems: "center", gap: "24px" }}>

          {/* Logo + tagline */}
          <a href="/" style={{ flexShrink: 0, textDecoration: "none", display: "flex", alignItems: "center", gap: "20px" }}>
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

          {/* Agency client switcher */}
          {session.role === "agency" && clients.length > 1 && (
            <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
              {clients.slice(0, 5).map(c => (
                <button key={c.id} onClick={() => handleClientSwitch(c)}
                  style={{ padding: "5px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, background: client.id === c.id ? "rgba(26,26,26,0.08)" : "transparent", border: "none", color: client.id === c.id ? "#1A1A1A" : "rgba(26,26,26,0.45)", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease" }}>
                  {c.name.split(" ")[0]}
                </button>
              ))}
            </div>
          )}

          {/* Tabs */}
          <nav style={{ display: "flex", gap: "0px", flex: 1, justifyContent: "center" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ position: "relative", padding: "8px 18px", background: "transparent", border: "none", borderBottom: tab === t.id ? "1px solid #C9A84C" : "1px solid transparent", fontSize: "12px", fontWeight: 400, letterSpacing: "0.04em", color: tab === t.id ? "#1A1A1A" : "rgba(26,26,26,0.45)", cursor: "pointer", transition: "color 0.15s ease, border-color 0.15s ease", fontFamily: "var(--font-dm-sans, inherit)", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "-1px" }}>
                {t.label}
                {t.badge && t.badge > 0 ? (
                  <span style={{ minWidth: "16px", height: "16px", borderRadius: "8px", background: "rgba(201,168,76,0.15)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.30)", fontSize: "9px", fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {t.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          {/* Right: back to main site + sign out */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            <a href="/" style={{ fontSize: "12px", fontWeight: 500, color: "rgba(26,26,26,0.55)", textDecoration: "none", padding: "6px 14px", background: "transparent", border: "1px solid rgba(26,26,26,0.12)", borderRadius: "6px", transition: "all 0.15s ease", fontFamily: "var(--font-dm-sans, sans-serif)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,26,26,0.22)"; (e.currentTarget as HTMLElement).style.color = "#1A1A1A"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,26,26,0.12)"; (e.currentTarget as HTMLElement).style.color = "rgba(26,26,26,0.55)"; }}>
              ← Back to main site
            </a>
            <a href="/portal/login" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", background: "transparent", border: "1px solid rgba(26,26,26,0.12)", borderRadius: "6px", color: "rgba(26,26,26,0.45)", textDecoration: "none", fontSize: "14px", transition: "all 0.15s ease" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,26,26,0.22)"; (e.currentTarget as HTMLElement).style.color = "#1A1A1A"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,26,26,0.12)"; (e.currentTarget as HTMLElement).style.color = "rgba(26,26,26,0.45)"; }}
              title="Sign out">
              ↩
            </a>
          </div>
        </div>
        {/* Accent line */}
        <div style={{ height: "2px", background: `linear-gradient(90deg, transparent 0%, ${accentColor}80 30%, ${accentColor} 50%, ${accentColor}80 70%, transparent 100%)`, transition: "all 0.4s ease" }} />
      </header>

      {/* Banner — light services.png treatment, matching the landing page split section */}
      <div style={{ position: "relative", height: "200px", overflow: "hidden", background: "#EDE8E0" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/services.png"
          alt="" aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "brightness(1.05) contrast(1.05) saturate(0.6)" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(244,241,236,0.78) 0%, rgba(244,241,236,0.58) 100%)" }} />
        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 48px" }}>
          <div style={{ width: "28px", height: "1px", background: accentColor, marginBottom: "20px", opacity: 0.8 }} />
          <p style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "clamp(22px, 3vw, 42px)", fontWeight: 300, fontStyle: "italic", color: "#1A1814", lineHeight: 1.2, maxWidth: "600px", letterSpacing: "-0.01em" }}>
            {client.name}
          </p>
          {client.tagline && (
            <p style={{ fontSize: "11px", color: "rgba(26,24,20,0.50)", marginTop: "10px", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500 }}>{client.tagline}</p>
          )}
          <div style={{ width: "28px", height: "1px", background: accentColor, marginTop: "20px", opacity: 0.8 }} />
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
          <ReportsTab client={client} postedPosts={postedPosts} pendingPosts={pendingPosts} accentColor={accentColor} />
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
