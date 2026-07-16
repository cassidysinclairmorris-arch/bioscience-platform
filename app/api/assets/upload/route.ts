import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getAssetRequester, canManageAssets } from "@/lib/asset-access";

export const runtime = "nodejs";

// Client-side direct upload token generation for the asset library. Large files
// (video, slide decks) upload straight from the browser to Vercel Blob, so they
// never pass through this serverless function's request body limit.
//
// FLAG: Vercel Blob client-upload size caps vary by plan tier. Confirm the actual
// maximum for our plan and set `maximumSizeInBytes` in onBeforeGenerateToken
// below to enforce it, rather than leaving uploads uncapped or assuming a limit.
export async function POST(req: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Blob storage is not configured. Set BLOB_READ_WRITE_TOKEN." },
      { status: 500 }
    );
  }

  // Only the agency, or a portal owner/administrator, may obtain an upload token.
  const requester = getAssetRequester(req);
  if (!requester || !canManageAssets(requester)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [
            // Images
            "image/png",
            "image/jpeg",
            "image/webp",
            "image/gif",
            "image/svg+xml",
            // Documents
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
            // Slideshows
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            // Video
            "video/mp4",
            "video/quicktime",
            "video/webm",
          ],
          addRandomSuffix: true,
          // maximumSizeInBytes: <confirm the cap for our Vercel Blob plan tier>,
        };
      },
      // The DB row is created by the client via POST /api/assets once the upload
      // resolves, so this callback stays a no-op (it also cannot fire on
      // localhost, which has no public URL for Blob to call back to).
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Asset upload token error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed." },
      { status: 400 }
    );
  }
}
