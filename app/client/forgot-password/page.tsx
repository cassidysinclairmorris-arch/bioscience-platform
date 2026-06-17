"use client";

import { useState } from "react";
import Link from "next/link";

const BLACK = "#0A0A0A";
const WHITE = "#FFFFFF";
const BORDER = "#E5E5E5";
const FONT = "var(--font-raleway), sans-serif";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/client/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message || "If that email is registered, a reset link is on its way.");
      setSent(true);
    } catch {
      setMessage("If that email is registered, a reset link is on its way.");
      setSent(true);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F5F5F5",
        fontFamily: FONT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <Link href="/" style={{ display: "flex", justifyContent: "center", marginBottom: 36 }}>
          <img
            src="/linkwright-logo-white.png"
            alt="Linkwright"
            style={{ height: 30, width: "auto", filter: "brightness(0)" }}
          />
        </Link>

        <div style={{ background: WHITE, borderRadius: 16, padding: 40, border: `1px solid ${BORDER}` }}>
          {sent ? (
            <>
              <h1 style={{ fontFamily: FONT, fontWeight: 400, fontSize: 24, color: BLACK, margin: "0 0 10px" }}>
                Check your email
              </h1>
              <p style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.6, color: "#666666", margin: "0 0 24px" }}>
                {message}
              </p>
              <Link
                href="/client/login"
                style={{ fontFamily: FONT, fontSize: 13, color: "#666666", textDecoration: "none" }}
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <h1 style={{ fontFamily: FONT, fontWeight: 400, fontSize: 24, color: BLACK, margin: "0 0 6px" }}>
                Forgot password
              </h1>
              <p style={{ fontFamily: FONT, fontSize: 14, color: "#666666", margin: "0 0 28px" }}>
                Enter your email and we will send you a link to reset your password.
              </p>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, color: BLACK, marginBottom: 8 }}>Email</div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocus(true)}
                  onBlur={() => setFocus(false)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="you@company.com"
                  style={{
                    width: "100%",
                    background: WHITE,
                    border: `1px solid ${focus ? BLACK : BORDER}`,
                    borderRadius: 10,
                    padding: "14px 16px",
                    fontFamily: FONT,
                    fontSize: 15,
                    color: BLACK,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

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
                {busy ? "Sending..." : "Send reset link"}
              </button>

              <div style={{ textAlign: "center", marginTop: 18 }}>
                <Link
                  href="/client/login"
                  style={{ fontFamily: FONT, fontSize: 13, color: "#666666", textDecoration: "none" }}
                >
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
