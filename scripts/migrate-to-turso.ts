/**
 * One-time migration of the local SQLite database into Turso.
 *
 * Usage (run from the project root, with your Turso credentials in the env):
 *   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." npx tsx scripts/migrate-to-turso.ts
 *
 * It reads data/posts.db locally and copies every row into the Turso database.
 * Safe to re-run (uses INSERT OR REPLACE). The schema is created automatically
 * by getDb() on first connect.
 */
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

// tsx does not auto-load .env.local the way Next does, so load it manually
// before importing the DB layer (which reads TURSO_* from process.env).
try {
  const envFile = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of envFile.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  // no .env.local, rely on the actual environment
}

import { getDb } from "../lib/db";

const TABLES = [
  "clients",
  "brand_kits",
  "pillars",
  "posts",
  "reports",
  "invoices",
  "post_analytics",
  "users",
  "client_users",
  "messages",
];

async function main() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the environment first.");
    process.exit(1);
  }

  const local = new Database(path.join(process.cwd(), "data", "posts.db"), { readonly: true });
  const db = getDb(); // connects to Turso because the env vars are set

  // Trigger schema creation on Turso (CREATE TABLE IF NOT EXISTS runs in init).
  await db.exec("SELECT 1;");

  for (const table of TABLES) {
    let rows: Record<string, unknown>[];
    try {
      rows = local.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
    } catch {
      console.log(`${table}: skipped (not present locally)`);
      continue;
    }
    if (rows.length === 0) {
      console.log(`${table}: 0 rows`);
      continue;
    }
    const cols = Object.keys(rows[0]);
    const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`;
    for (const row of rows) {
      await db.prepare(sql).run(...cols.map((c) => row[c] as unknown));
    }
    console.log(`${table}: ${rows.length} rows migrated`);
  }

  console.log("Migration complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
