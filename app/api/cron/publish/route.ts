import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { decryptToken } from "@/app/api/auth/linkedin/callback/route";

export const maxDuration = 60;

async function postToLinkedIn(accessToken: string, urn: string, content: string, imageUrl: string | null): Promise<string> {
  let imageUrn: string | null = null;

  if (imageUrl) {
    try {
      const initRes = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0", "LinkedIn-Version": "202504" },
        body: JSON.stringify({ initializeUploadRequest: { owner: urn } }),
      });
      if (initRes.ok) {
        const { value } = await initRes.json();
        const uploadUrl = value?.uploadUrl as string;
        imageUrn        = value?.image as string;
        if (uploadUrl && imageUrn) {
          const imgRes = await fetch(imageUrl);
          if (imgRes.ok) {
            await fetch(uploadUrl, {
              method: "PUT",
              headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "image/jpeg" },
              body: await imgRes.arrayBuffer(),
            });
          }
        }
      }
    } catch (err) {
      console.error("[cron/publish] image upload error:", err);
      imageUrn = null;
    }
  }

  const body = {
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
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify(body),
  });

  if (!postRes.ok) throw new Error(`LinkedIn ${postRes.status}: ${(await postRes.text()).slice(0, 200)}`);
  return postRes.headers.get("x-restli-id") || "";
}

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized invocation
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const now = new Date().toISOString();

  // Find all scheduled posts whose scheduled_at is in the past
  const due = await db.prepare(`
    SELECT p.*, c.linkedin_access_token, c.linkedin_urn
    FROM posts p
    JOIN clients c ON c.id = p.company_id
    WHERE p.status = 'scheduled'
      AND p.scheduled_at IS NOT NULL
      AND p.scheduled_at <= ?
      AND p.linkedin_post_id IS NULL
      AND c.linkedin_access_token IS NOT NULL
      AND c.linkedin_urn IS NOT NULL
  `).all(now) as Array<Record<string, unknown>>;

  console.log(`[cron/publish] ${due.length} posts due at ${now}`);

  const results: Array<{ postId: unknown; status: string; error?: string }> = [];

  for (const row of due) {
    try {
      const accessToken = decryptToken(row.linkedin_access_token as string);
      const liPostId    = await postToLinkedIn(accessToken, row.linkedin_urn as string, row.content as string, row.image_url as string | null);
      await db.prepare("UPDATE posts SET status = 'posted', posted_at = datetime('now'), linkedin_post_id = ?, updated_at = datetime('now') WHERE id = ?")
        .run(liPostId, row.id);
      results.push({ postId: row.id, status: "posted" });
    } catch (err) {
      console.error(`[cron/publish] post ${row.id} failed:`, err);
      results.push({ postId: row.id, status: "error", error: String(err) });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
