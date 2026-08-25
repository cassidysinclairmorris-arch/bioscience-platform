import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  allowedTypes, blobPrefix, isBrandUploadKind, MAX_BYTES, maxLabel,
} from "@/lib/brand-files";

export const runtime = "nodejs";

// Upload tokens for Brand Center files. The browser uploads to Vercel Blob
// directly, so post examples and reference decks never pass through this
// function's request body limit, which caps out well below the file sizes a
// brand deck reaches. The metadata row is created afterwards by POSTing to
// brand-post-examples or brand-materials.
export async function POST(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Blob storage is not configured." }, { status: 500 });
  }

  const { clientId } = await params;
  const body = (await req.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const kind = clientPayload ?? "";
        if (!isBrandUploadKind(kind)) {
          throw new Error("Unknown upload kind.");
        }
        // A token is only ever good for this client's folder and this kind.
        const prefix = blobPrefix(kind, clientId);
        if (!pathname.startsWith(prefix)) {
          throw new Error("Upload path does not match this client.");
        }
        return {
          allowedContentTypes: allowedTypes(kind),
          maximumSizeInBytes: MAX_BYTES[kind],
          addRandomSuffix: true,
          tokenPayload: kind,
        };
      },
      // Cannot fire on localhost, which has no public URL for Blob to call back
      // to, so the browser creates the DB row once the upload resolves.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Brand Center upload token error:", err);
    const message = err instanceof Error ? err.message : "Upload failed.";
    // Blob reports its own size rejection, which reads better with our cap in it.
    const friendly = /size/i.test(message)
      ? `File too large (max ${maxLabel("materials")}).`
      : message;
    return NextResponse.json({ error: friendly }, { status: 400 });
  }
}
