import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

// POST /api/upload-logo/save
// Receives { clientId, originalB64, displayB64, inverted }
// Saves both PNG files to public/files/ and returns their public paths.
export async function POST(req: NextRequest) {
  try {
    const { clientId, originalB64, displayB64, inverted } = await req.json();

    if (!clientId || !originalB64 || !displayB64) {
      return NextResponse.json({ error: "clientId, originalB64, displayB64 required" }, { status: 400 });
    }

    const filesDir = path.join(process.cwd(), "public", "files");

    const originalBuf = Buffer.from(originalB64, "base64");
    const displayBuf  = Buffer.from(displayB64, "base64");

    const originalName = `${clientId}_logo_original.png`;
    const displayName  = `${clientId}_logo_display.png`;

    await Promise.all([
      writeFile(path.join(filesDir, originalName), originalBuf),
      writeFile(path.join(filesDir, displayName),  displayBuf),
    ]);

    return NextResponse.json({
      originalPath: `/files/${originalName}`,
      displayPath:  `/files/${displayName}`,
      inverted: !!inverted,
    });
  } catch (error) {
    console.error("Logo save error:", error);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
