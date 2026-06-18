# CLAUDE.md — Linkwright Platform Reference

This file is the single source of truth for all Linkwright development. Claude Code reads this automatically on every session. It covers architecture, brand, copy, animations, and rules.

@AGENTS.md

---

## COMMANDS

```bash
npm run dev      # start dev server (localhost:3000, Turbopack)
npm run build    # production build
npm run lint     # ESLint
```

Run a seed script (one-off TypeScript):
```bash
npx tsx scripts/seed-clients.ts
```

No automated tests. Verify changes by hitting the running dev server directly with curl (pass `Cookie: auth=gorlin_authenticated` for agency-protected routes).

---

## ARCHITECTURE

Next.js 16 App Router platform for a LinkedIn content agency (Linkwright). Manages 5-6 bioscience clients end-to-end: post generation, visual creation, client approval, and invoicing.

### Two user roles, two portals

| Role | Login route | Cookie | Primary UI |
|------|-------------|--------|------------|
| Agency (internal) | `/login` password `#M0llydog!` | `auth=gorlin_authenticated` | `/studio` |
| Client | `/client/login` email+password | `client_session` (base64 JSON) | `/portal` |

`middleware.ts` enforces this split on every request. `/api/*` routes always allowed through for authenticated users.

### Database

libSQL via `@libsql/client`, behind a small better-sqlite3-style async wrapper in `lib/db.ts` (call sites use `await db.prepare(sql).get/all/run(...)` and `await db.exec(...)`). Local dev uses a file (`file:data/posts.db`); production uses Turso when `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` are set. All schema + migrations in `lib/db.ts` — fire-and-forget `ALTER TABLE` wrapped in try/catch. No migration framework. When adding a column, add an `ALTER TABLE` migration block there.

Tables: `clients`, `brand_kits` (1:1 with clients), `pillars` (4 per client), `posts`, `post_analytics`, `invoices`, `users`, `client_users` (per-client portal accounts, roles owner/administrator/user with per-company limits), `messages` (client and agency message threads).

`/api/clients` GET returns clients with `brand_kits` row merged into a `brand` object and `pillars` array attached. `brand` uses snake_case keys (`accent_color`, `dark_color`, `headline_font`, etc.).

### Brand context pipeline

`lib/brand-context.ts` shared by all generation routes. Handles camelCase vs snake_case duality — static company data in `lib/companies.ts` uses camelCase, DB clients use snake_case. `readBrand()` normalises both. `getBrandBlock()` returns stored `brand_prompt` or builds one dynamically.

### AI generation routes

All routes use `claude-sonnet-4-6` from `@anthropic-ai/sdk`.

| Route | Purpose | Key detail |
|-------|---------|-----------|
| `POST /api/generate` | LinkedIn post text | Tries `web_search_20250305` tool first, falls back to plain generation. Strips em dashes. |
| `POST /api/refine` | Edit existing post | Same em-dash cleanup. |
| `POST /api/visual` | SVG visual (1080x1080) | Claude generates raw SVG with Google Fonts embedded. Per-company STYLE_GUIDES override brand block. Returns `{ svg }`. |
| `POST /api/visual-refine` | Edit SVG in place | Passes current SVG + edit request back to Claude. |
| `POST /api/image-generate` | Raster image via Ideogram or Flux | Ideogram first for quote/stat/brand types; Flux first for science/photo. `maxDuration = 60`. Replicate SDK must use `useFileOutput: false`. |
| `POST /api/brand-extract` | Scrape URL to brand kit JSON | Uses `web_search` tool, auto-generates `brand_prompt`. |
| `POST /api/brand-prompt` | Regenerate brand_prompt only | |

`lib/linkedin-trends.ts` called at start of generate/refine/image-generate. Makes one-off web search, caches in-memory for 24h per `(industry, audience, timezone)` key. Resets on server restart.

### Studio page

`app/studio/page.tsx` — ~3300 lines, single `"use client"` file. All UI here. Main exported component is `Platform`. Tabs: overview, compose, library, calendar, reports, invoices, clients.

