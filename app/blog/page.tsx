import Link from "next/link";
import type { Metadata } from "next";
import { blogPosts } from "@/lib/blog";
import { Nav, Footer, labelStyle, FONT, BLACK, WHITE, MUTED, RED } from "./Chrome";

export const metadata: Metadata = {
  title: "Blog | Linkwright",
  description: "Insights to help your brand grow on LinkedIn.",
};

export default function BlogIndexPage() {
  return (
    <main style={{ background: WHITE, fontFamily: FONT, overflowX: "hidden" }}>
      <Nav />

      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "96px 32px 0" }}>
        <span style={labelStyle}>( Blog )</span>
        <h1
          style={{
            fontFamily: FONT,
            fontWeight: 400,
            fontSize: "clamp(40px, 6vw, 72px)",
            lineHeight: 1.05,
            color: BLACK,
            margin: "20px 0 0",
            maxWidth: 900,
          }}
        >
          Insights to Help Your Brand Grow.
        </h1>
      </section>

      <section
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "64px 32px 128px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "48px 32px",
        }}
      >
        {blogPosts.map((p) => (
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
            <span
              style={{
                display: "inline-block",
                marginTop: 20,
                fontFamily: FONT,
                fontWeight: 400,
                fontSize: 11,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: RED,
              }}
            >
              {p.category}
            </span>
            <h2
              style={{
                fontFamily: FONT,
                fontWeight: 400,
                fontSize: 24,
                lineHeight: 1.25,
                color: BLACK,
                margin: "12px 0 10px",
              }}
            >
              {p.title}
            </h2>
            <p
              style={{
                fontFamily: FONT,
                fontWeight: 400,
                fontSize: 15,
                lineHeight: 1.6,
                color: "#666666",
                margin: "0 0 12px",
              }}
            >
              {p.excerpt}
            </p>
            <span style={{ fontFamily: FONT, fontSize: 14, color: MUTED }}>{p.date}</span>
          </Link>
        ))}
      </section>

      <Footer />
    </main>
  );
}
