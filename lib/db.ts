import { createClient, type Client as LibsqlClient, type InValue } from "@libsql/client";
import path from "path";
import fs from "fs";
import { createHash } from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

let rawClient: LibsqlClient | null = null;
let ready: Promise<void> | null = null;

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

// libSQL client: a local file in dev, a remote Turso database in production.
function client(): LibsqlClient {
  if (!rawClient) {
    const url = process.env.TURSO_DATABASE_URL || `file:${path.join(DATA_DIR, "posts.db")}`;
    rawClient = url.startsWith("file:")
      ? createClient({ url })
      : createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  return rawClient;
}

async function initialize(): Promise<void> {
  const c = client();
  await c.executeMultiple(`
      CREATE TABLE IF NOT EXISTS posts (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id    TEXT    NOT NULL,
        company_name  TEXT    NOT NULL,
        post_type     TEXT    NOT NULL,
        scheduled_day TEXT    NOT NULL,
        content       TEXT    NOT NULL,
        status        TEXT    NOT NULL DEFAULT 'draft',
        notes         TEXT,
        week_number   INTEGER,
        created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS clients (
        id              TEXT    PRIMARY KEY,
        name            TEXT    NOT NULL,
        tagline         TEXT,
        color           TEXT    DEFAULT '#0066ff',
        timezone        TEXT    DEFAULT 'EST',
        audience        TEXT,
        voice           TEXT,
        posting_days    TEXT    DEFAULT '["Tuesday","Wednesday","Thursday","Friday"]',
        best_post_times TEXT    DEFAULT '{}',
        active          INTEGER DEFAULT 1,
        logo_file       TEXT,
        created_at      TEXT    DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS brand_kits (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id      TEXT    NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        palette        TEXT    DEFAULT '[]',
        visual_mood    TEXT,
        logo_text      TEXT,
        accent_color   TEXT,
        dark_color     TEXT,
        light_color    TEXT,
        key_phrases    TEXT    DEFAULT '[]',
        badges         TEXT    DEFAULT '[]',
        primary_font   TEXT,
        secondary_font TEXT,
        headline_font  TEXT,
        body_font      TEXT,
        brand_prompt   TEXT,
        updated_at     TEXT    DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS pillars (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id  TEXT    NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        day        TEXT    NOT NULL,
        type       TEXT    NOT NULL,
        color      TEXT,
        example    TEXT,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id          TEXT PRIMARY KEY,
        number      TEXT NOT NULL,
        client_id   TEXT REFERENCES clients(id),
        client_name TEXT NOT NULL,
        date        TEXT NOT NULL,
        due_date    TEXT NOT NULL,
        items       TEXT NOT NULL DEFAULT '[]',
        status      TEXT DEFAULT 'pending',
        tax_rate    REAL DEFAULT 0,
        notes       TEXT DEFAULT '',
        created_at  TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS post_analytics (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id         INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        client_id       TEXT    REFERENCES clients(id),
        impressions     INTEGER DEFAULT 0,
        engagement_rate REAL    DEFAULT 0,
        clicks          INTEGER DEFAULT 0,
        likes           INTEGER DEFAULT 0,
        comments        INTEGER DEFAULT 0,
        reposts         INTEGER DEFAULT 0,
        recorded_at     TEXT    DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        email         TEXT    NOT NULL UNIQUE,
        password_hash TEXT    NOT NULL,
        role          TEXT    NOT NULL DEFAULT 'client',
        client_id     TEXT    REFERENCES clients(id),
        created_at    TEXT    DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS reports (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id        TEXT    NOT NULL REFERENCES clients(id),
        type             TEXT    NOT NULL DEFAULT 'monthly',
        period_start     TEXT    NOT NULL,
        period_end       TEXT    NOT NULL,
        status           TEXT    NOT NULL DEFAULT 'draft',
        raw_pdf_url      TEXT,
        extracted_data   TEXT,
        narrative_agency TEXT,
        narrative_client TEXT,
        created_at       TEXT    DEFAULT (datetime('now')),
        updated_at       TEXT    DEFAULT (datetime('now')),
        published_at     TEXT
      );

      CREATE TABLE IF NOT EXISTS client_users (
        id                     INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name             TEXT    NOT NULL,
        last_name              TEXT    NOT NULL,
        email                  TEXT    NOT NULL UNIQUE,
        password_hash          TEXT,
        password_reset_token   TEXT,
        password_reset_expires TEXT,
        role                   TEXT    NOT NULL DEFAULT 'user',
        company_id             TEXT    REFERENCES clients(id),
        job_title              TEXT,
        phone                  TEXT,
        notes                  TEXT,
        must_reset_password    INTEGER NOT NULL DEFAULT 1,
        active                 INTEGER NOT NULL DEFAULT 1,
        created_at             TEXT    DEFAULT (datetime('now')),
        last_login             TEXT
      );

      CREATE TABLE IF NOT EXISTS messages (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        client_user_id INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
        company_id     TEXT    REFERENCES clients(id),
        sender         TEXT    NOT NULL,
        body           TEXT    NOT NULL,
        created_at     TEXT    DEFAULT (datetime('now')),
        read_at        TEXT
      );
    `);

    // Fire-and-forget migrations for existing databases (ignore "column exists").
    const migrations = [
      `ALTER TABLE messages ADD COLUMN company_id TEXT`,
      `ALTER TABLE clients ADD COLUMN logo_file TEXT`,
      `ALTER TABLE brand_kits ADD COLUMN primary_font TEXT`,
      `ALTER TABLE brand_kits ADD COLUMN secondary_font TEXT`,
      `ALTER TABLE brand_kits ADD COLUMN headline_font TEXT`,
      `ALTER TABLE brand_kits ADD COLUMN body_font TEXT`,
      `ALTER TABLE brand_kits ADD COLUMN brand_prompt TEXT`,
      `ALTER TABLE brand_kits ADD COLUMN invert_logo INTEGER DEFAULT 0`,
      `ALTER TABLE posts ADD COLUMN notes TEXT`,
      `ALTER TABLE posts ADD COLUMN image_url TEXT`,
      `ALTER TABLE posts ADD COLUMN image_canvas_json TEXT`,
      `ALTER TABLE posts ADD COLUMN approved_at TEXT`,
      `ALTER TABLE posts ADD COLUMN scheduled_at TEXT`,
      `ALTER TABLE posts ADD COLUMN posted_at TEXT`,
      `ALTER TABLE posts ADD COLUMN linkedin_post_id TEXT`,
      `ALTER TABLE clients ADD COLUMN linkedin_access_token TEXT`,
      `ALTER TABLE clients ADD COLUMN linkedin_refresh_token TEXT`,
      `ALTER TABLE clients ADD COLUMN linkedin_urn TEXT`,
      `ALTER TABLE clients ADD COLUMN linkedin_name TEXT`,
      `ALTER TABLE clients ADD COLUMN linkedin_token_expires_at TEXT`,
      `ALTER TABLE reports ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))`,
    ];
    for (const m of migrations) {
      try { await c.execute(m); } catch { /* column already exists */ }
    }

    // Seed admin user if no users exist.
    const seedRow = (await c.execute("SELECT COUNT(*) as n FROM users")).rows[0] as Record<string, unknown> | undefined;
    if (Number(seedRow?.n ?? 0) === 0) {
      await c.execute({
        sql: `INSERT INTO users (email, password_hash, role, client_id) VALUES (?, ?, ?, ?)`,
        args: ["admin@gorlin.com", hashPassword("#M0llydog!"), "agency", null],
      });
    }
}

// A small better-sqlite3-compatible async wrapper over the libSQL client, so the
// existing `db.prepare(sql).get/all/run(args)` call sites only need an `await`.
export interface Stmt {
  get<T = any>(...args: unknown[]): Promise<T | undefined>;
  all<T = any>(...args: unknown[]): Promise<T[]>;
  run(...args: unknown[]): Promise<{ lastInsertRowid: number; changes: number }>;
}
export interface Db {
  prepare(sql: string): Stmt;
  exec(sql: string): Promise<void>;
}

function flatten(args: unknown[]): InValue[] {
  const a = args.length === 1 && Array.isArray(args[0]) ? (args[0] as unknown[]) : args;
  return a as InValue[];
}

export function getDb(): Db {
  if (!ready) ready = initialize();
  const c = client();
  return {
    prepare(sql: string): Stmt {
      return {
        async get<T = any>(...args: unknown[]): Promise<T | undefined> {
          await ready;
          const r = await c.execute({ sql, args: flatten(args) });
          return r.rows[0] as T | undefined;
        },
        async all<T = any>(...args: unknown[]): Promise<T[]> {
          await ready;
          const r = await c.execute({ sql, args: flatten(args) });
          return r.rows as unknown as T[];
        },
        async run(...args: unknown[]) {
          await ready;
          const r = await c.execute({ sql, args: flatten(args) });
          return { lastInsertRowid: Number(r.lastInsertRowid ?? 0), changes: r.rowsAffected };
        },
      };
    },
    async exec(sql: string): Promise<void> {
      await ready;
      await c.executeMultiple(sql);
    },
  };
}

export interface Post {
  id: number;
  company_id: string;
  company_name: string;
  post_type: string;
  scheduled_day: string;
  content: string;
  status: "draft" | "pending_approval" | "approved" | "scheduled" | "posted";
  notes: string | null;
  image_url: string | null;
  image_canvas_json: string | null;
  week_number: number | null;
  approved_at: string | null;
  scheduled_at: string | null;
  posted_at: string | null;
  linkedin_post_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  tagline: string | null;
  color: string;
  timezone: string;
  audience: string | null;
  voice: string | null;
  posting_days: string;
  best_post_times: string;
  active: number;
  logo_file: string | null;
  created_at: string;
  linkedin_access_token: string | null;
  linkedin_refresh_token: string | null;
  linkedin_urn: string | null;
  linkedin_name: string | null;
  linkedin_token_expires_at: string | null;
}

export interface BrandKit {
  id: number;
  client_id: string;
  palette: string;
  visual_mood: string | null;
  logo_text: string | null;
  accent_color: string | null;
  dark_color: string | null;
  light_color: string | null;
  key_phrases: string;
  badges: string;
  brand_prompt: string | null;
  updated_at: string;
}

export interface Pillar {
  id: number;
  client_id: string;
  day: string;
  type: string;
  color: string | null;
  example: string | null;
  sort_order: number;
}

export interface Invoice {
  id: string;
  number: string;
  client_id: string | null;
  client_name: string;
  date: string;
  due_date: string;
  items: string;
  status: "paid" | "pending" | "overdue";
  tax_rate: number;
  notes: string;
  created_at: string;
}

export interface PostAnalytic {
  id: number;
  post_id: number | null;
  client_id: string | null;
  impressions: number;
  engagement_rate: number;
  clicks: number;
  likes: number;
  comments: number;
  reposts: number;
  recorded_at: string;
}

export interface User {
  id: number;
  email: string;
  password_hash: string;
  role: "agency" | "client";
  client_id: string | null;
  created_at: string;
}

export interface Report {
  id: number;
  client_id: string;
  type: "monthly" | "weekly";
  period_start: string;
  period_end: string;
  status: "draft" | "published";
  raw_pdf_url: string | null;
  extracted_data: string | null;
  narrative_agency: string | null;
  narrative_client: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export type ClientRole = "owner" | "administrator" | "user";

export interface ClientUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string | null;
  password_reset_token: string | null;
  password_reset_expires: string | null;
  role: ClientRole;
  company_id: string | null;
  job_title: string | null;
  phone: string | null;
  notes: string | null;
  must_reset_password: number;
  active: number;
  created_at: string;
  last_login: string | null;
}

export interface Message {
  id: number;
  client_user_id: number;
  company_id: string | null;
  sender: "client" | "admin";
  body: string;
  created_at: string;
  read_at: string | null;
}

// Maximum number of each role allowed per company.
export const ROLE_LIMITS: Record<ClientRole, number> = {
  owner: 1,
  administrator: 5,
  user: 10,
};

// What each role is permitted to do.
export const ROLE_PERMISSIONS: Record<ClientRole, {
  createAdmins: boolean;
  createUsers: boolean;
  approvePosts: boolean;
  seeQueue: boolean;
  seeHistory: boolean;
  seeReports: boolean;
}> = {
  owner:         { createAdmins: true,  createUsers: true,  approvePosts: true,  seeQueue: true, seeHistory: true, seeReports: true },
  administrator: { createAdmins: false, createUsers: true,  approvePosts: true,  seeQueue: true, seeHistory: true, seeReports: true },
  user:          { createAdmins: false, createUsers: false, approvePosts: false, seeQueue: true, seeHistory: true, seeReports: true },
};
