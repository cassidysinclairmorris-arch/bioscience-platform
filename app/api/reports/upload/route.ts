import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getDb } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";
import { getAssetRequester, scopedClientId } from "@/lib/asset-access";
import {
  ALL_METRIC_KEYS,
  SIGNAL_METRICS,
  tierIncludesSignal,
  type SignalKey,
} from "@/lib/tiers";

export const runtime = "nodejs";
export const maxDuration = 60;

const SIGNAL_KEYS = SIGNAL_METRICS.map(m => m.key) as string[];

// List entered metrics for a client + month. Agency sees any client; a portal
// client is scoped to its own company.
export async function GET(req: NextRequest) {
  const requester = getAssetRequester(req);
  if (!requester) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const clientId = scopedClientId(requester, searchParams.get("clientId"));
  const period = searchParams.get("period");
  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }
  const db = getDb();
  // With a period: that month's metrics. Without: every month, for the
  // over-time chart. Ordered oldest first so the time series reads left to right.
  const rows = period
    ? await db.prepare("SELECT * FROM report_uploads WHERE client_id = ? AND period = ?").all(clientId, period)
    : await db.prepare("SELECT * FROM report_uploads WHERE client_id = ? ORDER BY period ASC").all(clientId);
  return NextResponse.json({ uploads: rows });
}

// Save one metric value and/or its LinkedIn screenshot (studio/agency only).
// One row per (client_id, period, metric_key): upserted here.
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const form = await req.formData();
    const clientId = String(form.get("clientId") || "").trim();
    const period = String(form.get("period") || "").trim();
    const metricKey = String(form.get("metricKey") || "").trim();
    const rawValue = form.get("value");
    const file = form.get("file");

    if (!clientId || !period || !metricKey) {
      return NextResponse.json({ error: "clientId, period, metricKey required" }, { status: 400 });
    }
    if (!ALL_METRIC_KEYS.includes(metricKey)) {
      return NextResponse.json({ error: "Unknown metric." }, { status: 400 });
    }

    const db = getDb();
    const client = await db.prepare("SELECT id, tier FROM clients WHERE id = ?").get(clientId) as
      | { id: string; tier: string | null }
      | undefined;
    if (!client) {
      return NextResponse.json({ error: "That company does not exist." }, { status: 400 });
    }

    // Server-side tier gate: never store a Signal metric the tier does not include.
    if (SIGNAL_KEYS.includes(metricKey) && !tierIncludesSignal(client.tier, metricKey as SignalKey)) {
      return NextResponse.json({ error: "This metric is not part of the client's plan." }, { status: 403 });
    }

    // Value: null unless a real number is entered. Never fabricated.
    let value: number | null = null;
    if (rawValue !== null && String(rawValue).trim() !== "") {
      const n = Number(rawValue);
      if (Number.isNaN(n)) {
        return NextResponse.json({ error: "Value must be a number." }, { status: 400 });
      }
      value = n;
    }

    // Optional screenshot to Vercel Blob (the local filesystem is read-only on Vercel).
    let imageUrl: string | null = null;
    if (file instanceof File && file.size > 0) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Screenshot must be an image." }, { status: 400 });
      }
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({ error: "Blob storage is not configured. Set BLOB_READ_WRITE_TOKEN." }, { status: 500 });
      }
      const safe = (file.name || "screenshot").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-40);
      const key = `report-metrics/${clientId}_${period}_${metricKey}_${Date.now()}_${safe}`;
      const blob = await put(key, file, { access: "public", contentType: file.type });
      imageUrl = blob.url;
    }

    const existing = await db
      .prepare("SELECT id, image_url FROM report_uploads WHERE client_id = ? AND period = ? AND metric_key = ?")
      .get(clientId, period, metricKey) as { id: number; image_url: string | null } | undefined;

    if (existing) {
      // Keep the existing screenshot when no new one was uploaded this save.
      await db.prepare(
        "UPDATE report_uploads SET value = ?, image_url = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(value, imageUrl ?? existing.image_url, existing.id);
    } else {
      await db.prepare(
        "INSERT INTO report_uploads (client_id, period, metric_key, value, image_url) VALUES (?, ?, ?, ?, ?)"
      ).run(clientId, period, metricKey, value, imageUrl);
    }

    const row = await db
      .prepare("SELECT * FROM report_uploads WHERE client_id = ? AND period = ? AND metric_key = ?")
      .get(clientId, period, metricKey);
    return NextResponse.json({ upload: row });
  } catch (err) {
    console.error("[reports/upload] error:", err);
    return NextResponse.json({ error: "Could not save metric." }, { status: 500 });
  }
}
