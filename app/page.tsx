"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { blogPosts } from "@/lib/blog";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";

// Brand tokens
const RED = "#E30000";
const RED_DARK = "#C40000";
const BLACK = "#0A0A0A";
const WHITE = "#FFFFFF";
const MUTED = "#999999";
const FONT = "Helvetica, Arial, sans-serif";
// Hero wordmark keeps the ultra-thin Raleway treatment.
const HERO_FONT = "var(--font-raleway), sans-serif";

// Shared section label style: ( ABOUT US ) etc.
const labelStyle: React.CSSProperties = {
  color: RED,
  fontFamily: FONT,
  fontWeight: 400,
  fontSize: 11,
  letterSpacing: "0.25em",
  textTransform: "uppercase",
};

/* ─────────────────────────── Live clock hook ─────────────────────────── */
function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
}
function fmtTime(d: Date | null) {
  return d ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
}

/* ───────────────── In-view + count-up animation helpers ──────────────── */
// Fires once when the element crosses the given visibility threshold.
function useInView(ref: React.RefObject<HTMLElement | null>, threshold = 0.2) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold]);
  return inView;
}

// Counts from `from` to `to` over `duration` ms with ease-out, once `start` is true.
function CountUp({
  from,
  to,
  start,
  duration = 400,
}: {
  from: number;
  to: number;
  start: boolean;
  duration?: number;
}) {
  const [value, setValue] = useState(from);
  const ran = useRef(false);
  useEffect(() => {
    if (!start || ran.current) return;
    ran.current = true;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 2); // ease-out
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, from, to, duration]);
  return <>{value}</>;
}

/* ─────────────────── Scroll-highlight cascading text ─────────────────── */
function HighlightWord({
  progress,
  range,
  children,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  children: string;
}) {
  const color = useTransform(progress, range, ["#CCCCCC", BLACK]);
  return (
    <motion.span style={{ color }}>
      {children}
      {" "}
    </motion.span>
  );
}

function ScrollHighlight({
  text,
  style,
}: {
  text: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "start 0.2"],
  });
  const words = text.split(" ");
  return (
    <p
      ref={ref}
      style={{
        fontFamily: FONT,
        fontWeight: 400,
        margin: 0,
        ...style,
      }}
    >
      {words.map((w, i) => {
        const start = i / words.length;
        const end = start + 1 / words.length;
        return (
          <HighlightWord key={i} progress={scrollYProgress} range={[start, end]}>
            {w}
          </HighlightWord>
        );
      })}
    </p>
  );
}

/* ───────────────────────── Hero radial dot grid ──────────────────────── */
function DotRings() {
  const size = 900;
  const center = size / 2;
  const spacing = 18;
  const ringCount = Math.floor(center / spacing);
  const dots: { x: number; y: number }[] = [];
  // center dot
  dots.push({ x: center, y: center });
  for (let r = 1; r <= ringCount; r++) {
    const radius = r * spacing;
    const circumference = 2 * Math.PI * radius;
    const count = Math.max(1, Math.round(circumference / spacing));
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      dots.push({
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
      });
    }
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{
        position: "absolute",
        top: "-12%",
        right: "-6%",
        width: "60vw",
        maxWidth: 900,
        height: "auto",
        pointerEvents: "none",
      }}
      aria-hidden
    >
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={2} fill={RED_DARK} />
      ))}
    </svg>
  );
}

/* ─────────────────────────────── NAV ─────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const now = useNow();
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fg = scrolled ? BLACK : WHITE;
  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Services", href: "#services" },
    { label: "Blog", href: "#blog" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 72,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        background: scrolled ? WHITE : "transparent",
        borderBottom: scrolled ? "1px solid #ECECEC" : "1px solid transparent",
        transition: "background 0.3s ease, border-color 0.3s ease",
        fontFamily: FONT,
      }}
    >
      {/* Left: Linkwright wordmark (links home) */}
      <Link
        href="/"
        style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}
      >
        <img
          src="/linkwright-logo-white.png"
          alt="Linkwright"
          style={{
            height: 24,
            width: "auto",
            display: "block",
            // White artwork: keep white over the red hero, invert to black once
            // the nav turns white on scroll.
            filter: scrolled ? "brightness(0)" : "none",
            transition: "filter 0.3s ease",
          }}
        />
      </Link>

      {/* Center: nav links */}
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
              color: fg,
              textDecoration: "none",
              transition: "color 0.3s ease",
            }}
          >
            {l.label}
          </Link>
        ))}
      </div>

      {/* Right: live clock + divider + Let's Connect */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <span
          style={{
            fontFamily: FONT,
            fontWeight: 400,
            fontSize: 13,
            color: fg,
            transition: "color 0.3s ease",
            fontVariantNumeric: "tabular-nums",
            minWidth: 140,
            textAlign: "right",
          }}
        >
          {now ? `${fmtDate(now)} / ${fmtTime(now)}` : ""}
        </span>
        <span
          style={{
            width: 1,
            height: 22,
            background: scrolled ? "#D5D5D5" : "rgba(255,255,255,0.4)",
            transition: "background 0.3s ease",
          }}
        />
        {/* Password-protected entry points */}
        <Link
          href="/client/login"
          style={{
            fontFamily: FONT,
            fontWeight: 400,
            fontSize: 13,
            letterSpacing: "0.04em",
            color: fg,
            textDecoration: "none",
            transition: "color 0.3s ease",
            whiteSpace: "nowrap",
          }}
        >
          Client Login
        </Link>
        <Link
          href="/login"
          style={{
            fontFamily: FONT,
            fontWeight: 400,
            fontSize: 13,
            letterSpacing: "0.04em",
            color: fg,
            textDecoration: "none",
            transition: "color 0.3s ease",
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
            color: fg,
            textDecoration: "none",
            border: `1px solid ${scrolled ? BLACK : "rgba(255,255,255,0.8)"}`,
            borderRadius: 999,
            padding: "9px 22px",
            transition: "color 0.3s ease, border-color 0.3s ease",
            whiteSpace: "nowrap",
          }}
        >
          Let&apos;s Connect
        </Link>
      </div>
    </nav>
  );
}

