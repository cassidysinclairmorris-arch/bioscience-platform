// File rules for Brand Center uploads.
//
// Brand Center files go browser to Vercel Blob directly, the same way the asset
// library works, so a 10MB deck never has to fit inside a serverless request
// body. That means the allowlist has to be readable in two places: the client
// that picks the file, and the route that issues the upload token. Both import
// from here so they cannot drift.

export const BRAND_UPLOAD_KINDS = ["examples", "materials"] as const;
export type BrandUploadKind = (typeof BRAND_UPLOAD_KINDS)[number];

export function isBrandUploadKind(v: unknown): v is BrandUploadKind {
  return typeof v === "string" && (BRAND_UPLOAD_KINDS as readonly string[]).includes(v);
}

// Screenshots of posts that performed well: images only.
export const EXAMPLE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

// Reference material the agency keeps on hand: decks, one-pagers, research.
export const MATERIAL_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
] as const;

export function allowedTypes(kind: BrandUploadKind): string[] {
  return kind === "examples" ? [...EXAMPLE_TYPES] : [...MATERIAL_TYPES];
}

// Our own product cap, not a platform one. Client uploads bypass the request
// body limit entirely, so these are set by what is reasonable to store.
export const MAX_BYTES: Record<BrandUploadKind, number> = {
  examples: 10 * 1024 * 1024,
  materials: 25 * 1024 * 1024,
};

export function maxLabel(kind: BrandUploadKind): string {
  return `${Math.round(MAX_BYTES[kind] / (1024 * 1024))}MB`;
}

// Some browsers send no MIME for PDFs and Office files, or send the generic
// octet-stream, so fall back to the extension.
const EXT_TYPES: Record<string, string> = {
  pdf:  "application/pdf",
  doc:  "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt:  "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt:  "text/plain",
  md:   "text/markdown",
  png:  "image/png",
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export function resolveContentType(fileName: string, fileType: string): string {
  if (fileType && fileType !== "application/octet-stream") {
    // Browsers occasionally report the non-standard image/jpg.
    return fileType === "image/jpg" ? "image/jpeg" : fileType;
  }
  const ext = (fileName || "").split(".").pop()?.toLowerCase() || "";
  return EXT_TYPES[ext] || "";
}

// Strip anything that could confuse a Blob key or a Content-Disposition header.
export function safeFileName(fileName: string, fallback: string): string {
  const cleaned = (fileName || "").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  return cleaned || fallback;
}

// Every Brand Center blob lives under a per-kind, per-client prefix. The token
// route checks the requested pathname against this so a token issued for one
// client cannot be used to write into another client's folder.
export function blobPrefix(kind: BrandUploadKind, clientId: string): string {
  return `brand-${kind === "examples" ? "post-examples" : "materials"}/${clientId}/`;
}

// The metadata row is created by the browser after the upload resolves, so the
// URL it sends is checked to be a Vercel Blob URL rather than trusted outright.
export function isBlobUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}
