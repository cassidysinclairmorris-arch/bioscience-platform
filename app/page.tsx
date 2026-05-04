"use client";

import { useState, useEffect } from "react";

export default function LandingPage() {
  const [navShadow, setNavShadow] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", linkedin: "", goals: "" });
  const [formState, setFormState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setFormState(res.ok ? "sent" : "error");
    } catch {
      setFormState("error");
    }
  };

  useEffect(() => {
    const onScroll = () => setNavShadow(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div style={{ background: "#F4F1EC", color: "#1A1814", fontFamily: "var(--font-dm-sans, system-ui, sans-serif)", fontWeight: 300, overflowX: "hidden" }}>

      {/* ── Nav ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 48px", height: "72px",
        background: "rgba(244,241,236,0.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        borderBottom: "0.5px solid rgba(26,24,20,0.10)",
        boxShadow: navShadow ? "0 1px 24px rgba(26,24,20,0.08)" : "none",
        transition: "box-shadow 0.3s",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "20px", textDecoration: "none", flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/linkwright-logo.png" alt="Linkwright" style={{ height: "170px", objectFit: "contain" }} />
          <div style={{ width: "0.5px", height: "28px", background: "rgba(26,24,20,0.15)" }} />
          <span style={{
            fontFamily: "var(--font-cormorant, Georgia, serif)",
            fontSize: "13px", fontWeight: 300, fontStyle: "italic",
            color: "rgba(26,24,20,0.45)", letterSpacing: "0.01em", whiteSpace: "nowrap",
          }}>
            Engineered for LinkedIn. Optimised for 2026.
          </span>
        </a>

        <ul style={{ display: "flex", gap: "40px", listStyle: "none", alignItems: "center", justifyContent: "flex-end", flex: 1 }}>
          {[["About", "#about"], ["Services", "#services"], ["Insights", "#insights"], ["Contact", "#contact"]].map(([label, href]) => (
            <li key={label}>
              <a href={href} className="nav-link" style={{
                fontFamily: "var(--font-dm-sans, system-ui, sans-serif)",
                fontSize: "13px", fontWeight: 400, letterSpacing: "0.05em",
                color: "#4A4740", textDecoration: "none", transition: "color 0.2s",
              }}>{label}</a>
            </li>
          ))}
        </ul>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "36px", flexShrink: 0 }}>
          <a href="/portal/login" style={{
            fontFamily: "var(--font-dm-sans, system-ui, sans-serif)",
            fontSize: "11px", fontWeight: 500, letterSpacing: "0.10em", textTransform: "uppercase",
            color: "#4A4740", textDecoration: "none",
            padding: "8px 16px",
            border: "0.5px solid rgba(26,24,20,0.22)",
            transition: "border-color 0.2s, color 0.2s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#1A1814"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,24,20,0.5)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4A4740"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,24,20,0.22)"; }}
          >Client Portal</a>
          <a href="/login" style={{
            fontFamily: "var(--font-dm-sans, system-ui, sans-serif)",
            fontSize: "11px", fontWeight: 500, letterSpacing: "0.10em", textTransform: "uppercase",
            color: "#F4F1EC", background: "#1A1814", textDecoration: "none",
            padding: "8px 16px",
            transition: "opacity 0.2s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.8"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >Agency Login</a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr", paddingTop: "72px" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 64px 80px 48px" }}>
          <p style={{
            fontFamily: "var(--font-dm-sans, system-ui, sans-serif)",
            fontSize: "11px", fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase",
            color: "#8A8680", marginBottom: "32px", display: "flex", alignItems: "center", gap: "12px",
          }}>
            <span style={{ display: "block", width: "32px", height: "0.5px", background: "#8A8680", flexShrink: 0 }} />
            LinkedIn Growth Agency
          </p>

          <h1 style={{
            fontFamily: "var(--font-cormorant, Georgia, serif)",
            fontSize: "clamp(52px, 6vw, 88px)", fontWeight: 300,
            lineHeight: 1.05, letterSpacing: "-0.02em", color: "#1A1814", marginBottom: "32px",
          }}>
            Build influence.<br />
            <em style={{ fontStyle: "italic", color: "#4A4740" }}>Generate pipeline.</em><br />
            Stay authentic.
          </h1>

          <p style={{ fontSize: "16px", fontWeight: 300, lineHeight: 1.7, color: "#4A4740", maxWidth: "400px", marginBottom: "48px" }}>
            Linkwright engineers LinkedIn presences that attract, engage, and convert. Built for founders, executives, and B2B brands who understand that attention is the new currency.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
            <a href="#contact" className="btn-primary">Start a Conversation</a>
            <a href="#services" className="btn-ghost">Our Services</a>
          </div>
        </div>

        <div style={{ position: "relative", overflow: "hidden", background: "#1A1814" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero.png"
            alt="" aria-hidden="true"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.52) contrast(1.2) saturate(0.85)" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(26,24,20,0.05) 0%, rgba(26,24,20,0.82) 100%)" }} />
          <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "flex-end", padding: "48px 40px" }}>
            <div style={{ borderLeft: "1px solid rgba(244,241,236,0.18)", paddingLeft: "24px" }}>
              <p style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "26px", fontStyle: "italic", color: "rgba(244,241,236,0.90)", letterSpacing: "0.01em", lineHeight: 1.45 }}>
                Your LinkedIn profile is your most valuable real estate in professional media.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tagline strip ── */}
      <div style={{ background: "#1A1814", color: "#F4F1EC", padding: "20px 48px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <div className="marquee-track" style={{ display: "flex", gap: "80px", whiteSpace: "nowrap" }}>
          {["Engineered for LinkedIn", "·", "Optimised for 2026", "·", "Engineered for LinkedIn", "·", "Optimised for 2026", "·", "Engineered for LinkedIn", "·", "Optimised for 2026", "·", "Engineered for LinkedIn", "·", "Optimised for 2026"].map((t, i) => (
            <span key={i} style={{
              fontFamily: "var(--font-cormorant, Georgia, serif)",
              fontSize: "18px", fontWeight: 300, fontStyle: "italic", letterSpacing: "0.03em",
              color: t === "·" ? "rgba(244,241,236,0.3)" : "rgba(244,241,236,0.9)",
              flexShrink: 0,
            }}>{t}</span>
          ))}
        </div>
      </div>

      {/* ── Cinematic visual break ── */}
      <div style={{ position: "relative", height: "560px", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/about.png"
          alt="" aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.38) contrast(1.15) saturate(0.65)" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(26,24,20,0.5) 0%, rgba(26,24,20,0.3) 50%, rgba(26,24,20,0.65) 100%)" }} />
        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 48px" }}>
          <div style={{ width: "0.5px", height: "56px", background: "rgba(244,241,236,0.18)", marginBottom: "44px" }} />
          <p style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "clamp(28px, 4vw, 54px)", fontWeight: 300, fontStyle: "italic", color: "#F4F1EC", lineHeight: 1.15, maxWidth: "720px", letterSpacing: "-0.01em" }}>
            "We don&apos;t write content.<br />We build careers."
          </p>
          <div style={{ width: "0.5px", height: "56px", background: "rgba(244,241,236,0.18)", marginTop: "44px" }} />
        </div>
      </div>

      {/* ── About ── */}
      <section style={{ padding: "120px 48px" }} id="about">
        <p className="section-label" data-reveal="">About</p>
        <h2 data-reveal="" style={{
          fontFamily: "var(--font-cormorant, Georgia, serif)",
          fontSize: "clamp(36px, 4vw, 60px)", fontWeight: 300, lineHeight: 1.1,
          color: "#1A1814", maxWidth: "900px", marginBottom: "64px",
        }}>
          A specialist LinkedIn growth partner for professionals who want presence, pipeline, and proof of expertise. Built on strategy, not guesswork.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", background: "rgba(26,24,20,0.1)", border: "0.5px solid rgba(26,24,20,0.1)" }}>
          {[
            { num: "400M+", title: "Decision Makers", text: "LinkedIn hosts more B2B decision-makers than any other platform. We help you reach the right ones, consistently." },
            { num: "3×",    title: "Conversion Rate", text: "LinkedIn-sourced leads convert at three times the rate of other social channels. Positioning matters.", delay: "1" },
            { num: "2026",  title: "Built for Now",   text: "The algorithm, the formats, the audience expectations. All evolved. Our playbooks are written for today, not 2022.", delay: "2" },
          ].map((s) => (
            <div key={s.num} data-reveal="" data-delay={s.delay} style={{ background: "#F4F1EC", padding: "48px 40px" }}>
              <div style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "56px", fontWeight: 300, color: "#1A1814", marginBottom: "16px", lineHeight: 1 }}>{s.num}</div>
              <p style={{ fontFamily: "var(--font-dm-sans, system-ui, sans-serif)", fontSize: "13px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#1A1814", marginBottom: "12px" }}>{s.title}</p>
              <p style={{ fontSize: "14px", fontWeight: 300, lineHeight: 1.7, color: "#4A4740" }}>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Split: Who We Work With ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "600px" }}>
        <div style={{ position: "relative", overflow: "hidden", background: "#EDE8E0" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/services.png"
            alt="" aria-hidden="true"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "brightness(1.05) contrast(1.05) saturate(0.6)" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(244,241,236,0.72) 0%, rgba(244,241,236,0.50) 100%)" }} />
          <div style={{ minHeight: "600px" }} />
        </div>
        <div data-reveal="" style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 64px", background: "#F4F1EC" }}>
          <p className="section-label">Who We Work With</p>
          <h3 style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "clamp(32px, 3.5vw, 52px)", fontWeight: 300, lineHeight: 1.15, color: "#1A1814", marginBottom: "24px" }}>
            Founders who need to be known before they're needed.
          </h3>
          <p style={{ fontSize: "15px", fontWeight: 300, lineHeight: 1.8, color: "#4A4740", marginBottom: "40px" }}>
            We partner with B2B founders, C-suite executives, and ambitious professionals who want to turn LinkedIn into a predictable channel for trust, inbound leads, and industry authority. If your name should be the first one mentioned in your category, we build that reality.
          </p>
          <a href="#contact" className="btn-ghost">Talk to us</a>
        </div>
      </div>

      {/* ── Services ── */}
      <section style={{ padding: "120px 48px" }} id="services">
        <p className="section-label" data-reveal="">Services</p>
        <h2 data-reveal="" style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "clamp(36px, 4vw, 60px)", fontWeight: 300, lineHeight: 1.1, color: "#1A1814", maxWidth: "700px", marginBottom: "64px" }}>
          Everything you need to own LinkedIn in your category.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "rgba(26,24,20,0.1)", border: "0.5px solid rgba(26,24,20,0.1)" }}>
          {[
            { n: "01", title: "Profile Architecture",  desc: "From headline to featured section. Every element of your profile engineered to convert visitors into conversations.", delay: undefined },
            { n: "02", title: "Content Strategy",       desc: "A bespoke content blueprint built around your voice, your expertise, and the audience you're trying to reach.", delay: "1" },
            { n: "03", title: "Ghostwriting",           desc: "Premium long-form posts, carousels, and thought-leadership pieces written in your voice, published at cadence.", delay: "2" },
            { n: "04", title: "Growth Systems",         desc: "Engagement frameworks, network-building protocols, and outreach sequences that compound over time.", delay: undefined },
            { n: "05", title: "Company Pages",          desc: "Full company page transformation: positioning, content pillars, employee advocacy activation, and follower growth.", delay: "1" },
            { n: "06", title: "Analytics & Reporting",  desc: "Monthly intelligence reports tracking reach, engagement, inbound quality, and progress against agreed KPIs.", delay: "2" },
          ].map((s) => (
            <a key={s.n} href="#" data-reveal="" data-delay={s.delay} className="service-card" style={{ background: "#F4F1EC", padding: "48px 40px", position: "relative", overflow: "hidden", textDecoration: "none", color: "inherit", display: "block", transition: "background 0.3s" }}>
              <span style={{ display: "block", fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "13px", fontWeight: 400, color: "#8A8680", marginBottom: "48px", transition: "color 0.3s" }}>{s.n}</span>
              <h3 style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "26px", fontWeight: 400, color: "#1A1814", marginBottom: "16px", lineHeight: 1.2, transition: "color 0.3s" }}>{s.title}</h3>
              <p style={{ fontSize: "14px", fontWeight: 300, lineHeight: 1.7, color: "#4A4740", transition: "color 0.3s" }}>{s.desc}</p>
              <span style={{ position: "absolute", bottom: "40px", right: "40px", fontSize: "20px", color: "#8A8680", transition: "color 0.3s, transform 0.3s" }}>↗</span>
            </a>
          ))}
        </div>
      </section>

      {/* ── Philosophy strip ── */}
      <section style={{ background: "#1A1814", padding: "100px 48px" }}>
        <h2 data-reveal="" style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "clamp(40px, 5vw, 72px)", fontWeight: 300, fontStyle: "italic", lineHeight: 1.1, color: "#F4F1EC", maxWidth: "800px", margin: "0 auto 64px", textAlign: "center" }}>
          "The best LinkedIn content doesn't feel like marketing. It feels like thinking out loud."
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "48px", maxWidth: "900px", margin: "0 auto" }}>
          {[
            { title: "Authentic",  text: "Every post sounds like you. No generic templates. No AI-flavoured filler." },
            { title: "Strategic",  text: "Content mapped to your business goals, not vanity metrics.", delay: "1" },
            { title: "Consistent", text: "Authority is built in the long run. We keep you showing up.", delay: "2" },
          ].map((p) => (
            <div key={p.title} data-reveal="" data-delay={(p as { delay?: string }).delay}>
              <p style={{ fontFamily: "var(--font-dm-sans, system-ui, sans-serif)", fontSize: "11px", fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(244,241,236,0.5)", marginBottom: "12px" }}>{p.title}</p>
              <p style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "20px", fontWeight: 300, color: "rgba(244,241,236,0.9)", lineHeight: 1.4 }}>{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Insights ── */}
      <section style={{ padding: "120px 48px" }} id="insights">
        <p className="section-label" data-reveal="">Insights</p>
        <h2 data-reveal="" style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "clamp(36px, 4vw, 60px)", fontWeight: 300, lineHeight: 1.1, color: "#1A1814", maxWidth: "600px", marginBottom: "64px" }}>
          Thinking on LinkedIn, personal branding, and the future of B2B attention.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "rgba(26,24,20,0.1)", border: "0.5px solid rgba(26,24,20,0.1)" }}>
          {[
            { bg: "linear-gradient(180deg, rgba(58,53,48,0.20) 0%, rgba(26,24,20,0.92) 100%)", photo: "/images/hero.png",     quote: "The Algorithm Shift of 2026", tag: "Strategy",       title: "What LinkedIn's algorithm actually rewards in 2026, and how to use it.", delay: undefined },
            { bg: "linear-gradient(180deg, rgba(44,52,58,0.20) 0%, rgba(20,24,36,0.92) 100%)",  photo: "/images/about.png",    quote: "Founder-Led Growth",          tag: "Personal Brand", title: "Why the founder's face is now the most powerful channel a B2B company has.", delay: "1" },
            { bg: "linear-gradient(180deg, rgba(30,44,58,0.20) 0%, rgba(20,28,36,0.92) 100%)",  photo: "/images/services.png", quote: "Writing That Converts",        tag: "Content",        title: "The anatomy of a LinkedIn post that generates inbound leads, not just likes.", delay: "2" },
          ].map((c) => (
            <a key={c.tag} href="#" data-reveal="" data-delay={c.delay} className="insight-card" style={{ background: "#F4F1EC", overflow: "hidden", textDecoration: "none", color: "inherit", display: "block", transition: "background 0.2s" }}>
              <div style={{ width: "100%", aspectRatio: "3/4", position: "relative", overflow: "hidden" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.photo}
                  alt="" aria-hidden="true"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.48) contrast(1.15) saturate(0.75)" }}
                />
                <div style={{ position: "absolute", inset: 0, background: c.bg }} />
                <div style={{ position: "relative", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "28px", fontWeight: 300, color: "rgba(255,255,255,0.92)", fontStyle: "italic", textAlign: "center", padding: "32px" }}>{c.quote}</p>
                </div>
              </div>
              <div style={{ padding: "32px" }}>
                <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8A8680", marginBottom: "12px" }}>{c.tag}</p>
                <h3 style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "22px", fontWeight: 400, lineHeight: 1.3, color: "#1A1814" }}>{c.title}</h3>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" style={{ background: "#EDE8E0", padding: "120px 48px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "start" }}>
        <div data-reveal="">
          <p className="section-label">Contact</p>
          <h2 style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "clamp(36px, 4vw, 60px)", fontWeight: 300, lineHeight: 1.1, color: "#1A1814", marginBottom: "24px" }}>
            If LinkedIn should be working harder for you, let's talk.
          </h2>
          <p style={{ fontSize: "15px", fontWeight: 300, lineHeight: 1.8, color: "#4A4740" }}>
            We take on a limited number of new clients each quarter to ensure quality. Tell us about your goals and we'll be in touch within 48 hours.
          </p>
          <div style={{ marginTop: "48px", paddingTop: "32px", borderTop: "0.5px solid rgba(26,24,20,0.15)" }}>
            <p style={{ fontSize: "13px", color: "#8A8680", letterSpacing: "0.05em", marginBottom: "8px" }}>Email</p>
            <a href="mailto:info@linkwrightstudio.com" style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "22px", fontWeight: 300, color: "#1A1814", textDecoration: "none" }}>info@linkwrightstudio.com</a>
          </div>
        </div>

        {formState === "sent" ? (
          <div data-reveal="" style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "16px", padding: "48px 0" }}>
            <div style={{ width: "40px", height: "1px", background: "#C9A84C" }} />
            <p style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "28px", fontWeight: 300, fontStyle: "italic", color: "#1A1814", lineHeight: 1.3 }}>
              Thank you. We&apos;ll be in touch within 48 hours.
            </p>
          </div>
        ) : (
          <form data-reveal="" data-delay="1" onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column" }}>
            {[
              { label: "Name",                name: "name",     type: "text",  placeholder: "Your name" },
              { label: "Email",               name: "email",    type: "email", placeholder: "your@email.com" },
              { label: "LinkedIn Profile URL", name: "linkedin", type: "url",   placeholder: "linkedin.com/in/yourprofile" },
            ].map((f) => (
              <div key={f.label} style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8A8680", marginBottom: "8px" }}>{f.label}</label>
                <input type={f.type} name={f.name} value={form[f.name as keyof typeof form]} onChange={handleFormChange} placeholder={f.placeholder} required={f.name !== "linkedin"} className="form-input" style={{ width: "100%", padding: "14px 0", border: "none", borderBottom: "0.5px solid rgba(26,24,20,0.3)", background: "transparent", fontFamily: "var(--font-dm-sans, system-ui, sans-serif)", fontSize: "15px", fontWeight: 300, color: "#1A1814", outline: "none" }} />
              </div>
            ))}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8A8680", marginBottom: "8px" }}>Tell us your goals</label>
              <textarea name="goals" value={form.goals} onChange={handleFormChange} placeholder="What are you trying to achieve on LinkedIn?" rows={4} required className="form-input" style={{ width: "100%", padding: "14px 0", border: "none", borderBottom: "0.5px solid rgba(26,24,20,0.3)", background: "transparent", fontFamily: "var(--font-dm-sans, system-ui, sans-serif)", fontSize: "15px", fontWeight: 300, color: "#1A1814", outline: "none", resize: "vertical" }} />
            </div>
            {formState === "error" && (
              <p style={{ fontSize: "13px", color: "#cc3333", marginBottom: "12px" }}>Something went wrong. Please email us directly at info@linkwrightstudio.com</p>
            )}
            <button type="submit" disabled={formState === "sending"} className="btn-primary" style={{ marginTop: "16px", width: "100%", textAlign: "center", cursor: formState === "sending" ? "not-allowed" : "pointer", fontFamily: "var(--font-dm-sans, system-ui, sans-serif)", fontSize: "12px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", background: formState === "sending" ? "rgba(26,24,20,0.4)" : "#1A1814", color: "#F4F1EC", padding: "14px 32px", border: "none", opacity: formState === "sending" ? 0.7 : 1 }}>
              {formState === "sending" ? "Sending…" : "Send Message"}
            </button>
          </form>
        )}
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: "#1A1814", color: "#F4F1EC", padding: "80px 48px 48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "48px", marginBottom: "64px" }}>
          <div>
            <div style={{ marginTop: "-160px", marginBottom: "0" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/linkwright-logo.png" alt="Linkwright" style={{ height: "500px", objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.22 }} />
            </div>
            <p style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: "18px", fontWeight: 300, fontStyle: "italic", color: "rgba(244,241,236,0.7)", marginTop: "20px", lineHeight: 1.5 }}>
              Engineered for LinkedIn.<br />Optimised for 2026.
            </p>
          </div>

          <div>
            <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(244,241,236,0.4)", marginBottom: "20px" }}>Navigation</p>
            <ul style={{ listStyle: "none" }}>
              {[["Home", "/landing"], ["About", "#about"], ["Services", "#services"], ["Insights", "#insights"], ["Contact", "#contact"]].map(([label, href]) => (
                <li key={label} style={{ marginBottom: "12px" }}>
                  <a href={href} style={{ fontSize: "14px", fontWeight: 300, color: "rgba(244,241,236,0.7)", textDecoration: "none", transition: "color 0.2s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F4F1EC"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(244,241,236,0.7)"; }}
                  >{label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(244,241,236,0.4)", marginBottom: "20px" }}>Services</p>
            <ul style={{ listStyle: "none" }}>
              {["Profile Architecture", "Content Strategy", "Ghostwriting", "Growth Systems", "Company Pages"].map(label => (
                <li key={label} style={{ marginBottom: "12px" }}>
                  <a href="#services" style={{ fontSize: "14px", fontWeight: 300, color: "rgba(244,241,236,0.7)", textDecoration: "none", transition: "color 0.2s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F4F1EC"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(244,241,236,0.7)"; }}
                  >{label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(244,241,236,0.4)", marginBottom: "20px" }}>Legal</p>
            <ul style={{ listStyle: "none" }}>
              {["Privacy Policy", "Terms of Service"].map(label => (
                <li key={label} style={{ marginBottom: "12px" }}>
                  <a href="#" style={{ fontSize: "14px", fontWeight: 300, color: "rgba(244,241,236,0.7)", textDecoration: "none", transition: "color 0.2s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F4F1EC"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(244,241,236,0.7)"; }}
                  >{label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ borderTop: "0.5px solid rgba(244,241,236,0.1)", paddingTop: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: "13px", fontWeight: 300, color: "rgba(244,241,236,0.4)" }}>© 2026 Linkwright. All rights reserved.</p>
        </div>
      </footer>

      <style>{`
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -2px; left: 0; right: 0;
          height: 0.5px;
          background: #1A1814;
          transform: scaleX(0);
          transition: transform 0.25s;
        }
        .nav-link { position: relative; }
        .nav-link:hover { color: #1A1814 !important; }
        .nav-link:hover::after { transform: scaleX(1); }

        .btn-primary {
          font-family: var(--font-dm-sans, system-ui, sans-serif);
          font-size: 12px; font-weight: 500; letter-spacing: 0.12em;
          text-transform: uppercase;
          background: #1A1814; color: #F4F1EC;
          padding: 14px 32px; border: none; cursor: pointer;
          text-decoration: none; display: inline-block;
          transition: opacity 0.2s;
        }
        .btn-primary:hover { opacity: 0.8; }

        .btn-ghost {
          font-family: var(--font-dm-sans, system-ui, sans-serif);
          font-size: 13px; font-weight: 400;
          color: #4A4740; text-decoration: none;
          display: inline-flex; align-items: center; gap: 8px;
          transition: color 0.2s;
        }
        .btn-ghost:hover { color: #1A1814; }
        .btn-ghost::after { content: '→'; display: inline-block; transition: transform 0.2s; }
        .btn-ghost:hover::after { transform: translateX(4px); }

        .section-label {
          font-family: var(--font-dm-sans, system-ui, sans-serif);
          font-size: 11px; font-weight: 500;
          letter-spacing: 0.2em; text-transform: uppercase;
          color: #8A8680; margin-bottom: 40px;
          display: flex; align-items: center; gap: 12px;
        }
        .section-label::before {
          content: ''; display: block;
          width: 24px; height: 0.5px; background: #8A8680; flex-shrink: 0;
        }

        .service-card:hover { background: #1A1814 !important; }
        .service-card:hover h3,
        .service-card:hover p,
        .service-card:hover span { color: rgba(244,241,236,0.9) !important; }
        .service-card:hover span:last-child {
          color: rgba(244,241,236,0.6) !important;
          transform: translate(4px, -4px);
        }

        .insight-card:hover { background: #EDE8E0 !important; }

        .form-input:focus { border-bottom-color: #1A1814 !important; }
        .form-input::placeholder { color: #8A8680; }

        [data-reveal] { opacity: 0; transform: translateY(28px); transition: opacity 0.8s ease, transform 0.8s ease; }
        [data-reveal].visible { opacity: 1; transform: translateY(0); }
        [data-reveal][data-delay="1"] { transition-delay: 0.1s; }
        [data-reveal][data-delay="2"] { transition-delay: 0.2s; }
        [data-reveal][data-delay="3"] { transition-delay: 0.3s; }

        @media (max-width: 900px) {
          nav { padding: 0 24px; }
          nav ul { display: none !important; }
        }
      `}</style>
    </div>
  );
}
