import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getClientSession } from "@/lib/client-session";
import { isAdminRequest } from "@/lib/admin-auth";

// GET:
//  - client session: their own thread + unread (admin) count. ?markRead=1 clears.
//  - admin: ?userId=N returns that thread (?markRead=1 clears client unread);
//           no userId returns all thread summaries.
export async function GET(req: NextRequest) {
  const db = getDb();
  const client = getClientSession(req);
  const markRead = req.nextUrl.searchParams.get("markRead") === "1";

  if (client) {
    const messages = await db
      .prepare("SELECT * FROM messages WHERE client_user_id = ? ORDER BY created_at ASC")
      .all(client.clientUserId);
    const unread = (await db
      .prepare("SELECT COUNT(*) AS n FROM messages WHERE client_user_id = ? AND sender = 'admin' AND read_at IS NULL")
      .get(client.clientUserId) as { n: number }).n;
    if (markRead) {
      await db.prepare(
        "UPDATE messages SET read_at = datetime('now') WHERE client_user_id = ? AND sender = 'admin' AND read_at IS NULL"
      ).run(client.clientUserId);
    }
    return NextResponse.json({ messages, unread });
  }

  if (isAdminRequest(req)) {
    const userIdParam = req.nextUrl.searchParams.get("userId");
    if (userIdParam) {
      const userId = Number(userIdParam);
      const messages = await db
        .prepare("SELECT * FROM messages WHERE client_user_id = ? ORDER BY created_at ASC")
        .all(userId);
      if (markRead) {
        await db.prepare(
          "UPDATE messages SET read_at = datetime('now') WHERE client_user_id = ? AND sender = 'client' AND read_at IS NULL"
        ).run(userId);
      }
      return NextResponse.json({ messages });
    }
    const threads = await db
      .prepare(
        `SELECT cu.id AS client_user_id, cu.first_name, cu.last_name, cu.email,
                c.name AS company_name,
                (SELECT body FROM messages m WHERE m.client_user_id = cu.id ORDER BY m.created_at DESC LIMIT 1) AS last_body,
                (SELECT created_at FROM messages m WHERE m.client_user_id = cu.id ORDER BY m.created_at DESC LIMIT 1) AS last_at,
                (SELECT COUNT(*) FROM messages m WHERE m.client_user_id = cu.id AND m.sender = 'client' AND m.read_at IS NULL) AS unread
         FROM client_users cu
         LEFT JOIN clients c ON c.id = cu.company_id
         WHERE EXISTS (SELECT 1 FROM messages m WHERE m.client_user_id = cu.id)
         ORDER BY last_at DESC`
      )
      .all();
    return NextResponse.json({ threads });
  }

  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}

// POST a message. Client posts to their own thread; admin posts to ?userId / body.userId.
export async function POST(req: NextRequest) {
  const db = getDb();
  try {
    const body = await req.json();
    const text = String(body.body || "").trim();
    if (!text) return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });

    const client = getClientSession(req);
    if (client) {
      await db.prepare("INSERT INTO messages (client_user_id, company_id, sender, body) VALUES (?, ?, 'client', ?)").run(
        client.clientUserId,
        client.clientId,
        text
      );
      return NextResponse.json({ success: true });
    }

    if (isAdminRequest(req)) {
      const userId = Number(body.userId);
      if (!userId) return NextResponse.json({ error: "A recipient is required." }, { status: 400 });
      const target = await db.prepare("SELECT company_id FROM client_users WHERE id = ?").get(userId) as
        | { company_id: string | null }
        | undefined;
      await db.prepare("INSERT INTO messages (client_user_id, company_id, sender, body) VALUES (?, ?, 'admin', ?)").run(
        userId,
        target?.company_id ?? null,
        text
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  } catch (err) {
    console.error("Send message error:", err);
    return NextResponse.json({ error: "Could not send message." }, { status: 500 });
  }
}
