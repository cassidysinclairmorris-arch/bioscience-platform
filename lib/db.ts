import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { createHash } from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

let db: Database.Database;

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(path.join(DATA_DIR, "posts.db"));
    db.pragma("journal_mode = WAL");
    db.exec(`
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
    `);

    // Migrations for existing databases
    try { db.exec(`ALTER TABLE clients ADD COLUMN logo_file TEXT`); } catch {}
    try { db.exec(`ALTER TABLE brand_kits ADD COLUMN primary_font TEXT`); } catch {}
    try { db.exec(`ALTER TABLE brand_kits ADD COLUMN secondary_font TEXT`); } catch {}
    try { db.exec(`ALTER TABLE brand_kits ADD COLUMN headline_font TEXT`); } catch {}
    try { db.exec(`ALTER TABLE brand_kits ADD COLUMN body_font TEXT`); } catch {}
    try { db.exec(`ALTER TABLE brand_kits ADD COLUMN brand_prompt TEXT`); } catch {}
    try { db.exec(`ALTER TABLE brand_kits ADD COLUMN invert_logo INTEGER DEFAULT 0`); } catch {}
    try { db.exec(`ALTER TABLE posts ADD COLUMN notes TEXT`); } catch {}
    try { db.exec(`ALTER TABLE posts ADD COLUMN image_url TEXT`); } catch {}

    // Seed admin user if no users exist
    const userCount = (db.prepare("SELECT COUNT(*) as n FROM users").get() as { n: number }).n;
    if (userCount === 0) {
      db.prepare(`INSERT INTO users (email, password_hash, role, client_id) VALUES (?, ?, ?, ?)`)
        .run("admin@gorlin.com", hashPassword("#M0llydog!"), "agency", null);
    }
  }
  return db;
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
  week_number: number | null;
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
