import { NextRequest, NextResponse } from "next/server";
import { removeLogoBg } from "@/lib/remove-logo-bg";

// POST /api/upload-logo
// Receives a file. Returns transparent PNG as base64.
//
// Priority:
//  1. REMOVEBG_API_KEY set → call Remove.bg (best quality, handles complex backgrounds)
//  2. Fallback → Sharp local background removal (corner-sample + threshold, always runs)
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

    const apiKey = process.env.REMOVEBG_API_KEY;

    // ── Path 1: Remove.bg ─────────────────────────────────────────────────────
    if (apiKey) {
      const rbFormData = new FormData();
      rbFormData.append("image_file", new Blob([await file.arrayBuffer()], { type: file.type }), file.name);
      rbFormData.append("size", "auto");

      const rbRes = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": apiKey },
        body: rbFormData,
      });

      if (rbRes.ok) {
        const pngBuffer = Buffer.from(await rbRes.arrayBuffer());
        return NextResponse.json({ originalB64: pngBuffer.toString("base64"), skipped: false });
      }
      // Remove.bg failed — fall through to Sharp
      console.warn("[upload-logo] Remove.bg failed:", rbRes.status, "— falling back to Sharp");
    }

    // ── Path 2: Sharp local background removal ────────────────────────────────
    const inputBuf  = Buffer.from(await file.arrayBuffer());
    const outputBuf = await removeLogoBg(inputBuf);
    return NextResponse.json({ originalB64: outputBuf.toString("base64"), skipped: false });

  } catch (error) {
    console.error("[upload-logo] error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
