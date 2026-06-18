import type { Db, PostAsset } from "./db";

// All assets for a post, in carousel order.
export async function getAssets(db: Db, postId: number): Promise<PostAsset[]> {
  return (await db
    .prepare("SELECT * FROM post_assets WHERE post_id = ? ORDER BY sort_order ASC, id ASC")
    .all(postId)) as PostAsset[];
}

// Keep posts.image_url pointing at the cover (first) asset for backward compatibility
// with the portal, library, and LinkedIn publishing, which read the single image_url.
export async function syncCover(db: Db, postId: number): Promise<void> {
  const cover = (await db
    .prepare("SELECT url FROM post_assets WHERE post_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1")
    .get(postId)) as { url: string } | undefined;
  await db
    .prepare("UPDATE posts SET image_url = ?, updated_at = datetime('now') WHERE id = ?")
    .run(cover?.url ?? null, postId);
}

export const MAX_ASSETS_PER_POST = 10;
