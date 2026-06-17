"use client";

import { useState } from "react";
import Link from "next/link";

const RED = "#E30000";
const BLACK = "#0A0A0A";
const WHITE = "#FFFFFF";
const BORDER = "#E5E5E5";
const FONT = "Helvetica, Arial, sans-serif";
const DISPLAY = "var(--font-raleway), sans-serif";

export default function ClientLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState("");

  const input = (k: string): React.CSSProperties => ({
    width: "100%",
    background: WHITE,
    border: `1px solid ${focus === k ? BLACK : BORDER}`,
    borderRadius: 10,
    padding: "14px 16px",
    fontFamily: FONT,
    fontSize: 15,
    color: BLACK,
    outline: "none",
    boxSizing: "border-box",
  });

  const submit = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/client/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.mustReset && data.token) {
        window.location.href = `/client/set-password?token=${data.token}`;
        return;
      }
      if (!res.ok || !data.success) throw new Error(data.error || "Could not sign in.");
      window.location.href = data.redirect || "/portal";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in.");
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: FONT, background: WHITE }}>
      {/* Left: red hero panel (matches the homepage hero) */}
      <div
        className="login-hero"
        style={{ flex: 1, background: RED, display: "none", position: "relative", overflow: "hidden", padding: 48 }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(#C40000 1.5px, transparent 1.5px)",
            backgroundSize: "20px 20px",
            opacity: 0.5,
          }}
        />
        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div>
            <h1
              style={{
                fontFamily: DISPLAY,
                fontWeight: 100,
                fontSize: "clamp(34px, 5vw, 64px)",
                letterSpacing: "0.08em",
                color: WHITE,
                lineHeight: 1,
                margin: 0,
                whiteSpace: "nowrap",
              }}
            >
              LINKWRIGHT
            </h1>
            <p style={{ fontFamily: FONT, fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 20, letterSpacing: "0.04em" }}>
              Your content, reports, and team. In one place.
            </p>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32, position: "relative" }}>
        <a href="/" style={{ position: "fixed", top: 20, left: 24, fontFamily: FONT, fontSize: 13, color: "#666666", textDecoration: "none" }}>
          ← Back to main site
        </a>

        <div style={{ width: "100%", maxWidth: 400 }}>
          <img
            src="/linkwright-logo-white.png"
            alt="Linkwright"
            style={{ height: 26, width: "auto", display: "block", filter: "brightness(0)", marginBottom: 36 }}
          />

          <span style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: RED }}>
            ( Client )
          </span>
          <h2 style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: 28, color: BLACK, margin: "12px 0 6px" }}>Sign In</h2>
          <p style={{ fontFamily: FONT, fontSize: 14, color: "#666666", margin: "0 0 28px" }}>Access your portal to review content and reports.</p>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: FONT, fontSize: 14, color: BLACK, marginBottom: 8 }}>Email</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocus("email")}
              onBlur={() => setFocus("")}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="you@company.com"
              style={input("email")}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: FONT, fontSize: 14, color: BLACK, marginBottom: 8 }}>Password</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocus("password")}
              onBlur={() => setFocus("")}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Your password"
              style={input("password")}
            />
          </div>

          {error && <p style={{ fontFamily: FONT, fontSize: 14, color: RED, margin: "0 0 18px" }}>{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={busy}
            style={{
              width: "100%",
              background: BLACK,
              color: WHITE,
              fontFamily: FONT,
              fontWeight: 400,
              fontSize: 15,
              border: "none",
              borderRadius: 999,
              padding: "15px 0",
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "Signing in..." : "Sign In"}
          </button>

          <div style={{ marginTop: 18 }}>
            <Link href="/client/forgot-password" style={{ fontFamily: FONT, fontSize: 13, color: "#666666", textDecoration: "none" }}>
              Forgot password
            </Link>
          </div>
        </div>
      </div>

      <style>{`@media (min-width: 900px) { .login-hero { display: block !important; } }`}</style>
    </div>
  );
}
