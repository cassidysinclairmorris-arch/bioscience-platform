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

/* ─────────────────────────────── NAV ─────────────────────────────────── */
export function Nav() {
  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Services", href: "/#services" },
    { label: "Blog", href: "/blog" },
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