Compose tab manages full generation workflow: generate post, generate SVG or AI image, refine either, save/approve. State in `Platform`, passed as props to `ComposeTab`.

`LOGO_FILES` maps client IDs to `public/files/*_logo_final.png`. Logo files go in `public/files/`.

### Portal

`app/portal/page.tsx` — client-facing read-only view. Approved posts, change requests, analytics. Uses same `/api/posts` and `/api/auth/me` endpoints as studio.

### Static data

`lib/companies.ts` — hardcoded company array for type definitions and non-DB fallbacks. Live source of truth is SQLite. `lib/companies.ts` is mostly for TypeScript types (`Company`, `Pillar`).

---

## KEY CONVENTIONS

- NO em dashes anywhere. Both `/api/generate` and `/api/refine` post-process with `.replace(/—/g, ",").replace(/–/g, ",")`
- All Studio UI is 100% inline React styles — no CSS classes, no new UI libraries
- `public/files/` for client logos (middleware explicitly skips `files/`)
- `data/` directory is gitignored — SQLite DB is local-only
- Environment variables in `.env.local`: `ANTHROPIC_API_KEY`, `IDEOGRAM_API_KEY`, `REPLICATE_API_TOKEN`
- Do NOT use HTML form elements — use divs with onClick handlers
- All internal links use Next.js Link component

---

## RULES — READ BEFORE EVERY CHANGE

- NO em dashes anywhere. Ever. Not in copy, comments, or code.
- NO AI-sounding language. No "delve", "leverage", "unlock", "seamless", "robust".
- NO Lorem Ipsum anywhere.
- NO generic corporate language. Copy must be specific, functional, and direct.
- All copy mentions LinkedIn explicitly where relevant.
- Short declarative sentences. No punctuation flourishes.
- Section labels like ( ABOUT US ) always red, small caps, Raleway 400, 11px, letter-spacing 0.25em.
- Do not touch: API routes, database files, auth files, dashboard routes, client portal routes, LinkedIn OAuth, anything under /app/dashboard or /app/api.
- Marketing homepage lives at app/page.tsx only.

---

## BRAND

### Colors
- Red (primary): `#E30000`
- Red dot pattern (hero SVG): `#CC0000`
- Black: `#0A0A0A`
- White: `#FFFFFF`
- Light gray background: `#F5F5F5`
- Borders: `#E5E5E5`
- Muted text: `#999999`
- Secondary body text: `#666666` / `#444444`
- Faded headline text: `#CCCCCC`

