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
        router.push(data.role === "agency" ? "/" : "/portal");
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

      {/* ── Left panel — editorial image ──────────────────────────────────── */}
      <div style={{
        flex: "1 1 0",
        position: "relative",
        display: "none",
        overflow: "hidden",
      }} className="portal-login-left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1600&q=80&auto=format&fit=crop"
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            filter: "grayscale(15%) contrast(1.05)",
          }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, rgba(245,242,238,0.10) 0%, rgba(26,26,26,0.60) 100%)",
        }} />
        <div style={{
          position: "absolute", bottom: "48px", left: "48px", right: "48px",
          color: "#F5F2EE",
        }}>
          <div style={{ width: "28px", height: "1px", background: "#C9A84C", marginBottom: "14px" }} />
          <div style={{
            fontFamily: "var(--font-playfair, var(--font-cormorant, Georgia, serif))",
            fontSize: "26px", fontWeight: 400, fontStyle: "italic",
            letterSpacing: "-0.02em", lineHeight: 1.25, marginBottom: "8px",
          }}>
            Your content, reviewed and approved.
          </div>
          <div style={{ fontSize: "12px", color: "rgba(245,242,238,0.50)", letterSpacing: "0.06em" }}>
            Linkwright Studios · Client Portal
          </div>
        </div>
      </div>

      {/* ── Right panel — login form ────────────────────────────────────────── */}
      <div style={{
        width: "100%",
        maxWidth: "480px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 40px",
        background: "#F5F2EE",
        position: "relative",
      }}>

        {/* Gold top accent */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: "2px",
          background: "linear-gradient(90deg, #C9A84C 0%, transparent 100%)",
        }} />

        <div style={{ width: "100%", maxWidth: "360px", animation: "fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both" }}>

          {/* Wordmark */}
          <div style={{ marginBottom: "52px" }}>
            <div style={{
              fontFamily: "var(--font-playfair, var(--font-cormorant, Georgia, serif))",
              fontSize: "30px", fontWeight: 400, fontStyle: "italic",
              letterSpacing: "-0.02em", color: "#1A1A1A",
              marginBottom: "8px", lineHeight: 1,
            }}>
              Client Portal
            </div>
            <div style={{ width: "28px", height: "1px", background: "#C9A84C", marginBottom: "10px" }} />
            <div style={{
              fontSize: "11px", color: "rgba(26,26,26,0.40)",
              letterSpacing: "0.14em", textTransform: "uppercase",
              fontFamily: "var(--font-inter, system-ui, sans-serif)",
            }}>
              Linkwright Studios
            </div>
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
            marginTop: "40px",
            paddingTop: "24px",
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
