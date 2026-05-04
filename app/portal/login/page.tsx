"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function PortalLoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push("/portal");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Invalid credentials. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F5F2EE", display: "flex", alignItems: "stretch" }}>

      {/* Back to main site */}
      <a href="/landing" style={{
        position: "fixed", top: "20px", left: "24px", zIndex: 100,
        fontSize: "12px", fontWeight: 500,
        color: "rgba(26,26,26,0.45)",
        textDecoration: "none",
        display: "inline-flex", alignItems: "center", gap: "6px",
        fontFamily: "var(--font-dm-sans, system-ui, sans-serif)",
        transition: "color 0.15s ease",
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#1A1A1A"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(26,26,26,0.45)"; }}
      >
        ← Back to main site
      </a>

      {/* ── Left panel — editorial image ──────────────────────────────────── */}
      <div style={{
        flex: "1 1 0",
        position: "relative",
        display: "none",
        overflow: "hidden",
      }} className="portal-login-left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/about.png"
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            filter: "brightness(1.05) contrast(1.05) saturate(0.65)",
          }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, rgba(245,242,238,0.50) 0%, rgba(245,242,238,0.30) 100%)",
        }} />
        <div style={{
          position: "absolute", bottom: "48px", left: "48px", right: "48px",
          color: "#1A1814",
        }}>
          <div style={{ width: "28px", height: "1px", background: "#C9A84C", marginBottom: "14px" }} />
          <div style={{
            fontFamily: "var(--font-playfair, var(--font-cormorant, Georgia, serif))",
            fontSize: "26px", fontWeight: 400, fontStyle: "italic",
            letterSpacing: "-0.02em", lineHeight: 1.25, marginBottom: "8px",
          }}>
            Your content, reviewed and approved.
          </div>
          <div style={{ fontSize: "12px", color: "rgba(26,24,20,0.45)", letterSpacing: "0.06em" }}>
            Linkwright Studios · Client Portal
          </div>
        </div>
      </div>

      {/* ── Right panel — login form ────────────────────────────────────────── */}
      <div style={{
        width: "100%",
        maxWidth: "700px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 40px",
        background: "#F5F2EE",
        position: "relative",
      }}>

        {/* Gold top accent */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: "2px",
          background: "linear-gradient(90deg, #C9A84C 0%, transparent 100%)",
        }} />

        <div style={{ width: "100%", maxWidth: "640px", textAlign: "center", animation: "fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both" }}>

          {/* Wordmark */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{
              fontFamily: "var(--font-playfair, var(--font-cormorant, Georgia, serif))",
              fontSize: "26px", fontWeight: 400, fontStyle: "italic",
              letterSpacing: "-0.02em", color: "#1A1A1A",
              marginBottom: "6px", lineHeight: 1,
            }}>
              Client Portal
            </div>
            <div style={{ width: "28px", height: "1px", background: "#C9A84C", marginBottom: "10px", marginLeft: "auto", marginRight: "auto" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/linkwright-logo.png" alt="Linkwright" style={{ width: "300px", maxWidth: "100%", height: "auto", objectFit: "contain", opacity: 0.85, display: "block", marginLeft: "auto", marginRight: "auto" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            <div>
              <label style={{
                display: "block", fontSize: "10px", fontWeight: 500,
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: "rgba(26,26,26,0.45)", marginBottom: "8px",
                fontFamily: "var(--font-inter, system-ui, sans-serif)",
              }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@yourcompany.com"
                autoFocus
                required
                style={{
                  width: "100%",
                  background: "#FFFFFF",
                  border: "1px solid rgba(26,26,26,0.12)",
                  borderRadius: "5px",
                  padding: "12px 16px",
                  fontSize: "14px",
                  color: "#1A1A1A",
                  outline: "none",
                  fontFamily: "inherit",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.55)"}
                onBlur={e => e.target.style.borderColor = "rgba(26,26,26,0.12)"}
              />
            </div>

            <div>
              <label style={{
                display: "block", fontSize: "10px", fontWeight: 500,
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: "rgba(26,26,26,0.45)", marginBottom: "8px",
                fontFamily: "var(--font-inter, system-ui, sans-serif)",
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                style={{
                  width: "100%",
                  background: "#FFFFFF",
                  border: `1px solid ${error ? "rgba(204,51,51,0.40)" : "rgba(26,26,26,0.12)"}`,
                  borderRadius: "5px",
                  padding: "12px 16px",
                  fontSize: "14px",
                  color: "#1A1A1A",
                  outline: "none",
                  fontFamily: "inherit",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = error ? "rgba(204,51,51,0.60)" : "rgba(201,168,76,0.55)"}
                onBlur={e => e.target.style.borderColor = error ? "rgba(204,51,51,0.40)" : "rgba(26,26,26,0.12)"}
              />
            </div>

            {error && (
              <div style={{
                fontSize: "13px", color: "#cc3333",
                padding: "10px 14px",
                background: "rgba(204,51,51,0.06)",
                border: "1px solid rgba(204,51,51,0.18)",
                borderRadius: "5px",
                animation: "fadeUp 0.3s ease both",
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              style={{
                marginTop: "4px",
                padding: "13px 20px",
                background: loading || !email || !password ? "rgba(26,26,26,0.04)" : "#1A1A1A",
                border: `1px solid ${loading || !email || !password ? "rgba(26,26,26,0.10)" : "#1A1A1A"}`,
                borderRadius: "5px",
                fontSize: "12px", fontWeight: 500,
                letterSpacing: "0.10em", textTransform: "uppercase",
                color: loading || !email || !password ? "rgba(26,26,26,0.30)" : "#F5F2EE",
                cursor: loading || !email || !password ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                fontFamily: "var(--font-inter, system-ui, sans-serif)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}
              onMouseEnter={e => { if (!loading && email && password) (e.currentTarget as HTMLElement).style.background = "#2a2a2a"; }}
              onMouseLeave={e => { if (!loading && email && password) (e.currentTarget as HTMLElement).style.background = "#1A1A1A"; }}
            >
              {loading ? (
                <>
                  <span style={{ width: "13px", height: "13px", border: "1.5px solid rgba(245,242,238,0.25)", borderTopColor: "#F5F2EE", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block", flexShrink: 0 }} />
                  Signing in
                </>
              ) : "Sign in →"}
            </button>
          </form>

          {/* Footer */}
          <div style={{
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid rgba(26,26,26,0.08)",
            fontSize: "11px",
            color: "rgba(26,26,26,0.30)",
            letterSpacing: "0.06em",
            textAlign: "center",
            fontFamily: "var(--font-inter, system-ui, sans-serif)",
          }}>
            Powered by Linkwright Studios
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (min-width: 900px) {
          .portal-login-left { display: block !important; }
        }
      `}</style>
    </div>
  );
}