### Typography
- Body / UI text: Helvetica (`Helvetica, Arial, sans-serif`)
- Display / headlines / wordmark / section titles: Raleway (`var(--font-raleway), sans-serif`), loaded in `app/layout.tsx`
- Wordmark LINKWRIGHT: Raleway weight 100, letter-spacing 0.15em
- Section labels: Raleway 400, 11px, letter-spacing 0.25em, uppercase, color #E30000
- Do NOT use Cormorant, Playfair, or gold (#C9A84C) — those are retired

### Logo
White wordmark at `public/linkwright-logo-white.png`. Use as-is on dark backgrounds. Apply `filter: brightness(0)` on light backgrounds.

### Design Reference
- Reference site: kairy.framer.website
- Aesthetic: premium, editorial, unhurried, lots of whitespace
- All sections: minimum py-24 to py-32 vertical padding
- Border radius: 12px to 16px on cards and images
- Smooth scroll behavior on html element

---

## FILE STRUCTURE — MARKETING PAGES

- `app/page.tsx` — homepage
- `app/contact/page.tsx` — contact page
- `app/blog/page.tsx` — blog index
- `app/blog/[slug]/page.tsx` — individual blog post
- `lib/blog.ts` — blog content data and types (edit to add/update posts)
- `public/images/` — all marketing images (1.png through 20.png)
- `public/files/` — client logos
- `public/linkwright-logo-white.png` — Linkwright logo

---

## IMAGES

All in `/public/images/` as numbered .png files.

- Hero: no image — red background with SVG dot pattern
- About section: 19.png (dark moody building/street)
- Floating images (Powerful Presence): 13.png (top-left), 4.png (top-right), 6.png (bottom-left), 14.png (bottom-right)
- Services: 1.png (LinkedIn Management), 2.png (Content Creation), 3.png (Data Optimization), 10.png (Performance Intelligence)
- Blog: 8.png (card 1), 20.png (card 2), 17.png (card 3), 4.png (card 4)
- Accent/texture: 11.png, 16.png

---

## HOMEPAGE SECTION ORDER (app/page.tsx)

1. Nav
2. Hero
3. About Us
4. Services
5. Our Process
6. Floating Images (Powerful Presence)
7. Pricing
8. FAQ
9. Blog
10. Footer

---

## SECTION 1: NAV

Sticky. Transparent over hero, white on scroll after 50px (useEffect scroll listener).

- Left: LW in Raleway weight 200, links to /
- Center: Home / Studio / Services / Blog
- Right: live date + time "Jun 15 / 12:29 PM" updating every second, vertical divider, "Let's Connect" pill button black border — links to /contact
- Height: 72px, padding x-8

---

## SECTION 2: HERO

Full viewport height. Background #E30000.

SVG concentric circle dot pattern top-right. Dots 2px, color #CC0000, rings spaced 18px apart, covers ~60% of right side. Programmatically generated dot positions in rings.

Wordmark: LINKWRIGHT — Raleway weight 100, font-size clamp(80px, 12vw, 160px), white, letter-spacing 0.15em, bottom-left, padding-left 48px, padding-bottom 80px.

Bottom edge: three white rectangular tab shapes overlapping next section (notched/stepped transition).

---

## SECTION 3: ABOUT US

White background. Two columns. Left: ( ABOUT US ) label. Right 65%: scroll-highlight headline.

Scroll-highlight: split into words, each motion.span. useScroll + useTransform. Words start #CCCCCC, animate to #0A0A0A sequentially as section scrolls in.

Headline: "We help companies turn LinkedIn into a growth engine through algorithm-informed content, performance analytics, and intelligent content optimization."

Below: left photo 19.png (rounded 12px, ~280px wide), right 2x2 stat grid.

Stats: 168h / 52+ / 30+ / 100%
Labels: Hours of Weekly Market Monitoring / LinkedIn Performance Indicators Tracked / Content Variables Optimized / Data-Driven Recommendations
Stat number: Raleway 700, 56px, black. Suffix: #999999. Label: Raleway 400, 14px, #666666.

Count-up animation: IntersectionObserver threshold 0.3. All four simultaneously. From (final - 10) to final. 400ms ease-out, requestAnimationFrame, trigger once only.

Divider then: "Trusted by innovative teams building their next stage of growth, we help organizations turn LinkedIn into a strategic channel for brand authority, audience engagement, and business development."

---

## SECTION 4: SERVICES

White background. Double red rule at top.

Left column (35%, sticky top-24): ( SERVICES ) label, intro text, numbered list 01-04. Active item: Raleway 600, 28px, black, red underline. Inactive: gray.

Right column (65%, sticky top-24): image panel. IntersectionObserver swaps image as each service scrolls into view. AnimatePresence fade 0.4s. Images border-radius 16px, white text overlay bottom, dark gradient, "SEE PRICING" link.

01 Complete LinkedIn Management — 1.png — "We handle your entire LinkedIn presence, from strategy and planning to publishing and optimization, so your team can stay focused on building the business."
02 Strategic Content Creation — 2.png — "Every post and branded visual is created around your goals, audience, and industry positioning. Content is reviewed and approved by you before publication."
03 Data Driven Optimization — 3.png — "Our system continuously analyzes LinkedIn performance signals, audience behavior, content trends, and engagement patterns to refine strategy and maximize impact."
04 Performance Intelligence — 10.png — "Understand what's working, why it's working, and how your content is contributing to your goals through clear reporting and actionable insights."

---

## SECTION 5: OUR PROCESS

White background. ( OUR PROCESS ) label red.

Scroll-highlight headline: "We take a collaborative approach that transforms your vision into focused, high-impact execution."

Four red cards (#E30000), border-radius 16px, padding 32px, white text. All fade in simultaneously on scroll: opacity 0 to 1, translateY 16px to 0, 350ms ease-out, IntersectionObserver threshold 0.2, trigger once.

Card 1 — Set The Goal (leaf icon): "Every LinkedIn strategy starts with a clear objective. Whether you're looking to attract investors, generate clients, recruit talent, establish authority, or increase visibility, each goal requires a different approach. We use these priorities to build a content strategy tailored to your audience and business goals."

Card 2 — We Handle The Execution (code brackets icon): "Using these insights, we create and publish content tailored to your goals. Factors such as audience location, time zones, posting cadence, content structure, and engagement patterns all influence how content is developed and distributed."

Card 3 — Adapt With The Platform (thumbs up icon): "LinkedIn's algorithm and user behavior are constantly evolving. Every week, new performance data feeds back into the system, allowing us to refine strategy, adapt content, and continuously improve results over time."

Card 4 — Decode The Data (frame icon): "Our proprietary system analyzes LinkedIn performance data, engagement patterns, audience behavior, posting times, content formats, and emerging trends to identify what is performing well for your target audience."

---

## SECTION 6: FLOATING IMAGES (POWERFUL PRESENCE)

After Our Process. White background.

Outer wrapper: min-height 300vh, overflow hidden, ref attached.
useScroll: `{ target: outerRef, offset: ["start start", "end end"] }`
Inner container: position sticky, top 0, height 100vh, flex center, overflow hidden.

All four images position absolute, start x:0 y:0 (stacked). motion.div with useTransform. `transition={{ duration: 0 }}` on all — no spring physics.

Image transforms (scrollYProgress input range [0, 0.65]):
- 13.png: x to -500px, y to -250px. Width 220px, border-radius 12px.
- 4.png: x to 500px, y to -250px. Width 260px, border-radius 12px.
- 6.png: x to -500px, y to 280px. Width 300px, border-radius 12px.
- 14.png: x to 500px, y to 280px. Width 240px, border-radius 12px.

Headline: position absolute, z-index 10, center, pointer-events none. Raleway 700, clamp(32px, 5vw, 68px), three lines:
"Powerful Presence."
"Meaningful Connections."
"Measurable Growth."

Headline opacity: useTransform(scrollYProgress, [0.5, 0.75], [0, 1])
Headline color: useTransform(scrollYProgress, [0.5, 0.85], ['#CCCCCC', '#0A0A0A'])
"CONTACT US NOW" link opacity: useTransform(scrollYProgress, [0.6, 0.8], [0, 1]) — red #E30000, links to /contact.

---

## SECTION 7: PRICING

White background. Top right: CONTACT US NOW link in #E30000 links to /contact. ( PRICING ) label bottom left.

Headline: "Flexible plans." black / "Scalable growth." #CCCCCC — Raleway 700, clamp(40px, 6vw, 80px).

Monthly/Yearly toggle. Save 30% on yearly (multiply by 0.7).

Four cards 2x2 grid. Border 1px #E5E5E5, border-radius 16px, padding 32px. Includes items have red checkmark. Best For / Outcome labels red small caps. CTA full width black button. Authority card CTA is #E30000.

FOUNDATION — $500/mo — Maintain a Professional Presence
Includes: 4 custom posts / Custom branded visuals / Monthly content planning
Best For: Early-stage companies that want to stay visible and maintain a professional presence.
Outcome: Stay active, stay relevant, and ensure your company has a voice between major milestones.

GROWTH — $1,000/mo — Build Consistent Visibility
Includes: Everything in Foundation / 8 custom posts / Performance reporting / Content pillar development / Expanded content strategy
Best For: Companies seeking greater awareness among investors, partners, recruits, and industry stakeholders.
Outcome: Build momentum through consistent, strategic communication that reinforces your expertise over time.

AUTHORITY — $1,800/mo — Establish Industry Credibility — "Most Popular" badge #E30000
Includes: Everything in Growth / 12 custom posts / Educational carousel creation / Monthly strategy consultation / Enhanced performance analysis
Best For: Organizations focused on thought leadership, fundraising, hiring, partnership development, or market expansion.
Outcome: Transform LinkedIn from a communication channel into a platform for industry influence and credibility.

MARKET LEADERSHIP — $3,200/mo — Own the Conversation
Includes: Everything in Authority / 16 custom posts / Full LinkedIn page management / Strategic community engagement / Weekly performance monitoring / Quarterly growth roadmap
Best For: Companies committed to building a dominant presence within their industry.
Outcome: Maximize visibility, strengthen industry relationships, and position your company at the center of the conversation.

---

## SECTION 8: FAQ

Top moment: "...covered." black left, red dot + "Your next month of" in #EEEEEE right. Divider below.

Left (40%): ( FAQ ) label, "Frequently Asked / Questions." (#CCCCCC), subtext, red CTA card (#E30000) "Book an introduction call" linking to /contact.

Right (60%): accordion, framer-motion height animation.

Q: Why does my company need LinkedIn?
A: LinkedIn is where your investors, partners, recruits, and customers are actively looking for companies like yours. Without a consistent presence, you're invisible to the people who matter most to your next stage of growth.

Q: How is Linkwright different from a marketing agency?
A: We are built specifically for LinkedIn. Every system, every content format, and every optimization is designed around how the LinkedIn algorithm works and what drives results on that platform. We don't do general social media management.

Q: Do I need to write the content myself?
A: No. We handle the writing, visuals, and scheduling. You review and approve content before it goes live. Your only job is to give us direction on your goals and flag anything that needs adjustment.

Q: What if my goal isn't sales?
A: Most of our clients are focused on investor visibility, talent recruitment, or industry credibility rather than direct sales. We build content strategy around whatever outcome matters most to your organization right now.

Q: How do you know what content will perform?
A: We track over 52 LinkedIn performance indicators and feed that data back into every content decision. Posting time, format, structure, topic, and engagement patterns are all analyzed continuously so the strategy improves over time.

---

## SECTION 9: BLOG

( BLOG ) label. "Insights to Help Your Brand Grow." Raleway 700 large. "VIEW ALL" top right links to /blog.

Two cards side by side, rounded 16px, image top (16/9, object-fit cover), title Raleway 600 20px, date #999999 14px. Each links to /blog/[slug]. Pull first two posts from lib/blog-posts.ts.

---

## SECTION 10: FOOTER

Background #0A0A0A.

Marquee: pill tags right to left, 30s linear infinite. translateX(0) to translateX(-50%). Pills: border #333333, rounded-full, padding x-6 y-3, white Raleway 400 18px. Text: "Content Management" / "Content Creation" / "Data Optimized" (repeat 6x, duplicated for seamless loop).

Left column: Studio / Projects / Services / Blog links with arrows, gray dividers. Privacy policy / Terms of service below.
Right column: LOCATION (200 Roy St, Seattle WA 98109) / CONTACT US (+1 360 409 3762) / MO-FR (09.00am - 06.00pm) / EMAIL (info@linkwrightstudio.com)
Bottom row: LW left / live date+time center / "2025 Linkwright" right. All #666666.

---

## CONTACT PAGE (app/contact/page.tsx)

( CONTACT ) label. Headline: "Become Part of / Linkwright Today." Raleway 700.

Left (70%): form on #F5F5F5 background, border-radius 16px, padding 40px.
Fields: Name + Email (row), Company Name (full), Message textarea (min-height 160px).
Inputs: white, border 1px #E5E5E5, border-radius 10px, padding 14px 16px, Raleway 400 15px. Focus: border #0A0A0A.
Submit: black pill button, white Raleway 600. Use div + onClick, NOT a form element.

Right (30%): EMAIL / CONTACT US / HOURS blocks with gray dividers.
info@linkwrightstudio.com / +1 360 409 3762 / MO-FR 09.00am - 06.00pm
Body: "We work with a select number of organizations at a time. If you are ready to build a serious LinkedIn presence, we would like to hear from you."

---

## BLOG (lib/blog-posts.ts + app/blog/)

To add a post: add object to blogPosts array in lib/blog-posts.ts. No other files need changing.

Fields: slug, title, date, excerpt, image, category.

Current posts:
1. why-great-companies-stay-invisible / 8.png / Strategy
2. invisible-variables-linkedin / 20.png / Performance
3. most-valuable-metric-linkedin / 17.png / Analytics
4. linkedin-advice-outdated / 4.png / Strategy

Blog index (app/blog/page.tsx): ( BLOG ) label, "Blog" headline 56px, descriptor text right-aligned, 2x2 card grid, Load More button.
Blog post (app/blog/[slug]/page.tsx): pull post by slug, hero image, title, date, body, back link.

---

## SCROLL ANIMATION TECHNIQUES

### Scroll-highlight text
- useScroll({ target: ref, offset: ["start end", "end start"] })
- Split headline into words, each motion.span
- useTransform per word, staggered ranges, #CCCCCC to #0A0A0A

### Floating images spread
- Outer: min-height 300vh, overflow hidden
- Inner: position sticky, top 0, height 100vh, flex center
- useScroll({ target: outerRef, offset: ["start start", "end end"] })
- Images: x/y useTransform on scrollYProgress [0, 0.65]
- transition={{ duration: 0 }} on all motion.divs
- Headline opacity: [0.5, 0.75] to [0, 1]
- Headline color: [0.5, 0.85] to ['#CCCCCC', '#0A0A0A']

### Stat count-up
- IntersectionObserver threshold 0.3
- All four simultaneously, (final - 10) to final, 400ms ease-out, requestAnimationFrame, once only

### Process cards fade-in
- IntersectionObserver threshold 0.2
- opacity 0 to 1, translateY 16px to 0, 350ms ease-out, all four together, once only

### Services image swap
- IntersectionObserver per service item
- activeService state 0-3, AnimatePresence fade 0.4s

### Footer marquee
- CSS keyframes translateX(0) to translateX(-50%), 30s linear infinite
- Duplicate pill set for seamless loop

---

## TECH STACK

- Next.js 16 App Router
- TypeScript
- Tailwind CSS (minimal, mostly inline styles in Studio)
- Vercel (deployment)
- framer-motion (scroll animations, transitions, accordion)
- next/font/google (Raleway)
- Anthropic Claude API / claude-sonnet-4-6
- fal.ai / Flux + Ideogram (image generation)
- Fabric.js (in-canvas editing)
- Recharts (analytics)
- SQLite via better-sqlite3
- Sharp (logo background removal)
- Puppeteer (PDF export)
- LinkedIn OAuth (per-client)

---

## DO NOT TOUCH

- /app/api/* — all API routes
- /app/dashboard/* — agency dashboard
- /app/clients/* — client portal
- /app/studio/* — studio UI (unless explicitly asked)
- /app/portal/* — client portal UI
- /lib/db* — database files
- /lib/auth* — authentication
- /lib/brand-context.ts — brand pipeline
- /lib/companies.ts — static company data
- /middleware.ts — auth middleware
- Any LinkedIn OAuth configuration
- Any .env variables
- data/ directory

---

## HOW TO USE THIS FILE

Regenerate homepage:
"Regenerate app/page.tsx using CLAUDE.md as the full specification."

Update a section:
"Update the pricing section in app/page.tsx. See CLAUDE.md for brand rules. New copy: [paste]."

Add a blog post:
"Open lib/blog-posts.ts and add: title '[x]', slug '[x]', date '[x]', excerpt '[x]', image '/images/X.png', category '[x]'."

Fix a bug:
"The services image swap is not triggering. Fix it. Do not change any other sections. See CLAUDE.md for intended behavior."

Add a new page:
"Create app/studio/page.tsx following all brand and copy rules in CLAUDE.md. Use the same Nav and Footer as the contact page."

Update CLAUDE.md after changes:
"Update CLAUDE.md to reflect these changes: [describe what changed]."
