// READ-ONLY point-in-time backup of the production Turso database.
// Writes a SQLite file plus a plain .sql dump into data/backups/ (gitignored).
//
//   npx tsx --env-file=.env.local scripts/backup-production.ts
import { createClient } from "@libsql/client";
import { writeFileSync, existsSync, unlinkSync, mkdirSync } from "fs";
import path from "path";

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function lit(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (v instanceof ArrayBuffer || ArrayBuffer.isView(v)) return `X'${Buffer.from(v as ArrayBuffer).toString("hex")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

(async () => {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url || url.startsWith("file:")) throw new Error("Point TURSO_DATABASE_URL at production before backing up.");

  const dir = path.join(process.cwd(), "data", "backups");
  mkdirSync(dir, { recursive: true });
  const base = path.join(dir, `prod-${stamp()}`);
  if (existsSync(`${base}.db`)) unlinkSync(`${base}.db`);

  const src = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  const dst = createClient({ url: `file:${base}.db` });

  const tables = (await src.execute(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  )).rows as unknown as { name: string; sql: string }[];

  const sql: string[] = ["PRAGMA foreign_keys=OFF;", "BEGIN TRANSACTION;"];
  const counts: Record<string, number> = {};

  // Foreign keys reference tables that may not exist yet, so every table is
  // created before any row is inserted.
  await dst.execute("PRAGMA foreign_keys=OFF");
  for (const t of tables) {
    await dst.execute(t.sql);
    sql.push(`${t.sql};`);
  }

  for (const t of tables) {
    const rows = (await src.execute(`SELECT * FROM "${t.name}"`)).rows as unknown as Record<string, unknown>[];
    counts[t.name] = rows.length;
    for (const r of rows) {
      const cols = Object.keys(r);
      const colList = cols.map(c => `"${c}"`).join(",");
      await dst.execute({
        sql: `INSERT INTO "${t.name}" (${colList}) VALUES (${cols.map(() => "?").join(",")})`,
        args: cols.map(c => r[c] as never),
      });
      sql.push(`INSERT INTO "${t.name}" (${colList}) VALUES (${cols.map(c => lit(r[c])).join(",")});`);
    }
  }
  sql.push("COMMIT;");
  writeFileSync(`${base}.sql`, sql.join("\n"));

  // Read the copy back and confirm it matches row for row.
  let ok = true;
  for (const [name, n] of Object.entries(counts)) {
    const got = Number((await dst.execute(`SELECT COUNT(*) c FROM "${name}"`)).rows[0].c);
    if (got !== n) { ok = false; console.log(`  MISMATCH ${name}: ${n} -> ${got}`); }
  }

  console.log(`Backup of production, ${new Date().toISOString()}\n`);
  for (const [t, n] of Object.entries(counts)) console.log(`  ${t.padEnd(18)} ${n}`);
  console.log(`\n  ${base}.db`);
  console.log(`  ${base}.sql`);
  console.log(ok ? "\n  Verified: every table restored with the same row count." : "\n  VERIFICATION FAILED");
})();
