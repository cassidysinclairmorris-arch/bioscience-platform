"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const RED = "#E30000";
const BLACK = "#0A0A0A";
const WHITE = "#FFFFFF";
const BORDER = "#E5E5E5";
const FONT = "var(--font-raleway), sans-serif";

function SetPasswordInner() {
  const token = useSearchParams().get("token") || "";
  const [state, setState] = useState<"checking" | "valid" | "invalid" | "done">("checking");
  const [firstName, setFirstName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState("");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    fetch(`/api/client/set-password?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) {
          setFirstName(d.firstName || "");
          setState("valid");
        } else {
          setState("invalid");
        }
      })
      .catch(() => setState("invalid"));
  }, [token]);

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
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/client/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not set password.");
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not set password.");
      setBusy(false);
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
          {state === "checking" && (
            <p style={{ fontFamily: FONT, fontSize: 15, color: "#666666", margin: 0 }}>Checking your link...</p>
          )}

          {state === "invalid" && (
            <>
              <h1 style={{ fontFamily: FONT, fontWeight: 400, fontSize: 24, color: BLACK, margin: "0 0 10px" }}>
                Link expired
              </h1>
              <p style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.6, color: "#666666", margin: "0 0 24px" }}>
                This link is invalid or has expired. Request a new one and we will email it to you.
              </p>
              <Link
                href="/client/forgot-password"
                style={{
                  display: "inline-block",
                  background: BLACK,
                  color: WHITE,
                  fontFamily: FONT,
                  fontWeight: 400,
                  fontSize: 14,
                  textDecoration: "none",
                  borderRadius: 999,
                  padding: "13px 24px",
                }}
              >
                Request a new link
              </Link>
            </>
          )}

          {state === "done" && (
            <>
              <h1 style={{ fontFamily: FONT, fontWeight: 400, fontSize: 24, color: BLACK, margin: "0 0 10px" }}>
                Password set
              </h1>
              <p style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.6, color: "#666666", margin: "0 0 24px" }}>
                Your password is ready. You can now sign in to your portal.
              </p>
              <Link
                href="/client/login"
                style={{
                  display: "inline-block",
                  background: BLACK,
                  color: WHITE,
                  fontFamily: FONT,
                  fontWeight: 400,
                  fontSize: 14,
                  textDecoration: "none",
                  borderRadius: 999,
                  padding: "13px 24px",
                }}
              >
                Go to sign in
              </Link>
            </>
          )}

          {state === "valid" && (
            <>
              <h1 style={{ fontFamily: FONT, fontWeight: 400, fontSize: 24, color: BLACK, margin: "0 0 6px" }}>
                {firstName ? `Welcome, ${firstName}` : "Set your password"}
              </h1>
              <p style={{ fontFamily: FONT, fontSize: 14, color: "#666666", margin: "0 0 28px" }}>
                Choose a password to finish setting up your account.
              </p>

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 14, color: BLACK, marginBottom: 8 }}>New password</div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocus("p")}
                  onBlur={() => setFocus("")}
                  placeholder="At least 8 characters"
                  style={input("p")}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, color: BLACK, marginBottom: 8 }}>Confirm password</div>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onFocus={() => setFocus("c")}
                  onBlur={() => setFocus("")}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="Re-enter your password"
                  style={input("c")}
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
                {busy ? "Saving..." : "Set Password"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordInner />
    </Suspense>
  );
}
