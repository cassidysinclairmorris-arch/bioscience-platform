import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { decryptToken } from "@/app/api/auth/linkedin/callback/route";

async function uploadImageToLinkedIn(accessToken: string, urn: string, imageUrl: string): Promise<string | null> {
  try {
    // Step 1: Initialize upload
    const initRes = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202504",
      },
      body: JSON.stringify({ initializeUploadRequest: { owner: urn } }),
    });
    if (!initRes.ok) return null;
    const { value } = await initRes.json();
    const uploadUrl  = value?.uploadUrl as string;
    const imageUrn   = value?.image as string;
    if (!uploadUrl || !imageUrn) return null;

    // Step 2: Fetch image bytes
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const imgBuf = await imgRes.arrayBuffer();

    // Step 3: Upload bytes
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "image/jpeg" },
      body: imgBuf,
    });
    if (!uploadRes.ok && uploadRes.status !== 201) return null;

    return imageUrn;
  } catch (err) {
    console.error("[linkedin/post] image upload error:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { postId, clientId } = await req.json();
    if (!postId || !clientId) return NextResponse.json({ error: "postId and clientId required" }, { status: 400 });

    const db     = getDb();
    const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(clientId) as Record<string, unknown> | undefined;
    const post   = db.prepare("SELECT * FROM posts WHERE id = ?").get(postId) as Record<string, unknown> | undefined;

    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    if (!post)   return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const encToken = client.linkedin_access_token as string | null;
    if (!encToken)  return NextResponse.json({ error: "LinkedIn not connected for this client. Connect in the Clients tab." }, { status: 400 });

    const accessToken = decryptToken(encToken);
    const urn         = client.linkedin_urn as string;
    if (!urn)         return NextResponse.json({ error: "LinkedIn URN not set. Reconnect LinkedIn for this client." }, { status: 400 });

    const content  = post.content as string;
    const imageUrl = post.image_url as string | null;

    let imageUrn: string | null = null;
    if (imageUrl) {
      imageUrn = await uploadImageToLinkedIn(accessToken, urn, imageUrl);
    }

    const body: Record<string, unknown> = {
      author: urn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: content },
          shareMediaCategory: imageUrn ? "IMAGE" : "NONE",
          ...(imageUrn ? { media: [{ status: "READY", media: imageUrn }] } : {}),
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };

    const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    });

    if (!postRes.ok) {
      const err = await postRes.text();
      console.error("[linkedin/post] post failed:", postRes.status, err);
      return NextResponse.json({ error: `LinkedIn API error ${postRes.status}: ${err.slice(0, 200)}` }, { status: 502 });
    }

    const liPostId = postRes.headers.get("x-restli-id") || "";

    // Mark as posted in DB
    db.prepare("UPDATE posts SET status = 'posted', posted_at = datetime('now'), linkedin_post_id = ?, updated_at = datetime('now') WHERE id = ?")
      .run(liPostId, postId);

    return NextResponse.json({ success: true, linkedinPostId: liPostId });
  } catch (err) {
    console.error("[linkedin/post] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
