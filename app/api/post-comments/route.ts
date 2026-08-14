import { NextRequest, NextResponse } from "next/server";
import { getDb, type Post } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";
import { getClientSession } from "@/lib/client-session";
import { isEmailConfigured, sendCommentReplyEmail } from "@/lib/client-email";

// Threaded comments attached to a single post. Top level comments have
// parent_id NULL; replies carry the id of the comment they answer. This sits
// alongside the existing `posts.notes` change-request field rather than
// replacing it, so nothing about the current approval flow changes.

type Requester =
  | { kind: "agency"; name: string }
  | { kind: "client"; name: string; clientId: string; userId: number };

function requester(req: NextRequest): Requester | null {
  if (isAdminRequest(req)) return { kind: "agency", name: "Linkwright" };
  const s = getClientSession(req);
  if (s) {
    return {
      kind: "client",
      name: [s.firstName, s.lastName].filter(Boolean).join(" ") || s.email,
      clientId: s.clientId,
      userId: s.clientUserId,
    };
  }
  return null;
}

// A client may only touch comments on posts belonging to their own company.
async function loadPost(postId: number): Promise<Post | undefined> {
  const db = getDb();
  return await db.prepare("SELECT * FROM posts WHERE id = ?").get(postId) as Post | undefined;
}

// GET /api/post-comments?postId=123  (or ?postIds=1,2,3 for counts)
export async function GET(req: NextRequest) {
  const who = requester(req);
  if (!who) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const db = getDb();

  const idsParam = req.nextUrl.searchParams.get("postIds");
  if (idsParam) {
    const ids = idsParam.split(",").map(n => Number(n)).filter(Boolean);
    if (!ids.length) return NextResponse.json({ counts: {} });
    const rows = await db
      .prepare(`SELECT post_id, COUNT(*) AS n FROM post_comments WHERE post_id IN (${ids.map(() => "?").join(",")}) GROUP BY post_id`)
      .all(...ids) as { post_id: number; n: number }[];
    const counts: Record<number, number> = {};
    rows.forEach(r => { counts[r.post_id] = r.n; });
    return NextResponse.json({ counts });
  }

  const postId = Number(req.nextUrl.searchParams.get("postId"));
  if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });

  const post = await loadPost(postId);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (who.kind === "client" && post.company_id !== who.clientId) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const comments = await db
    .prepare("SELECT * FROM post_comments WHERE post_id = ? ORDER BY created_at ASC, id ASC")
    .all(postId);

  // Reading the thread marks the other side's messages as seen.
  if (req.nextUrl.searchParams.get("markRead") === "1") {
    const otherRole = who.kind === "agency" ? "client" : "agency";
    await db
      .prepare("UPDATE post_comments SET read_at = datetime('now') WHERE post_id = ? AND author_role = ? AND read_at IS NULL")
      .run(postId, otherRole);
  }

  return NextResponse.json({ comments });
}

// POST /api/post-comments  { postId, body, parentId? }
export async function POST(req: NextRequest) {
  const who = requester(req);
  if (!who) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const db = getDb();

  const { postId, body, parentId } = await req.json();
  if (!postId || !String(body ?? "").trim()) {
    return NextResponse.json({ error: "postId and body are required" }, { status: 400 });
  }

  const post = await loadPost(Number(postId));
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (who.kind === "client" && post.company_id !== who.clientId) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  await db
    .prepare(
      `INSERT INTO post_comments (post_id, parent_id, author_role, author_name, author_id, body)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      Number(postId),
      parentId ? Number(parentId) : null,
      who.kind,
      who.name,
      who.kind === "client" ? who.userId : null,
      String(body).trim()
    );

  const comment = await db.prepare("SELECT * FROM post_comments WHERE id = last_insert_rowid()").get();

  // Agency reply: tell the client there is something waiting for them. Best
  // effort, so a mail failure never blocks the comment from being saved.
  let notified: string[] = [];
  if (who.kind === "agency" && isEmailConfigured()) {
    try {
      const recipients = await db
        .prepare(
          `SELECT DISTINCT cu.email, cu.first_name
             FROM client_users cu
            WHERE cu.company_id = ? AND cu.active = 1 AND cu.password_hash IS NOT NULL
              AND (
                cu.id IN (SELECT author_id FROM post_comments WHERE post_id = ? AND author_role = 'client')
                OR cu.role IN ('owner', 'administrator')
              )`
        )
        .all(post.company_id, Number(postId)) as { email: string; first_name: string }[];

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
      for (const r of recipients) {
        await sendCommentReplyEmail({
          to: r.email,
          firstName: r.first_name,
          companyName: post.company_name,
          postId: Number(postId),
          baseUrl,
        });
        notified.push(r.email);
      }
    } catch (e) {
      console.error("Comment reply email failed:", e);
      notified = [];
    }
  }

  return NextResponse.json({ comment, notified });
}

// DELETE /api/post-comments?id=123 — author's own comment, or any as agency.
export async function DELETE(req: NextRequest) {
  const who = requester(req);
  if (!who) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const db = getDb();

  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const row = await db.prepare("SELECT * FROM post_comments WHERE id = ?").get(id) as
    { id: number; author_role: string; author_id: number | null } | undefined;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const mine = who.kind === "agency"
    ? row.author_role === "agency"
    : row.author_role === "client" && row.author_id === who.userId;
  if (!mine && who.kind !== "agency") return NextResponse.json({ error: "Not authorised" }, { status: 403 });

  await db.prepare("DELETE FROM post_comments WHERE id = ? OR parent_id = ?").run(id, id);
  return NextResponse.json({ deleted: true });
}
