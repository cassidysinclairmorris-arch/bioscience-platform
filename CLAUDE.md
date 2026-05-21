# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (localhost:3000, Turbopack)
npm run build    # production build
npm run lint     # ESLint
```

Run a seed script (one-off TypeScript):
```bash
npx tsx scripts/seed-clients.ts
```

There are no automated tests. Verify changes by hitting the running dev server directly with `curl` (pass `Cookie: auth=gorlin_authenticated` for agency-protected routes).

## Architecture

This is a **Next.js 16 App Router** platform for a LinkedIn content agency (Linkwright). It manages 5–6 bioscience clients end-to-end: post generation, visual creation, client approval, and invoicing.

### Two user roles, two portals

| Role | Login route | Cookie | Primary UI |
|------|-------------|--------|------------|
| Agency (internal) | `/login` → password `#M0llydog!` | `auth=gorlin_authenticated` | `/studio` |
| Client | `/portal/login` → email+password | `user_session` (base64 JSON: `{role, clientId, email}`) | `/portal` |

`middleware.ts` enforces this split on every request. `/api/*` routes are always allowed through for authenticated users — the middleware does not restrict by HTTP method.

### Database

SQLite via `better-sqlite3`, file at `data/posts.db`. All schema + migrations live in `lib/db.ts` — migrations are fire-and-forget `ALTER TABLE` wrapped in `try/catch`. **No migration framework.** When adding a column, add an `ALTER TABLE` migration block there.

Tables: `clients`, `brand_kits` (1:1 with clients), `pillars` (4 per client), `posts`, `post_analytics`, `invoices`, `users`.

`/api/clients` GET returns clients with their `brand_kits` row merged into a `brand` object and `pillars` array attached. This is the shape everything downstream consumes — `brand` uses **snake_case** keys (`accent_color`, `dark_color`, `headline_font`, etc.).

### Brand context pipeline

`lib/brand-context.ts` is shared by all generation routes. It handles the **camelCase vs snake_case duality** — static company data in `lib/companies.ts` uses camelCase, DB clients use snake_case — `readBrand()` normalises both. `getBrandBlock()` returns either a stored `brand_prompt` (Claude-authored, reusable context block) or builds one dynamically from raw tokens.

### AI generation routes

All routes use `claude-sonnet-4-6` from `@anthropic-ai/sdk`.

| Route | Purpose | Key detail |
|-------|---------|-----------|
| `POST /api/generate` | LinkedIn post text | Tries `web_search_20250305` tool first, falls back to plain generation. Post-processes output to strip em dashes. |
| `POST /api/refine` | Edit an existing post | Same em-dash cleanup applied. |
| `POST /api/visual` | SVG visual (1080×1080) | Claude generates raw SVG with Google Fonts embedded. Per-company `STYLE_GUIDES` override the dynamic brand block. Returns `{ svg }`. |
| `POST /api/visual-refine` | Edit SVG in place | Passes current SVG + edit request back to Claude. |
| `POST /api/image-generate` | Raster image via Ideogram or Flux | Ideogram first for quote/stat/brand types; Flux first for science/photo. `export const maxDuration = 60` set for Vercel. Replicate SDK must be instantiated with `useFileOutput: false` (SDK ≥1.0 returns `FileOutput` objects by default, not URL strings). |
| `POST /api/brand-extract` | Scrape a URL → brand kit JSON | Uses `web_search` tool, auto-generates `brand_prompt` via `generateBrandPrompt()`. |
| `POST /api/brand-prompt` | Regenerate brand_prompt only | |

`lib/linkedin-trends.ts` is called at the start of generate/refine/image-generate. It makes a one-off web search call and caches the result **in-memory** for 24h per `(industry, audience, timezone)` key. Cache resets on server restart.

### Studio page (`app/studio/page.tsx`)

~3300 lines, single `"use client"` file. All UI lives here — no component library, no CSS framework beyond Tailwind (used minimally). The main exported component is `Platform`. Tabs: overview, compose, library, calendar, reports, invoices, clients.

The **compose tab** manages the full generation workflow: generate post → generate SVG or AI image → refine either → save/approve. State lives in `Platform` and is passed as props to the `ComposeTab` sub-component.

`LOGO_FILES` maps client IDs to `public/files/*_logo_final.png` paths. Logo files go in `public/files/`.

### Portal (`app/portal/page.tsx`)

Client-facing read-only view: see approved posts, request changes, view analytics. Communicates with the same `/api/posts` and `/api/auth/me` endpoints as the studio.

### Static data

`lib/companies.ts` contains a hardcoded company array used for type definitions and any non-DB fallbacks. The live source of truth for clients is the SQLite DB — `lib/companies.ts` is mostly used for TypeScript types (`Company`, `Pillar`).

## Key conventions

- **No em dashes** in any AI-generated post text. Both `/api/generate` and `/api/refine` post-process output with `.replace(/—/g, ",").replace(/–/g, ",")`.
- All inline styles — the Studio UI is 100% inline React styles, no CSS classes.
- `public/files/` for client logos (served unprotected — middleware explicitly skips `files/`).
- `data/` directory is gitignored; the SQLite DB is local-only.
- Environment variables in `.env.local`: `ANTHROPIC_API_KEY`, `IDEOGRAM_API_KEY`, `REPLICATE_API_TOKEN`.