/* ─────────────────────────────── HERO ────────────────────────────────── */
function Hero() {
  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
        background: RED,
        overflow: "hidden",
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <DotRings />

      {/* Wordmark bottom-left */}
      <h1
        style={{
          position: "relative",
          zIndex: 2,
          margin: 0,
          padding: "0 0 140px 32px",
          fontFamily: HERO_FONT,
          fontWeight: 100,
          fontSize: "clamp(80px, 12vw, 160px)",
          letterSpacing: "0.15em",
          color: WHITE,
          lineHeight: 1,
        }}
      >
        LINKWRIGHT
      </h1>

      {/* Stepped white tab cutout at the bottom edge */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 130,
          display: "flex",
          alignItems: "flex-end",
          zIndex: 3,
          pointerEvents: "none",
        }}
      >
        <div style={{ width: "26%", height: 64, background: WHITE }} />
        <div style={{ width: "30%", height: 110, background: WHITE }} />
        <div style={{ width: "22%", height: 80, background: WHITE }} />
        <div style={{ flex: 1, height: 0 }} />
      </div>
    </section>
  );
}

/* ────────────────────────────── ABOUT ────────────────────────────────── */
function About() {
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, 0.3);
  const stats = [
    { from: 158, to: 168, suffix: "h", label: "Hours of Weekly Market Monitoring" },
    { from: 42, to: 52, suffix: "+", label: "LinkedIn Performance Indicators Tracked" },
    { from: 20, to: 30, suffix: "+", label: "Content Variables Optimized" },
    { from: 90, to: 100, suffix: "%", label: "Data-Driven Recommendations" },
  ];
  return (
    <section
      style={{
        background: WHITE,
        padding: "128px 32px",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
          <div style={{ width: 160, flexShrink: 0 }}>
            <span style={labelStyle}>( About Us )</span>
          </div>
          <div style={{ flex: 1, minWidth: 320, maxWidth: "65%" }}>
            <ScrollHighlight
              text="We help companies turn LinkedIn into a growth engine through algorithm-informed content, performance analytics, and intelligent content optimization."
              style={{
                fontSize: "clamp(28px, 4vw, 52px)",
                lineHeight: 1.25,
              }}
            />
          </div>
        </div>

        {/* Photo + stat grid */}
        <div
          style={{
            display: "flex",
            gap: 56,
            marginTop: 80,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <img
            src="/images/19.png"
            alt="Linkwright team at work"
            style={{
              width: 280,
              borderRadius: 12,
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
          <div
            ref={statsRef}
            style={{
              flex: 1,
              minWidth: 360,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "48px 56px",
            }}
          >
            {stats.map((s) => (
              <div key={s.label}>
                <div
                  style={{
                    fontFamily: FONT,
                    fontWeight: 400,
                    fontSize: 56,
                    lineHeight: 1,
                    color: BLACK,
                  }}
                >
                  <CountUp from={s.from} to={s.to} start={statsInView} />
                  <span style={{ color: MUTED }}>{s.suffix}</span>
                </div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontWeight: 400,
                    fontSize: 14,
                    color: "#666666",
                    marginTop: 10,
                    maxWidth: 220,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider + paragraph */}
        <div style={{ height: 1, background: "#E5E5E5", margin: "72px 0 40px" }} />
        <p
          style={{
            fontFamily: FONT,
            fontWeight: 400,
            fontSize: 18,
            lineHeight: 1.7,
            color: "#444444",
            maxWidth: 760,
            margin: 0,
          }}
        >
          Trusted by innovative teams building their next stage of growth, we help
          organizations turn LinkedIn into a strategic channel for brand authority,
          audience engagement, and business development.
        </p>
      </div>
    </section>
  );
}

/* ───────────────────── FOUR IMAGE FLOATING SECTION ───────────────────── */
// Each floating image: a motion.div anchored at the sticky container's center
// (left/top 50%), offset by the scroll-driven x/y. An inner wrapper carries the
// static translate(-50%, -50%) so the image is centered on that anchor without
// fighting framer-motion for the transform property.
function FloatImage({
  src,
  width,
  height,
  x,
  y,
}: {
  src: string;
  width: number;
  height: number;
  x: MotionValue<number>;
  y: MotionValue<number>;
}) {
  return (
    <motion.div
      transition={{ duration: 0 }}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        x,
        y,
        zIndex: 1,
      }}
    >
      <div style={{ transform: "translate(-50%, -50%)" }}>
        <Image
          src={src}
          alt=""
          width={width}
          height={height}
          style={{
            display: "block",
            width,
            height,
            borderRadius: 12,
            objectFit: "cover",
          }}
        />
      </div>
    </motion.div>
  );
}

function FloatingImages() {
  const outerRef = useRef<HTMLDivElement>(null);
  // Pins from the moment the section hits the top of the viewport and stays
  // pinned for the full 300vh, so scrollYProgress runs 0 to 1 across that span.
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ["start start", "end end"],
  });

  // Images start stacked at center (0,0) and finish spreading to their corners
  // by 0.55. Linear interpolation only, so motion tracks scroll 1:1.
  const x13 = useTransform(scrollYProgress, [0, 0.55], [0, -500]);
  const y13 = useTransform(scrollYProgress, [0, 0.55], [0, -250]);
  const x4 = useTransform(scrollYProgress, [0, 0.55], [0, 500]);
  const y4 = useTransform(scrollYProgress, [0, 0.55], [0, -250]);
  const x6 = useTransform(scrollYProgress, [0, 0.55], [0, -500]);
  const y6 = useTransform(scrollYProgress, [0, 0.55], [0, 280]);
  const x14 = useTransform(scrollYProgress, [0, 0.55], [0, 500]);
  const y14 = useTransform(scrollYProgress, [0, 0.55], [0, 280]);

  // Headline fades in and warms to solid black, fully visible by 0.85; the link
  // follows by 0.95. The reveal runs almost to the pin release, so there is only
  // a sliver of fully revealed scroll left at the end (no empty pinned stretch).
  const headlineOpacity = useTransform(scrollYProgress, [0.55, 0.9], [0, 1]);
  const headlineColor = useTransform(scrollYProgress, [0.55, 0.9], ["#CCCCCC", "#0A0A0A"]);
  const linkOpacity = useTransform(scrollYProgress, [0.8, 1], [0, 1]);

  return (
    <section
      ref={outerRef}
      style={{
        position: "relative",
        background: WHITE,
        minHeight: "120vh",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <FloatImage src="/images/13.png" width={220} height={280} x={x13} y={y13} />
        <FloatImage src="/images/4.png" width={260} height={320} x={x4} y={y4} />
        <FloatImage src="/images/6.png" width={300} height={300} x={x6} y={y6} />
        <FloatImage src="/images/14.png" width={240} height={300} x={x14} y={y14} />

        {/* Headline + link, absolutely centered above the images */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10,
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <motion.h2
            style={{
              fontFamily: FONT,
              fontWeight: 400,
              fontSize: "clamp(32px, 5vw, 68px)",
              lineHeight: 1.1,
              color: headlineColor,
              margin: 0,
              opacity: headlineOpacity,
            }}
          >
            <span style={{ display: "block" }}>Powerful Presence.</span>
            <span style={{ display: "block" }}>Meaningful Connections.</span>
            <span style={{ display: "block" }}>Measurable Growth.</span>
          </motion.h2>
          <motion.div style={{ opacity: linkOpacity }}>
            <Link
              href="/contact"
              style={{
                display: "inline-block",
                marginTop: 28,
                fontFamily: FONT,
                fontWeight: 400,
                fontSize: 12,
                letterSpacing: "0.15em",
                color: RED,
                textDecoration: "none",
                pointerEvents: "auto",
              }}
            >
              CONTACT US NOW ↗
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── SERVICES ──────────────────────────────── */
const SERVICES = [
  {
    name: "Complete LinkedIn Management",
    image: "/images/1.png",
    copy: "We handle your entire LinkedIn presence, from strategy and planning to publishing and optimization, so your team can stay focused on building the business.",
  },
  {
    name: "Strategic Content Creation",
    image: "/images/2.png",
    copy: "Every post and branded visual is created around your goals, audience, and industry positioning. Content is reviewed and approved by you before publication.",
  },
  {
    name: "Data Driven Optimization",
    image: "/images/3.png",
    copy: "Our system continuously analyzes LinkedIn performance signals, audience behavior, content trends, and engagement patterns to refine strategy and maximize impact.",
  },
  {
    name: "Performance Intelligence",
    image: "/images/10.png",
    copy: "Understand what's working, why it's working, and how your content is contributing to your goals through clear reporting and actionable insights.",
  },
];

function Services() {
  const [active, setActive] = useState(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-index"));
            setActive(idx);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    itemRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="services" style={{ background: WHITE, padding: "64px 0 128px" }}>
      {/* Double red rule */}
      <div style={{ height: 1, background: RED }} />
      <div style={{ height: 6 }} />
      <div style={{ height: 1, background: RED }} />

      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "80px 32px 0",
        }}
      >
        {/* Header: label with the intro paragraph beside it */}
        <div
          style={{
            display: "flex",
            gap: 64,
            alignItems: "flex-start",
            flexWrap: "wrap",
            marginBottom: 56,
          }}
        >
          <div style={{ width: "35%", minWidth: 320 }}>
            <span style={labelStyle}>( Services )</span>
          </div>
          <p
            style={{
              flex: 1,
              minWidth: 360,
              fontFamily: FONT,
              fontWeight: 400,
              fontSize: 16,
              lineHeight: 1.6,
              color: "#444444",
              margin: 0,
              maxWidth: 560,
            }}
          >
            We help organizations maximize their LinkedIn presence through
            data-driven content creation, performance intelligence, and continuous
            optimization.
          </p>
        </div>

        {/* Body: service list and image, stretched to equal height */}
        <div
          style={{
            display: "flex",
            gap: 64,
            alignItems: "stretch",
            flexWrap: "wrap",
          }}
        >
          {/* Left: list (drives the sticky panel) */}
          <div style={{ width: "35%", minWidth: 320 }}>
            {SERVICES.map((s, i) => (
            <div
              key={s.name}
              data-index={i}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              style={{
                borderTop: "1px solid #E5E5E5",
                padding: "40px 0",
                minHeight: 160,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                <span
                  style={{
                    fontFamily: FONT,
                    fontWeight: 400,
                    fontSize: 13,
                    color: MUTED,
                  }}
                >
                  0{i + 1}
                </span>
                <span
                  style={{
                    fontFamily: FONT,
                    fontWeight: 400,
                    fontSize: 28,
                    lineHeight: 1.2,
                    color: active === i ? BLACK : "#C9C9C9",
                    transition: "color 0.3s ease",
                  }}
                >
                  {s.name}
                </span>
              </div>
              {active === i && (
                <motion.div
                  layoutId="service-underline"
                  style={{
                    height: 2,
                    background: RED,
                    marginTop: 14,
                    width: "100%",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Right: image panel, height matched to the service list exactly */}
        <div style={{ flex: 1, minWidth: 360, display: "flex" }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div
              style={{
                position: "relative",
                width: "100%",
                flex: 1,
                minHeight: 0,
                // Match the list height but cap it so the bottom copy overlay
                // stays within view instead of running off the bottom.
                maxHeight: 560,
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <AnimatePresence>
                <motion.div
                  key={active}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                  }}
                >
                  <img
                    src={SERVICES[active].image}
                    alt={SERVICES[active].name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  {/* Dark gradient + overlaid copy */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      padding: "80px 40px 40px",
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0))",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: FONT,
                        fontWeight: 400,
                        fontSize: 18,
                        lineHeight: 1.6,
                        color: WHITE,
                        margin: 0,
                        maxWidth: 560,
                      }}
                    >
                      {SERVICES[active].copy}
                    </p>
                    <a
                      href="#pricing"
                      style={{
                        display: "inline-block",
                        marginTop: 20,
                        fontFamily: FONT,
                        fontWeight: 400,
                        fontSize: 12,
                        letterSpacing: "0.15em",
                        color: WHITE,
                        textDecoration: "underline",
                        textUnderlineOffset: 4,
                      }}
                    >
                      SEE PRICING ↗
                    </a>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────── PROCESS ──────────────────────────────── */
const PROCESS_CARDS = [
  {
    title: "Set The Goal",
    body: "Every LinkedIn strategy starts with a clear objective. Whether you're looking to attract investors, generate clients, recruit talent, establish authority, or increase visibility, each goal requires a different approach. We use these priorities to build a content strategy tailored to your audience and business goals.",
    icon: "leaf",
  },
  {
    title: "We Handle The Execution",
    body: "Using these insights, we create and publish content tailored to your goals. Factors such as audience location, time zones, posting cadence, content structure, and engagement patterns all influence how content is developed and distributed.",
    icon: "code",
  },
  {
    title: "Adapt With The Platform",
    body: "LinkedIn's algorithm and user behavior are constantly evolving. Every week, new performance data feeds back into the system, allowing us to refine strategy, adapt content, and continuously improve results over time.",
    icon: "thumb",
  },
  {
    title: "Decode The Data",
    body: "Our proprietary system analyzes LinkedIn performance data, engagement patterns, audience behavior, posting times, content formats, and emerging trends to identify what is performing well for your target audience.",
    icon: "frame",
  },
];

function ProcessIcon({ type }: { type: string }) {
  const common = {
    width: 28,
    height: 28,
    fill: "none",
    stroke: WHITE,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (type) {
    case "leaf":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6" />
        </svg>
      );
    case "code":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case "thumb":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M7 10v12" />
          <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z" />
        </svg>
      );
    case "frame":
    default:
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M6 2v14a2 2 0 0 0 2 2h14" />
          <path d="M18 22V8a2 2 0 0 0-2-2H2" />
        </svg>
      );
  }
}

function Process() {
  const cardsRef = useRef<HTMLDivElement>(null);
  const cardsInView = useInView(cardsRef, 0.2);
  return (
    <section style={{ background: WHITE, padding: "128px 32px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <span style={labelStyle}>( Our Process )</span>
        <div style={{ maxWidth: 1000, margin: "28px 0 72px" }}>
          <ScrollHighlight
            text="We take a collaborative approach that transforms your vision into focused, high-impact execution."
            style={{ fontSize: "clamp(28px, 4vw, 52px)", lineHeight: 1.25 }}
          />
        </div>

        <div
          ref={cardsRef}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 24,
          }}
        >
          {PROCESS_CARDS.map((c) => (
            <div
              key={c.title}
              style={{
                background: RED,
                borderRadius: 16,
                padding: 32,
                color: WHITE,
                opacity: cardsInView ? 1 : 0,
                transform: cardsInView ? "translateY(0)" : "translateY(16px)",
                transition: "opacity 350ms ease-out, transform 350ms ease-out",
              }}
            >
              <div style={{ marginBottom: 28 }}>
                <ProcessIcon type={c.icon} />
              </div>
              <h3
                style={{
                  fontFamily: FONT,
                  fontWeight: 400,
                  fontSize: 22,
                  margin: "0 0 14px",
                }}
              >
                {c.title}
              </h3>
              <p
                style={{
                  fontFamily: FONT,
                  fontWeight: 400,
                  fontSize: 14,
                  lineHeight: 1.6,
                  margin: 0,
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────── PRICING ──────────────────────────────── */
const PLANS = [
  {
    name: "Foundation",
    subtitle: "Maintain a Professional Presence",
    price: 500,
    includes: [
      "4 custom posts per month",
      "Custom branded visuals",
      "Monthly content planning",
      "Performance reporting",
    ],
    bestFor:
      "Early-stage companies that want to stay visible, communicate progress, and maintain a professional presence.",
    outcome:
      "Stay active, stay relevant, and ensure your company has a voice between major milestones.",
    popular: false,
  },
  {
    name: "Growth",
    subtitle: "Build Consistent Visibility",
    price: 1000,
    includes: [
      "Everything in Foundation",
      "8 custom posts per month",
      "Content pillar development",
      "Expanded content strategy",
    ],
    bestFor:
      "Companies seeking greater awareness among investors, partners, recruits, and industry stakeholders.",
    outcome:
      "Build momentum through consistent, strategic communication that reinforces your expertise over time.",
    popular: false,
  },
  {
    name: "Authority",
    subtitle: "Establish Industry Credibility",
    price: 1800,
    includes: [
      "Everything in Growth",
      "12 custom posts per month",
      "Educational carousel creation",
      "Monthly strategy consultation",
      "Enhanced performance analysis",
    ],
    bestFor:
      "Organizations focused on thought leadership, fundraising, hiring, partnership development, or market expansion.",
    outcome:
      "Transform LinkedIn from a communication channel into a platform for industry influence and credibility.",
    popular: true,
  },
  {
    name: "Market Leadership",
    subtitle: "Own the Conversation",
    price: 3200,
    includes: [
      "Everything in Authority",
      "16 custom posts per month",
      "Full LinkedIn page management",
      "Strategic community engagement",
      "Weekly performance monitoring",
      "Quarterly growth roadmap",
    ],
    bestFor: "Companies committed to building a dominant presence within their industry.",
    outcome:
      "Maximize visibility, strengthen industry relationships, and position your company at the center of the conversation.",
    popular: false,
  },
];

function Pricing() {
  return (
    <section id="pricing" style={{ background: WHITE, padding: "128px 32px 96px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* Top row: contact link */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Link
            href="/contact"
            style={{
              fontFamily: FONT,
              fontWeight: 400,
              fontSize: 12,
              letterSpacing: "0.15em",
              color: RED,
              textDecoration: "none",
            }}
          >
            CONTACT US NOW ↗
          </Link>
        </div>

        <span style={{ ...labelStyle, display: "block", marginTop: 24 }}>( Pricing )</span>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 32,
            marginTop: 16,
          }}
        >
          <h2
            style={{
              fontFamily: FONT,
              fontWeight: 400,
              fontSize: "clamp(40px, 6vw, 80px)",
              lineHeight: 1.05,
              margin: 0,
              color: BLACK,
            }}
          >
            Flexible plans.
            <br />
            <span style={{ color: "#CCCCCC" }}>Scalable growth.</span>
          </h2>
        </div>

        {/* Cards 2x2 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            marginTop: 64,
          }}
        >
          {PLANS.map((p) => (
            <div
              key={p.name}
              style={{
                position: "relative",
                border: "1px solid #E5E5E5",
                borderRadius: 16,
                padding: 32,
                background: WHITE,
              }}
            >
              {p.popular && (
                <span
                  style={{
                    position: "absolute",
                    top: -14,
                    left: 32,
                    background: RED,
                    color: WHITE,
                    fontFamily: FONT,
                    fontWeight: 400,
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    padding: "6px 14px",
                    borderRadius: 999,
                  }}
                >
                  Most Popular
                </span>
              )}

              <h3
                style={{
                  fontFamily: FONT,
                  fontWeight: 400,
                  fontSize: 22,
                  color: BLACK,
                  margin: 0,
                }}
              >
                {p.name}
              </h3>
              <p
                style={{
                  fontFamily: FONT,
                  fontWeight: 400,
                  fontSize: 14,
                  color: "#666666",
                  margin: "6px 0 24px",
                }}
              >
                {p.subtitle}
              </p>

              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span
                  style={{
                    fontFamily: FONT,
                    fontWeight: 400,
                    fontSize: 40,
                    color: BLACK,
                  }}
                >
                  ${p.price.toLocaleString()}
                </span>
                <span style={{ fontFamily: FONT, fontSize: 16, color: MUTED }}>
                  /month
                </span>
              </div>

              <div style={{ height: 1, background: "#E5E5E5", margin: "24px 0" }} />

              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {p.includes.map((item) => (
                  <li
                    key={item}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      fontFamily: FONT,
                      fontWeight: 400,
                      fontSize: 14,
                      color: "#333333",
                      marginBottom: 12,
                    }}
                  >
                    <span style={{ color: RED, fontWeight: 400 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: 24 }}>
                <span
                  style={{
                    fontFamily: FONT,
                    fontWeight: 400,
                    fontSize: 11,
                    letterSpacing: "0.2em",
                    color: RED,
                    textTransform: "uppercase",
                  }}
                >
                  Best For
                </span>
                <p
                  style={{
                    fontFamily: FONT,
                    fontWeight: 400,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "#444444",
                    margin: "8px 0 0",
                  }}
                >
                  {p.bestFor}
                </p>
              </div>

              <div style={{ marginTop: 20 }}>
                <span
                  style={{
                    fontFamily: FONT,
                    fontWeight: 400,
                    fontSize: 11,
                    letterSpacing: "0.2em",
                    color: RED,
                    textTransform: "uppercase",
                  }}
                >
                  Outcome
                </span>
                <p
                  style={{
                    fontFamily: FONT,
                    fontWeight: 400,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "#444444",
                    margin: "8px 0 0",
                  }}
                >
                  {p.outcome}
                </p>
              </div>

              <Link
                href="/contact"
                style={{
                  display: "block",
                  textAlign: "center",
                  marginTop: 28,
                  fontFamily: FONT,
                  fontWeight: 400,
                  fontSize: 15,
                  color: WHITE,
                  background: p.popular ? RED : BLACK,
                  borderRadius: 8,
                  padding: "14px 0",
                  textDecoration: "none",
                }}
              >
                Get Started ↗
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────── FAQ ────────────────────────────────── */
const faqPara: React.CSSProperties = {
  fontFamily: FONT,
  fontWeight: 400,
  fontSize: 15,
  lineHeight: 1.7,
  color: "#555555",
  margin: "0 0 14px",
};
const faqSubhead: React.CSSProperties = {
  fontFamily: FONT,
  fontWeight: 400,
  fontSize: 16,
  color: BLACK,
  margin: "22px 0 12px",
};

const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: "Why should a bioscience company invest in LinkedIn?",
    a: (
      <>
        <p style={faqPara}>Because visibility creates opportunity.</p>
        <p style={faqPara}>
          Investors, researchers, potential hires, industry leaders, and strategic
          partners increasingly use LinkedIn to evaluate companies long before a
          meeting takes place. A strong presence helps ensure your company is
          discovered, understood, and remembered by the people who matter most.
        </p>
        <p style={faqPara}>
          For many bioscience companies, the challenge isn&apos;t the quality of the
          science. It&apos;s making sure the right people know it exists.
        </p>
      </>
    ),
  },
  {
    q: "What makes Linkwright different from a traditional marketing agency?",
    a: (
      <>
        <p style={faqPara}>Most agencies understand marketing.</p>
        <p style={faqPara}>Most bioscience companies understand science.</p>
        <p style={faqPara}>Very few understand both.</p>
        <p style={faqPara}>
          Linkwright specializes in translating complex scientific expertise into
          content that investors, talent, partners, and industry stakeholders can
          actually understand and engage with. Our focus is not simply creating
          content. It is building visibility, credibility, and industry presence.
        </p>
      </>
    ),
  },
  {
    q: "How much involvement is required from our team?",
    a: (
      <>
        <p style={faqPara}>Very little.</p>
        <p style={faqPara}>
          We handle strategy, content planning, writing, design, publishing,
          reporting, and ongoing management based on your selected package.
        </p>
        <p style={faqPara}>
          Your team provides company insights, milestone updates, and final
          approvals. We handle the execution so your scientists and leadership team
          can stay focused on building the business.
        </p>
      </>
    ),
  },
  {
    q: "How long does it take to see results?",
    a: (
      <>
        <p style={faqPara}>
          LinkedIn is a long-term visibility channel, not a short-term advertising
          platform.
        </p>
        <p style={faqPara}>
          Most companies begin seeing improvements in reach, engagement, and audience
          growth within the first few months. More meaningful outcomes such as
          investor awareness, recruiting interest, partnership opportunities, and
          industry recognition typically develop through consistent communication
          over time.
        </p>
        <p style={faqPara}>
          The companies that see the greatest results are usually the ones that commit
          to building visibility before they need it.
        </p>
      </>
    ),
  },
  {
    q: "How do you measure success?",
    a: (
      <>
        <p style={faqPara}>
          Every company has different objectives, which means every strategy has
          different success metrics.
        </p>
        <p style={faqPara}>
          For some companies, success means increasing investor visibility. For
          others, it&apos;s attracting talent, building scientific authority,
          recruiting clinical trial participants, expanding into new markets, or
          supporting commercial growth.
        </p>
        <p style={faqPara}>
          We begin by identifying your primary business objectives and then track the
          metrics most closely tied to those goals.
        </p>
        <p style={faqSubhead}>Core Metrics We Track</p>
        {[
          ["Impressions & Reach", "The foundation of visibility. How many people are seeing your content and how far your message is spreading."],
          ["Profile Visits", "One of the strongest indicators of interest. When someone moves from your content to your company page, curiosity has become intent."],
          ["Follower Growth", "Not just more followers, but the right followers. Investors, researchers, partners, industry leaders, and potential recruits."],
          ["Engagement Rate", "A measure of meaningful interactions relative to reach. Comments, shares, saves, and engagement help us understand whether content is resonating with the intended audience."],
        ].map(([t, d]) => (
          <p key={t} style={faqPara}>
            <strong style={{ fontWeight: 400, color: BLACK }}>{t}</strong>
            <br />
            {d}
          </p>
        ))}
        <p style={faqSubhead}>Goal-Specific Metrics</p>
        <p style={faqPara}>
          Beyond core performance metrics, our advanced packages measure success
          through goal-specific KPIs designed around the outcomes that matter most to
          your business, such as investor visibility, talent acquisition, scientific
          authority, clinical trial recruitment, and commercial growth.
        </p>
      </>
    ),
  },
];

function FaqItem({ q, a }: { q: string; a: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: "1px solid #E5E5E5" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          padding: "26px 0",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontFamily: FONT,
            fontWeight: 500,
            fontSize: 18,
            color: BLACK,
          }}
        >
          {q}
        </span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.25 }}
          style={{
            color: RED,
            fontSize: 26,
            lineHeight: 1,
            flexShrink: 0,
            fontWeight: 300,
          }}
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 0 28px" }}>{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Faq() {
  return (
    <section style={{ background: WHITE, padding: "96px 32px 128px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* Main FAQ layout */}
        <div style={{ display: "flex", gap: 64, flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* Left */}
          <div style={{ width: "40%", minWidth: 320 }}>
            <span style={labelStyle}>( FAQ )</span>
            <h3
              style={{
                fontFamily: FONT,
                fontWeight: 400,
                fontSize: "clamp(32px, 4vw, 48px)",
                lineHeight: 1.1,
                margin: "20px 0 20px",
                color: BLACK,
              }}
            >
              Frequently Asked
              <br />
              <span style={{ color: "#CCCCCC" }}>Questions.</span>
            </h3>
            <p
              style={{
                fontFamily: FONT,
                fontWeight: 400,
                fontSize: 16,
                lineHeight: 1.6,
                color: "#666666",
                maxWidth: 360,
              }}
            >
              We know every project is unique, and you might have some questions before
              getting started.
            </p>

            <div
              style={{
                background: RED,
                borderRadius: 16,
                padding: 28,
                marginTop: 36,
                maxWidth: 380,
              }}
            >
              <h4
                style={{
                  fontFamily: FONT,
                  fontWeight: 400,
                  fontSize: 20,
                  color: WHITE,
                  margin: "0 0 12px",
                }}
              >
                Book an introduction call
              </h4>
              <p
                style={{
                  fontFamily: FONT,
                  fontWeight: 400,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.92)",
                  margin: "0 0 18px",
                }}
              >
                During this call we do a quick intro and discuss your project and its
                specific needs.
              </p>
              <Link
                href="/contact"
                style={{
                  fontFamily: FONT,
                  fontWeight: 400,
                  fontSize: 12,
                  letterSpacing: "0.15em",
                  color: WHITE,
                  textDecoration: "underline",
                  textUnderlineOffset: 4,
                }}
              >
                BOOK A CALL ↗
              </Link>
            </div>
          </div>

          {/* Right: accordion */}
          <div style={{ flex: 1, minWidth: 360 }}>
            {FAQS.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────── BLOG ─────────────────────────────────── */
function Blog() {
  // Show the two most recent posts; full list lives at /blog.
  const posts = blogPosts.slice(0, 2);
  return (
    <section id="blog" style={{ background: WHITE, padding: "96px 32px 128px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 56,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <span style={labelStyle}>( Blog )</span>
            <h2
              style={{
                fontFamily: FONT,
                fontWeight: 400,
                fontSize: "clamp(32px, 4.5vw, 56px)",
                lineHeight: 1.1,
                margin: "20px 0 0",
                color: BLACK,
              }}
            >
              Insights to Help Your Brand Grow.
            </h2>
          </div>
          <Link
            href="/blog"
            style={{
              fontFamily: FONT,
              fontWeight: 400,
              fontSize: 12,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: BLACK,
              textDecoration: "none",
              whiteSpace: "nowrap",
              marginTop: 8,
            }}
          >
            View All ↗
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          {posts.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              style={{ textDecoration: "none", display: "block" }}
            >
              <div style={{ borderRadius: 16, overflow: "hidden" }}>
                <div style={{ aspectRatio: "16 / 9", overflow: "hidden" }}>
                  <img
                    src={p.image}
                    alt={p.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              </div>
              <h3
                style={{
                  fontFamily: FONT,
                  fontWeight: 400,
                  fontSize: 20,
                  color: BLACK,
                  margin: "20px 0 8px",
                }}
              >
                {p.title}
              </h3>
              <span style={{ fontFamily: FONT, fontSize: 14, color: MUTED }}>
                {p.date}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────── FOOTER ───────────────────────────────── */
function Footer() {
  const now = useNow();
  const tags = ["Content Management", "Content Creation", "Data Optimized"];
  const marqueeTags = Array.from({ length: 6 }).flatMap(() => tags);
  const navLinks = [
    { label: "Studio", href: "/studio" },
    { label: "Projects", href: "/projects" },
    { label: "Services", href: "#services" },
    { label: "Blog", href: "#blog" },
  ];

  return (
    <footer style={{ background: BLACK, color: WHITE }}>
      <style>{`@keyframes lw-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>

      {/* Marquee */}
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

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 48, flexWrap: "wrap" }}>
          {/* Left: nav links */}
          <div style={{ minWidth: 280, flex: 1, maxWidth: 380 }}>
            {navLinks.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "18px 0",
                  borderBottom: "1px solid #222222",
                  fontFamily: FONT,
                  fontWeight: 400,
                  fontSize: 20,
                  color: WHITE,
                  textDecoration: "none",
                }}
              >
                {l.label}
                <span>↗</span>
              </Link>
            ))}
            <div style={{ display: "flex", gap: 24, marginTop: 24 }}>
              <Link
                href="/privacy"
                style={{ fontFamily: FONT, fontSize: 13, color: "#666666", textDecoration: "none" }}
              >
                Privacy policy
              </Link>
              <Link
                href="/terms"
                style={{ fontFamily: FONT, fontSize: 13, color: "#666666", textDecoration: "none" }}
              >
                Terms of service
              </Link>
            </div>
          </div>

          {/* Right: contact details */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "32px 56px",
              alignContent: "start",
            }}
          >
            {[
              ["Location", "200 Roy St, Seattle WA 98109"],
              ["Contact Us", "+1 360 409 3762"],
              ["Mo-Fr", "09.00am - 06.00pm"],
              ["Email", "cassidy@linkwrightstudio.com"],
            ].map(([label, value]) => (
              <div key={label}>
                <div
                  style={{
                    fontFamily: FONT,
                    fontWeight: 400,
                    fontSize: 11,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#666666",
                    marginBottom: 10,
                  }}
                >
                  {label}
                </div>
                <div style={{ fontFamily: FONT, fontWeight: 400, fontSize: 16, color: WHITE }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 64,
            paddingTop: 28,
            borderTop: "1px solid #222222",
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
          <span
            style={{
              fontFamily: FONT,
              fontSize: 13,
              color: "#666666",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {now ? `${fmtDate(now)} / ${fmtTime(now)}` : ""}
          </span>
          <span style={{ fontFamily: FONT, fontSize: 13, color: "#666666" }}>
            ©2025 Linkwright
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ────────────────────────────── PAGE ─────────────────────────────────── */
export default function Home() {
  return (
    <main style={{ fontFamily: FONT, background: WHITE, overflowX: "hidden" }}>
      <Nav />
      <Hero />
      <About />
      <Services />
      <Process />
      <FloatingImages />
      <Pricing />
      <Faq />
      <Blog />
      <Footer />
    </main>
  );
}
