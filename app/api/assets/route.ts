import { NextRequest, NextResponse } from "next/server";
import { getDb, ASSET_FILE_TYPES, type AssetFileType } from "@/lib/db";
import { getAssetRequester, canManageAssets, scopedClientId } from "@/lib/asset-access";

// List assets, filterable by client, file type, and pillar. Used by both the
// portal (scoped to the caller's own company) and the studio (any company, or
// all companies when no clientId is given).
export async function GET(req: NextRequest) {
  const requester = getAssetRequester(req);
  if (!requester) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const clientId = scopedClientId(requester, searchParams.get("clientId"));
  const type = searchParams.get("type");
  const pillarId = searchParams.get("pillarId");

  const db = getDb();
  let query = `
    SELECT a.*, p.type AS pillar_type,
           cu.first_name AS uploader_first_name, cu.last_name AS uploader_last_name
      FROM assets a
      LEFT JOIN pillars p ON p.id = a.pillar_id
      LEFT JOIN client_users cu ON cu.id = a.uploaded_by
     WHERE 1=1`;
  const params: (string | number)[] = [];
  if (clientId) { query += " AND a.client_id = ?"; params.push(clientId); }
  if (type && ASSET_FILE_TYPES.includes(type as AssetFileType)) { query += " AND a.file_type = ?"; params.push(type); }
  if (pillarId) { query += " AND a.pillar_id = ?"; params.push(Number(pillarId)); }
  query += " ORDER BY a.created_at DESC";

  const assets = await db.prepare(query).all(...params);
  return NextResponse.json({ assets });
}

// Create the asset metadata row after a client-side upload to Blob completes.
export async function POST(req: NextRequest) {
  const requester = getAssetRequester(req);
  if (!requester || !canManageAssets(requester)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    // Portal clients are locked to their own company and stamped as the uploader;
    // the agency supplies the target company on the request.
    const client_id = requester.kind === "client"
      ? requester.session.clientId
      : String(body.client_id || "").trim();
    const uploaded_by = requester.kind === "client"
      ? requester.session.clientUserId
      : (body.uploaded_by ?? null);

    const file_url = String(body.file_url || "").trim();
    const file_name = String(body.file_name || "").trim();
    const file_type = String(body.file_type || "") as AssetFileType;
    const file_size = Number(body.file_size) || 0;
    const pillar_id = body.pillar_id != null && body.pillar_id !== "" ? Number(body.pillar_id) : null;
    const notes = body.notes ? String(body.notes).trim() : null;

    if (!client_id || !file_url || !file_name) {
      return NextResponse.json({ error: "Missing file details." }, { status: 400 });
    }
    if (!ASSET_FILE_TYPES.includes(file_type)) {
      return NextResponse.json({ error: "Invalid file type." }, { status: 400 });
    }

    const db = getDb();
    const company = await db.prepare("SELECT id FROM clients WHERE id = ?").get(client_id);
    if (!company) {
      return NextResponse.json({ error: "That company does not exist." }, { status: 400 });
    }

    const info = await db
      .prepare(
        `INSERT INTO assets
           (client_id, pillar_id, uploaded_by, file_url, file_name, file_type, file_size, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(client_id, pillar_id, uploaded_by, file_url, file_name, file_type, file_size, notes);

    const asset = await db.prepare("SELECT * FROM assets WHERE id = ?").get(info.lastInsertRowid);
    return NextResponse.json({ asset });
  } catch (err) {
    console.error("Create asset error:", err);
    return NextResponse.json({ error: "Could not save asset." }, { status: 500 });
  }
}
