import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogPosts } from "@/lib/blog";
import { Nav, Footer, labelStyle, FONT, BLACK, WHITE, MUTED, RED } from "../Chrome";

type Params = { slug: string };

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return { title: "Blog | Linkwright" };
  return { title: `${post.title} | Linkwright`, description: post.excerpt };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  const more = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 2);
  const initials = post.author
    ? post.author
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  return (
    <main style={{ background: WHITE, fontFamily: FONT, overflowX: "hidden" }}>
      <Nav />

      <article style={{ maxWidth: 820, margin: "0 auto", padding: "80px 32px 0" }}>
        <Link
          href="/blog"
          style={{
            fontFamily: FONT,
            fontWeight: 400,
            fontSize: 12,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: MUTED,
            textDecoration: "none",
          }}
        >
          ← Back to Blog
        </Link>

        <div style={{ marginTop: 32 }}>
          <span style={labelStyle}>( {post.category} )</span>
        </div>
        <h1
          style={{
            fontFamily: FONT,
            fontWeight: 400,
            fontSize: "clamp(32px, 5vw, 60px)",
            lineHeight: 1.1,
            color: BLACK,
            margin: "16px 0 16px",
          }}
        >
          {post.title}
        </h1>

        {post.subtitle && (
          <p
            style={{
              fontFamily: FONT,
              fontWeight: 400,
              fontSize: 22,
              lineHeight: 1.5,
              color: "#555555",
              margin: "0 0 32px",
            }}
          >
            {post.subtitle}
          </p>
        )}

        {/* Byline */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {post.author && (
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                background: RED,
                color: WHITE,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT,
                fontWeight: 400,
                fontSize: 15,
                letterSpacing: "0.05em",
                flexShrink: 0,
              }}
            >
              {initials}
            </span>
          )}
          <div>
            {post.author && (
              <div style={{ fontFamily: FONT, fontSize: 15, color: BLACK }}>
                {post.author}
                {post.authorRole ? (
                  <span style={{ color: MUTED }}>{`  ·  ${post.authorRole}`}</span>
                ) : null}
              </div>
            )}
            <div style={{ fontFamily: FONT, fontSize: 14, color: MUTED, marginTop: 2 }}>
              {post.date}
            </div>
          </div>
        </div>

        {/* Lead */}
        <p
          style={{
            fontFamily: FONT,
            fontWeight: 400,
            fontSize: 20,
            lineHeight: 1.7,
            color: "#333333",
            margin: "40px 0 0",
          }}
        >
          {post.lead ?? post.excerpt}
        </p>

        {/* Hero image */}
        <div
          style={{
            marginTop: 40,
            borderRadius: 16,
            overflow: "hidden",
            aspectRatio: "16 / 9",
          }}
        >
          <img
            src={post.image}
            alt={post.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* Body */}
        {post.content?.map((block, i) => {
          if (block.type === "heading") {
            return (
              <h2
                key={i}
                style={{
                  fontFamily: FONT,
                  fontWeight: 400,
                  fontSize: 28,
                  lineHeight: 1.25,
                  color: BLACK,
                  margin: "48px 0 16px",
                }}
              >
                {block.text}
              </h2>
            );
          }
          if (block.type === "image") {
            return (
              <div
                key={i}
                style={{
                  margin: "40px 0",
                  borderRadius: 16,
                  overflow: "hidden",
                  aspectRatio: "16 / 9",
                }}
              >
                <img
                  src={block.src}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            );
          }
          return (
            <p
              key={i}
              style={{
                fontFamily: FONT,
                fontWeight: 400,
                fontSize: 18,
                lineHeight: 1.7,
                color: "#333333",
                margin: "0 0 18px",
              }}
            >
              {block.text}
            </p>
          );
        })}
      </article>

      {/* Closing CTA */}
      <section style={{ maxWidth: 820, margin: "0 auto", padding: "56px 32px 0" }}>
        <div
          style={{
            background: RED,
            borderRadius: 16,
            padding: 36,
          }}
        >
          <h2
            style={{
              fontFamily: FONT,
              fontWeight: 400,
              fontSize: 24,
              color: WHITE,
              margin: "0 0 12px",
            }}
          >
            Ready to build a serious LinkedIn presence?
          </h2>
          <p
            style={{
              fontFamily: FONT,
              fontWeight: 400,
              fontSize: 15,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.92)",
              margin: "0 0 20px",
              maxWidth: 560,
            }}
          >
            We work with a select number of organizations at a time. Tell us about your
            goals and we will be in touch.
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
            CONTACT US NOW ↗
          </Link>
        </div>
      </section>

      {/* More posts */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "96px 32px 128px" }}>
        <span style={labelStyle}>( More Insights )</span>
        <div
          style={{
            marginTop: 32,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
          }}
        >
          {more.map((p) => (
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
              <span style={{ fontFamily: FONT, fontSize: 14, color: MUTED }}>{p.date}</span>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
