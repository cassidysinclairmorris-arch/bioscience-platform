import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { getDb, type PostAsset } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";
import { getAssets, syncCover, MAX_ASSETS_PER_POST } from "@/lib/post-assets";

type IncomingAsset = {
  url: string;
  kind?: "image" | "svg" | "pdf";
  source?: "generated" | "uploaded";
  canvas_json?: string | null;
  mime?: string | null;
  asset_title?: string | null;
};

// GET ?post_id= : list a post's assets (admin only).
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const postId = Number(req.nextUrl.searchParams.get("post_id"));
  if (!postId) return NextResponse.json({ error: "Missing post_id" }, { status: 400 });
  const db = getDb();
  return NextResponse.json({ assets: await getAssets(db, postId) });
}

// POST: append one or more assets to a post (enforces the 10-asset limit).
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { post_id, assets } = (await req.json()) as { post_id: number; assets: IncomingAsset[] };
    if (!post_id || !Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json({ error: "post_id and assets are required." }, { status: 400 });
    }
    const db = getDb();
    const existing = await getAssets(db, post_id);
    if (existing.length + assets.length > MAX_ASSETS_PER_POST) {
      return NextResponse.json(
        { error: `A post can have at most ${MAX_ASSETS_PER_POST} visuals.` },
        { status: 400 }
      );
    }
    let order = existing.length;
    for (const a of assets) {
      if (!a.url) continue;
      await db
        .prepare(
          `INSERT INTO post_assets (post_id, sort_order, kind, source, url, canvas_json, mime, asset_title)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          post_id,
          order++,
          a.kind || "image",
          a.source || "uploaded",
          a.url,
          a.canvas_json ?? null,
          a.mime ?? null,
          a.asset_title ?? null
        );
    }
    await syncCover(db, post_id);
    return NextResponse.json({ assets: await getAssets(db, post_id) });
  } catch (err) {
    console.error("Add asset error:", err);
    return NextResponse.json({ error: "Could not add assets." }, { status: 500 });
  }
}

// PUT: replace a post's entire asset set with the provided ordered list (used by
// draft autosave and save). First item becomes the cover. Reuses existing blob
// URLs for unchanged assets, so it does not delete blobs here.
export async function PUT(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { post_id, assets } = (await req.json()) as { post_id: number; assets: IncomingAsset[] };
    if (!post_id || !Array.isArray(assets)) {
      return NextResponse.json({ error: "post_id and assets are required." }, { status: 400 });
    }
    if (assets.length > MAX_ASSETS_PER_POST) {
      return NextResponse.json({ error: `A post can have at most ${MAX_ASSETS_PER_POST} visuals.` }, { status: 400 });
    }
    const db = getDb();
    await db.prepare("DELETE FROM post_assets WHERE post_id = ?").run(post_id);
    let order = 0;
    for (const a of assets) {
      if (!a.url) continue;
      await db.prepare(
        `INSERT INTO post_assets (post_id, sort_order, kind, source, url, canvas_json, mime, asset_title)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(post_id, order++, a.kind || "image", a.source || "uploaded", a.url, a.canvas_json ?? null, a.mime ?? null, a.asset_title ?? null);
    }
    await syncCover(db, post_id);
    return NextResponse.json({ assets: await getAssets(db, post_id) });
  } catch (err) {
    console.error("Replace assets error:", err);
    return NextResponse.json({ error: "Could not save assets." }, { status: 500 });
  }
}

// PATCH: reorder, set cover, or update a single asset (canvas_json / url regenerate / title).
export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await req.json();
    const db = getDb();

    // Reorder: full ordered list of asset ids.
    if (Array.isArray(body.order) && body.post_id) {
      let i = 0;
      for (const assetId of body.order) {
        await db.prepare("UPDATE post_assets SET sort_order = ? WHERE id = ? AND post_id = ?").run(i++, Number(assetId), body.post_id);
      }
      await syncCover(db, body.post_id);
      return NextResponse.json({ assets: await getAssets(db, body.post_id) });
    }

    // Set cover: move the given asset to the front, push the rest back.
    if (body.setCover && body.assetId && body.post_id) {
      const all = await getAssets(db, body.post_id);
      const reordered = [Number(body.assetId), ...all.map((a) => a.id).filter((id) => id !== Number(body.assetId))];
      let i = 0;
      for (const id of reordered) {
        await db.prepare("UPDATE post_assets SET sort_order = ? WHERE id = ? AND post_id = ?").run(i++, id, body.post_id);
      }
      await syncCover(db, body.post_id);
      return NextResponse.json({ assets: await getAssets(db, body.post_id) });
    }

    // Update a single asset's editable fields.
    if (body.assetId) {
      const asset = (await db.prepare("SELECT * FROM post_assets WHERE id = ?").get(Number(body.assetId))) as PostAsset | undefined;
      if (!asset) return NextResponse.json({ error: "Asset not found." }, { status: 404 });
      if (body.canvas_json !== undefined) {
        await db.prepare("UPDATE post_assets SET canvas_json = ? WHERE id = ?").run(body.canvas_json, asset.id);
      }
      if (body.asset_title !== undefined) {
        await db.prepare("UPDATE post_assets SET asset_title = ? WHERE id = ?").run(body.asset_title, asset.id);
      }
      if (body.url !== undefined) {
        await db.prepare("UPDATE post_assets SET url = ? WHERE id = ?").run(body.url, asset.id);
        await syncCover(db, asset.post_id);
      }
      return NextResponse.json({ assets: await getAssets(db, asset.post_id) });
    }

    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  } catch (err) {
    console.error("Update asset error:", err);
    return NextResponse.json({ error: "Could not update asset." }, { status: 500 });
  }
}

// DELETE ?id= : remove an asset (and its blob), then resync the cover.
export async function DELETE(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    const db = getDb();
    const asset = (await db.prepare("SELECT * FROM post_assets WHERE id = ?").get(id)) as PostAsset | undefined;
    if (!asset) return NextResponse.json({ success: true });
    await db.prepare("DELETE FROM post_assets WHERE id = ?").run(id);
    // Best-effort blob cleanup (ignores non-blob/legacy urls).
    if (asset.url && asset.url.includes("blob.vercel-storage.com")) {
      try { await del(asset.url); } catch (e) { console.error("Blob delete failed:", e); }
    }
    await syncCover(db, asset.post_id);
    return NextResponse.json({ success: true, assets: await getAssets(db, asset.post_id) });
  } catch (err) {
    console.error("Delete asset error:", err);
    return NextResponse.json({ error: "Could not delete asset." }, { status: 500 });
  }
}
