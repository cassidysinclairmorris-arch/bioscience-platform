"use client";

import { useState } from "react";
import Link from "next/link";

// Brand tokens
const RED = "#E30000";
const BLACK = "#0A0A0A";
const WHITE = "#FFFFFF";
const GRAY_BG = "#F5F5F5";
const BORDER = "#E5E5E5";
const MUTED = "#999999";
const FONT = "var(--font-raleway), sans-serif";

const labelStyle: React.CSSProperties = {
  color: RED,
  fontFamily: FONT,
  fontWeight: 400,
  fontSize: 11,
  letterSpacing: "0.25em",
  textTransform: "uppercase",
};

/* ─────────────────────────────── NAV ─────────────────────────────────── */
function Nav() {
  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Studio", href: "/studio" },
    { label: "Services", href: "/#services" },
    { label: "Blog", href: "/#blog" },
  ];
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        height: 72,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        background: WHITE,
        borderBottom: `1px solid ${BORDER}`,
        fontFamily: FONT,
      }}
    >
      <Link
        href="/"
        style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}
      >
        <img
          src="/linkwright-logo-white.png"
          alt="Linkwright"
          style={{ height: 24, width: "auto", display: "block", filter: "brightness(0)" }}
        />
      </Link>

      <div style={{ display: "flex", gap: 36 }}>
        {navLinks.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            style={{
              fontFamily: FONT,
              fontWeight: 400,
              fontSize: 14,
              letterSpacing: "0.04em",
              color: BLACK,
              textDecoration: "none",
            }}
          >
            {l.label}
          </Link>
        ))}
      </div>

      <Link
        href="/contact"
        style={{
          fontFamily: FONT,
          fontWeight: 400,
          fontSize: 13,
          color: BLACK,
          textDecoration: "none",
          border: `1px solid ${BLACK}`,
          borderRadius: 999,
          padding: "9px 22px",
          whiteSpace: "nowrap",
        }}
      >
        Let&apos;s Connect
      </Link>
    </nav>
  );
}

