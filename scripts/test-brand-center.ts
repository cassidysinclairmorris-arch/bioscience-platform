// One-off verification for the Brand Center routes. Exercises the real client
// upload token, a real Blob write with that token, the metadata routes, and
// every rejection path, then deletes everything it created.
//
// Run against a dev server on the local file database:
//   TURSO_DATABASE_URL= TURSO_AUTH_TOKEN= PORT=3111 npm run dev
//   npx tsx --env-file=.env.local scripts/test-brand-center.ts

import { put, head } from "@vercel/blob";

const BASE = process.env.BASE_URL || "http://localhost:3111";
const CLIENT = "cpolar";
const OTHER = "coregen";
const AGENCY = { Cookie: "auth=gorlin_authenticated", "Content-Type": "application/json" };

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}

async function json(res: Response) {
  return res.json().catch(() => ({} as Record<string, unknown>));
}

async function main() {
  // ── A client upload token, then a real Blob write using only that token ─────
  const pathname = `brand-post-examples/${CLIENT}/verify.png`;
  const tokenRes = await fetch(`${BASE}/api/clients/${CLIENT}/brand-upload`, {
    method: "POST",
    headers: AGENCY,
    body: JSON.stringify({
      type: "blob.generate-client-token",
      payload: { pathname, callbackUrl: `${BASE}/api/clients/${CLIENT}/brand-upload`, clientPayload: "examples", multipart: false },
    }),
  });
  const tokenBody = await json(tokenRes) as { clientToken?: string };
  check("token route issues a client token", tokenRes.ok && Boolean(tokenBody.clientToken));
  if (!tokenBody.clientToken) { console.log("cannot continue without a token"); process.exit(1); }

  // A 1x1 PNG.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
    "base64",
  );
  const blob = await put(pathname, png, {
    access: "public",
    contentType: "image/png",
    token: tokenBody.clientToken,
  });
  check("client token writes to Blob", Boolean(blob.url), blob.url);

  const otherClientUrl = blob.url.replace(`/${CLIENT}/`, `/${OTHER}/`);

  // ── Metadata rejections ────────────────────────────────────────────────────
  const post = (body: unknown, path = "brand-post-examples", client = CLIENT) =>
    fetch(`${BASE}/api/clients/${client}/${path}`, { method: "POST", headers: AGENCY, body: JSON.stringify(body) });

  const good = { file_url: blob.url, file_name: "verify.png", file_type: "image/png", file_size: png.length };

  let r = await post({ ...good, file_url: "https://evil.example.com/x.png" });
  check("rejects a non-Blob URL", r.status === 400, String(r.status));

  r = await post({ ...good, file_url: otherClientUrl });
  check("rejects another client's blob path", r.status === 400, String(r.status));

  r = await post({ ...good, file_type: "application/pdf" });
  check("rejects a disallowed type for examples", r.status === 400, String(r.status));

  r = await post({ ...good, file_size: 11 * 1024 * 1024 });
  check("rejects an oversized example", r.status === 400, String(r.status));

  r = await fetch(`${BASE}/api/clients/${CLIENT}/brand-post-examples`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(good),
  });
  check("rejects an unauthenticated metadata POST", r.status === 401, String(r.status));

  // ── The happy path ─────────────────────────────────────────────────────────
  r = await post({ ...good, post_text: "verification row", pillar: "Test" });
  const created = await json(r) as { example?: { id: number; file_url: string; file_name: string } };
  check("accepts a valid example", r.ok && Boolean(created.example?.id), String(r.status));
  const exampleId = created.example?.id;

  const listRes = await fetch(`${BASE}/api/clients/${CLIENT}/brand-post-examples`, { headers: AGENCY });
  const list = await json(listRes) as { examples?: { id: number }[] };
  check("the new example appears in the list", (list.examples || []).some(e => e.id === exampleId));

  // PATCH scoped to the owning client.
  r = await fetch(`${BASE}/api/clients/${OTHER}/brand-post-examples`, {
    method: "PATCH", headers: AGENCY, body: JSON.stringify({ id: exampleId, post_text: "cross client edit" }),
  });
  check("PATCH from another client's route cannot touch the row", r.status === 404, String(r.status));

  r = await fetch(`${BASE}/api/clients/${CLIENT}/brand-post-examples`, {
    method: "PATCH", headers: AGENCY, body: JSON.stringify({ id: exampleId, post_text: "edited" }),
  });
  const patched = await json(r) as { example?: { post_text: string } };
  check("PATCH updates the row", r.ok && patched.example?.post_text === "edited");

  // ── Materials type separation ──────────────────────────────────────────────
  const matPath = `brand-materials/${CLIENT}/verify.txt`;
  const matTokenRes = await fetch(`${BASE}/api/clients/${CLIENT}/brand-upload`, {
    method: "POST",
    headers: AGENCY,
    body: JSON.stringify({
      type: "blob.generate-client-token",
      payload: { pathname: matPath, callbackUrl: `${BASE}/api/clients/${CLIENT}/brand-upload`, clientPayload: "materials", multipart: false },
    }),
  });
  const matToken = await json(matTokenRes) as { clientToken?: string };
  const matBlob = await put(matPath, Buffer.from("reference material"), {
    access: "public", contentType: "text/plain", token: matToken.clientToken!,
  });
  const matGood = { file_url: matBlob.url, file_name: "verify.txt", file_type: "text/plain", file_size: 18 };

  r = await post({ ...matGood, file_url: blob.url }, "brand-materials");
  check("materials rejects a blob from the examples folder", r.status === 400, String(r.status));

  r = await post(matGood, "brand-materials");
  const mat = await json(r) as { material?: { id: number } };
  check("accepts a valid material", r.ok && Boolean(mat.material?.id), String(r.status));

  r = await post({ ...matGood, file_size: 26 * 1024 * 1024 }, "brand-materials");
  check("rejects an oversized material", r.status === 400, String(r.status));

  // ── Cleanup, which also verifies DELETE removes the Blob file ──────────────
  r = await fetch(`${BASE}/api/clients/${CLIENT}/brand-post-examples?id=${exampleId}`, { method: "DELETE", headers: AGENCY });
  check("DELETE removes the example row", r.ok, String(r.status));
  r = await fetch(`${BASE}/api/clients/${CLIENT}/brand-materials?id=${mat.material?.id}`, { method: "DELETE", headers: AGENCY });
  check("DELETE removes the material row", r.ok, String(r.status));

  let blobGone = false;
  try { await head(blob.url); } catch { blobGone = true; }
  check("DELETE removed the Blob file too", blobGone);

  let matGone = false;
  try { await head(matBlob.url); } catch { matGone = true; }
  check("DELETE removed the material Blob file too", matGone);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
