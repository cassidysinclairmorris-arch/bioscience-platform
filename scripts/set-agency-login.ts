// Sets the agency login (the /login page that opens the studio).
//
// Prompts for email and password in your terminal. The password is typed
// hidden, is never written to a file, and never reaches the repo. It is stored
// as a hash in the `users` table, so this has to be run once per database.
//
//   Local dev database:
//     npx tsx scripts/set-agency-login.ts
//
//   Production (Turso), which is what the deployed site reads:
//     npx tsx --env-file=.env.local scripts/set-agency-login.ts
//
// There is only ever one agency account: an existing one is updated in place
// rather than a second being added.

import { createInterface } from "readline";
import { getDb, hashPassword } from "../lib/db";

function ask(question: string, hidden = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  return new Promise(resolve => {
    if (hidden) {
      // Swallow echo so the password does not appear on screen or in scrollback.
      const stdout = process.stdout as NodeJS.WriteStream & { muted?: boolean };
      const write = stdout.write.bind(stdout);
      (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
        if (stdout.muted) write(s.includes(question) ? s : "");
        else write(s);
      };
      stdout.muted = false;
      rl.question(question, answer => {
        stdout.muted = false;
        write("\n");
        rl.close();
        resolve(answer);
      });
      stdout.muted = true;
    } else {
      rl.question(question, answer => { rl.close(); resolve(answer); });
    }
  });
}

async function main() {
  const target = process.env.TURSO_DATABASE_URL ? "PRODUCTION (Turso)" : "local dev database";
  console.log(`\nSetting the agency login on the ${target}.\n`);

  const email = (await ask("Email: ")).trim();
  if (!email.includes("@")) { console.error("That does not look like an email address."); process.exit(1); }

  const password = await ask("Password: ", true);
  if (password.length < 8) { console.error("Use at least 8 characters."); process.exit(1); }

  const confirm = await ask("Confirm password: ", true);
  if (password !== confirm) { console.error("Passwords do not match."); process.exit(1); }

  const db = getDb();
  const existing = await db.prepare("SELECT id, email FROM users WHERE role = 'agency'").get() as { id: number; email: string } | undefined;

  if (existing) {
    await db.prepare("UPDATE users SET email = ?, password_hash = ? WHERE id = ?")
      .run(email, hashPassword(password), existing.id);
    console.log(`\nUpdated the agency account (was ${existing.email}).`);
  } else {
    await db.prepare("INSERT INTO users (email, password_hash, role, client_id) VALUES (?, ?, 'agency', NULL)")
      .run(email, hashPassword(password));
    console.log("\nCreated the agency account.");
  }

  console.log(`Sign in at /login as ${email}.\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