/* ────────────────────────────── FOOTER ───────────────────────────────── */
function Footer() {
  const tags = ["Content Management", "Content Creation", "Data Optimized"];
  const marqueeTags = Array.from({ length: 6 }).flatMap(() => tags);
  return (
    <footer style={{ background: BLACK, color: WHITE }}>
      <style>{`@keyframes lw-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>

      <div style={{ overflow: "hidden", padding: "40px 0", whiteSpace: "nowrap" }}>
        <div
          style={{
            display: "inline-flex",
            gap: 16,
            animation: "lw-marquee 30s linear infinite",
          }}
        >
          {[...marqueeTags, ...marqueeTags].map((t, i) => (
            <span
              key={i}
              style={{
                border: "1px solid #333333",
                borderRadius: 999,
                padding: "12px 24px",
                fontFamily: FONT,
                fontWeight: 400,
                fontSize: 18,
                color: WHITE,
                whiteSpace: "nowrap",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: "#222222" }} />

      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          color: "#666666",
        }}
      >
        <Link href="/" style={{ display: "inline-flex", alignItems: "center" }}>
          <img
            src="/linkwright-logo-white.png"
            alt="Linkwright"
            style={{ height: 20, width: "auto", display: "block", opacity: 0.7 }}
          />
        </Link>
        <span style={{ fontFamily: FONT, fontSize: 13, color: "#666666" }}>
          ©2025 Linkwright
        </span>
      </div>
    </footer>
  );
}

/* ───────────────────────────── FORM FIELD ────────────────────────────── */
function Field({
  label,
  placeholder,
  value,
  onChange,
  textarea = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const inputStyle: React.CSSProperties = {
    background: WHITE,
    border: `1px solid ${focused ? BLACK : BORDER}`,
    borderRadius: 10,
    padding: "14px 16px",
    fontFamily: FONT,
    fontWeight: 400,
    fontSize: 15,
    width: "100%",
    outline: "none",
    color: BLACK,
    boxSizing: "border-box",
  };
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 400,
          fontSize: 14,
          color: BLACK,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {textarea ? (
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ ...inputStyle, minHeight: 160, resize: "vertical" }}
        />
      ) : (
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={inputStyle}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────── PAGE ────────────────────────────────── */
export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in your name, email, and message.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, message }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }
      setSubmitted(true);
      setName("");
      setEmail("");
      setCompany("");
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const infoBlocks = [
    { label: "Email", value: "cassidy@linkwrightstudio.com" },
    { label: "Contact Us", value: "+1 360 409 3762" },
    { label: "Hours", value: "MO-FR 09.00am - 06.00pm" },
  ];

  return (
    <main style={{ background: WHITE, fontFamily: FONT, overflowX: "hidden" }}>
      <Nav />

      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "96px 32px 0" }}>
        <span style={labelStyle}>( Contact )</span>
        <h1
          style={{
            fontFamily: FONT,
            fontWeight: 400,
            fontSize: "clamp(40px, 6vw, 72px)",
            lineHeight: 1.05,
            color: BLACK,
            margin: "20px 0 0",
          }}
        >
          Become Part of
          <br />
          Linkwright Today.
        </h1>
      </section>

      {/* Main content: two columns */}
      <section
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "64px 32px 128px",
          display: "flex",
          gap: 64,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* Left column 70% */}
        <div style={{ flex: "1 1 60%", minWidth: 320 }}>
          <div
            style={{
              background: GRAY_BG,
              borderRadius: 16,
              padding: 40,
            }}
          >
            {/* Row 1: name + email */}
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
              <Field label="Name" placeholder="Enter your Name" value={name} onChange={setName} />
              <Field label="Email" placeholder="Email" value={email} onChange={setEmail} />
            </div>

            {/* Row 2: company */}
            <div style={{ marginBottom: 24 }}>
              <Field
                label="Company Name"
                placeholder="Enter your Company Name"
                value={company}
                onChange={setCompany}
              />
            </div>

            {/* Row 3: message */}
            <div style={{ marginBottom: 28 }}>
              <Field
                label="Message"
                placeholder="Message here"
                value={message}
                onChange={setMessage}
                textarea
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={sending}
              style={{
                background: BLACK,
                color: WHITE,
                fontFamily: FONT,
                fontWeight: 400,
                fontSize: 15,
                border: "none",
                borderRadius: 999,
                padding: "16px 32px",
                cursor: sending ? "default" : "pointer",
                opacity: sending ? 0.6 : 1,
              }}
            >
              {sending ? "Sending..." : "Submit"}
            </button>

            {submitted && (
              <p
                style={{
                  fontFamily: FONT,
                  fontWeight: 400,
                  fontSize: 14,
                  color: "#666666",
                  margin: "20px 0 0",
                }}
              >
                Thank you. We have received your message and will be in touch shortly.
              </p>
            )}

            {error && (
              <p
                style={{
                  fontFamily: FONT,
                  fontWeight: 400,
                  fontSize: 14,
                  color: RED,
                  margin: "20px 0 0",
                }}
              >
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Right column 30% */}
        <div style={{ flex: "1 1 25%", minWidth: 280 }}>
          {infoBlocks.map((b, i) => (
            <div
              key={b.label}
              style={{
                padding: "24px 0",
                borderTop: i === 0 ? "none" : `1px solid ${BORDER}`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT,
                  fontWeight: 400,
                  fontSize: 11,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: MUTED,
                  marginBottom: 10,
                }}
              >
                {b.label}
              </div>
              <div
                style={{
                  fontFamily: FONT,
                  fontWeight: 500,
                  fontSize: 16,
                  color: BLACK,
                }}
              >
                {b.value}
              </div>
            </div>
          ))}

          <p
            style={{
              fontFamily: FONT,
              fontWeight: 400,
              fontSize: 14,
              lineHeight: 1.6,
              color: "#666666",
              margin: "24px 0 0",
            }}
          >
            We work with a select number of organizations at a time. If you are ready
            to build a serious LinkedIn presence, we would like to hear from you.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
