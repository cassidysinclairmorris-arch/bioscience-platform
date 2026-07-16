"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Brand tokens (shared by the blog pages)
export const RED = "#E30000";
export const BLACK = "#0A0A0A";
export const WHITE = "#FFFFFF";
export const BORDER = "#E5E5E5";
export const MUTED = "#999999";
export const FONT = "Helvetica, Arial, sans-serif";

export const labelStyle: React.CSSProperties = {
  color: RED,
  fontFamily: FONT,
  fontWeight: 400,
  fontSize: 11,
  letterSpacing: "0.25em",
  textTransform: "uppercase",
};

// Breakpoints: mobile < 768px, tablet 768-1024px, desktop > 1024px.
const MOBILE_Q = "(max-width: 767px)";
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    // Older iOS Safari exposes addListener/removeListener instead of the
    // standard addEventListener; support both so the effect never throws.
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else if (mql.addListener) mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else if (mql.removeListener) mql.removeListener(onChange);
    };
  }, [query]);
  return matches;
}

/* ────────────────── Shared responsive stylesheet ─────────────────────── */
// Server-rendered blog pages use inline styles, which a media query cannot
// override unless it is marked !important. These classes collapse the two-up
// card grids to one column and tighten horizontal padding below 768px.
export function BlogResponsiveStyles() {
  return (
    <style>{`
      @media (max-width: 767px) {
        .lw-grid-2 { grid-template-columns: 1fr !important; }
        .lw-pad { padding-left: 24px !important; padding-right: 24px !important; }
      }
    `}</style>
  );
}

/* ─────────────────────────────── NAV ─────────────────────────────────── */
export function Nav() {
  const isMobile = useMediaQuery(MOBILE_Q);
  const [menuOpen, setMenuOpen] = useState(false);
  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Services", href: "/#services" },
    { label: "Blog", href: "/blog" },
    { label: "Client Portal", href: "/portal/login" },
    { label: "Agency Login", href: "/login" },
  ];
  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

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
        padding: isMobile ? "0 20px" : "0 32px",
        background: WHITE,
        borderBottom: `1px solid ${BORDER}`,
        fontFamily: FONT,
      }}
    >
      <BlogResponsiveStyles />

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

      {isMobile ? (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
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
              padding: "8px 18px",
              whiteSpace: "nowrap",
            }}
          >
            Let&apos;s Connect
          </Link>
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 5,
              width: 28,
              height: 28,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <span style={{ display: "block", height: 2, width: "100%", background: BLACK }} />
            <span style={{ display: "block", height: 2, width: "100%", background: BLACK }} />
            <span style={{ display: "block", height: 2, width: "100%", background: BLACK }} />
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 36 }}>
            {navLinks.slice(0, 3).map((l) => (
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

          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Link
              href="/portal/login"
              style={{
                fontFamily: FONT,
                fontWeight: 400,
                fontSize: 13,
                color: BLACK,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Client Portal
            </Link>
            <Link
              href="/login"
              style={{
                fontFamily: FONT,
                fontWeight: 400,
                fontSize: 13,
                color: BLACK,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Agency Login
            </Link>
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
          </div>
        </>
      )}

      {/* Mobile slide-in menu panel + backdrop */}
      {isMobile && (
        <>
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 190,
              background: "rgba(0,0,0,0.4)",
              opacity: menuOpen ? 1 : 0,
              pointerEvents: menuOpen ? "auto" : "none",
              transition: "opacity 0.3s ease",
            }}
          />
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              zIndex: 200,
              height: "100vh",
              width: "min(320px, 82vw)",
              background: BLACK,
              transform: menuOpen ? "translateX(0)" : "translateX(100%)",
              transition: "transform 0.3s ease",
              display: "flex",
              flexDirection: "column",
              padding: "24px 28px",
            }}
          >
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              style={{
                alignSelf: "flex-end",
                background: "transparent",
                border: "none",
                color: WHITE,
                fontSize: 30,
                lineHeight: 1,
                cursor: "pointer",
                padding: 0,
                marginBottom: 24,
              }}
            >
              ×
            </button>
            {navLinks.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  fontFamily: FONT,
                  fontWeight: 300,
                  fontSize: 24,
                  letterSpacing: "0.02em",
                  color: WHITE,
                  textDecoration: "none",
                  padding: "16px 0",
                  borderBottom: "1px solid #222222",
                }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </nav>
  );
}

/* ────────────────────────────── FOOTER ───────────────────────────────── */
export function Footer() {
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
