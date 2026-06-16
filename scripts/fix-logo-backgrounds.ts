/**
 * One-off script: remove solid backgrounds from every logo that lacks transparency.
 * Run with: npx tsx scripts/fix-logo-backgrounds.ts
 */
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { removeLogoBg } from "../lib/remove-logo-bg";

const PUBLIC = path.join(process.cwd(), "public");

// Every PNG file in public/ and public/files/ that contains "logo" in its name
const TARGETS = [
  // Hardcoded LOGO_FILES entries (used by the studio UI)
  "files/coregen_logo_final.png",
  "files/oxia_logo_final.png",
  // Root-level duplicates / originals
  "C-Polar logo .png",
  "CoRegen Logo.png",
  "klim loc logo .png",
  "oxia logo .png",
  "oxia_logo_final.png",
  "senvi logo .png",
];

async function hasAlpha(filePath: string): Promise<{ hasAlpha: boolean; dims: string }> {
  const meta = await sharp(filePath).metadata();
  const dims = `${meta.width}x${meta.height}`;
  return { hasAlpha: Boolean(meta.hasAlpha), dims };
}

async function main() {
  console.log("Fixing logo backgrounds…\n");
  const results: { file: string; status: string; note: string }[] = [];

  for (const rel of TARGETS) {
    const full = path.join(PUBLIC, rel);
    if (!fs.existsSync(full)) {
      results.push({ file: rel, status: "SKIPPED", note: "file not found" });
      continue;
    }

    const { hasAlpha: alreadyTransparent, dims } = await hasAlpha(full);

    if (alreadyTransparent) {
      // Re-run anyway to ensure corners are actually transparent (not just RGBA type)
      const input = fs.readFileSync(full);
      const out   = await removeLogoBg(input);
      // Check if output differs (i.e. something was actually removed)
      if (out.length === input.length && out.equals(input)) {
        results.push({ file: rel, status: "SKIPPED", note: `already transparent (${dims})` });
        continue;
      }
      fs.writeFileSync(full, out);
      const metaOut = await sharp(out).metadata();
      results.push({ file: rel, status: "FIXED", note: `was RGBA but had opaque bg → re-processed (${dims} → ${metaOut.width}x${metaOut.height})` });
      continue;
    }

    // Needs processing
    const input = fs.readFileSync(full);
    try {
      const out = await removeLogoBg(input);
      fs.writeFileSync(full, out);
      const metaOut = await sharp(out).metadata();
      results.push({ file: rel, status: "FIXED", note: `RGB → RGBA transparent (${dims} → ${metaOut.width}x${metaOut.height}, ${out.length} bytes)` });
    } catch (err) {
      results.push({ file: rel, status: "ERROR", note: String(err) });
    }
  }

  // Pretty print results
  console.log("Results:");
  const w = Math.max(...results.map(r => r.file.length));
  for (const r of results) {
    const icon = r.status === "FIXED" ? "✓" : r.status === "SKIPPED" ? "·" : "✕";
    console.log(`  ${icon} ${r.file.padEnd(w + 2)} ${r.status}  ${r.note}`);
  }

  const fixed   = results.filter(r => r.status === "FIXED").length;
  const skipped = results.filter(r => r.status === "SKIPPED").length;
  const errored = results.filter(r => r.status === "ERROR").length;
  console.log(`\n${fixed} fixed, ${skipped} skipped, ${errored} errors.`);
}

main().catch(err => { console.error(err); process.exit(1); });
