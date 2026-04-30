import { NextRequest, NextResponse } from "next/server";

// POST /api/upload-logo
// Receives a file, sends it to Remove.bg, returns transparent PNG as base64.
// If REMOVEBG_API_KEY is not set, returns the original file as-is (dev mode).
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    const apiKey = process.env.REMOVEBG_API_KEY;

    if (!apiKey) {
      // Dev fallback: return the original file as base64 without bg removal
      const bytes = await file.arrayBuffer();
      const b64 = Buffer.from(bytes).toString("base64");
      return NextResponse.json({ originalB64: b64, skipped: true });
    }

    // Call Remove.bg
    const rbFormData = new FormData();
    rbFormData.append("image_file", new Blob([await file.arrayBuffer()], { type: file.type }), file.name);
    rbFormData.append("size", "auto");

    const rbRes = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: rbFormData,
    });

    if (!rbRes.ok) {
      const errText = await rbRes.text();
      console.error("Remove.bg error:", rbRes.status, errText);
      return NextResponse.json({ error: `Remove.bg failed: ${rbRes.status}` }, { status: 502 });
    }

    const pngBuffer = Buffer.from(await rbRes.arrayBuffer());
    const b64 = pngBuffer.toString("base64");

    return NextResponse.json({ originalB64: b64, skipped: false });
  } catch (error) {
    console.error("Upload-logo error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
