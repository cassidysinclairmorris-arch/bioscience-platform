import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();

  const clients = db.prepare(`
    SELECT * FROM clients WHERE active = 1 ORDER BY created_at ASC
  `).all() as Record<string, unknown>[];

  const result = clients.map((client) => {
    const kit = db.prepare(`
      SELECT * FROM brand_kits WHERE client_id = ?
    `).get(client.id);

    const pillars = db.prepare(`
      SELECT * FROM pillars WHERE client_id = ? ORDER BY sort_order ASC
    `).all(client.id) as Record<string, unknown>[];

    return {
      ...client,
      logo_file: client.logo_file || null,
      posting_days: JSON.parse(client.posting_days as string),
      best_post_times: JSON.parse(client.best_post_times as string),
      brand: kit ? {
        palette:     JSON.parse((kit as Record<string, unknown>).palette as string),
        visual_mood: (kit as Record<string, unknown>).visual_mood,
        logo_text:   (kit as Record<string, unknown>).logo_text,
        accent_color:(kit as Record<string, unknown>).accent_color,
        dark_color:  (kit as Record<string, unknown>).dark_color,
        light_color: (kit as Record<string, unknown>).light_color,
        key_phrases:    JSON.parse((kit as Record<string, unknown>).key_phrases as string),
        badges:         JSON.parse((kit as Record<string, unknown>).badges as string),
        primary_font:   (kit as Record<string, unknown>).primary_font   || null,
        secondary_font: (kit as Record<string, unknown>).secondary_font || null,
        headline_font:  (kit as Record<string, unknown>).headline_font  || null,
        body_font:      (kit as Record<string, unknown>).body_font      || null,
        brand_prompt:   (kit as Record<string, unknown>).brand_prompt   || null,
        invert_logo:    Boolean((kit as Record<string, unknown>).invert_logo),
      } : null,
      pillars: pillars.map((p: Record<string, unknown>) => ({
        id:         p.id,
        day:        p.day,
        type:       p.type,
        color:      p.color,
        example:    p.example,
        sort_order: p.sort_order,
      })),
    };
  });

  return NextResponse.json({ clients: result });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const {
    id, name, tagline, color, timezone,
    audience, voice, posting_days, best_post_times,
    brand, pillars,
  } = body;

  db.prepare(`
    INSERT INTO clients
      (id, name, tagline, color, timezone, audience, voice, posting_days, best_post_times)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, name, tagline, color, timezone,
    audience, voice,
    JSON.stringify(posting_days),
    JSON.stringify(best_post_times),
  );

  if (brand) {
    db.prepare(`
      INSERT INTO brand_kits
        (client_id, palette, visual_mood, logo_text, accent_color, dark_color, light_color, key_phrases, badges, primary_font, secondary_font, headline_font, body_font, brand_prompt, invert_logo)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      JSON.stringify(brand.palette || []),
      brand.visual_mood || "",
      brand.logo_text || "",
      brand.accent_color || color,
      brand.dark_color || "#000000",
      brand.light_color || "#ffffff",
      JSON.stringify(brand.key_phrases || []),
      JSON.stringify(brand.badges || []),
      brand.primary_font   || null,
      brand.secondary_font || null,
      brand.headline_font  || null,
      brand.body_font      || null,
      brand.brand_prompt   || null,
      brand.invert_logo ? 1 : 0,
    );
  }

  if (pillars && pillars.length > 0) {
    const insertPillar = db.prepare(`
      INSERT INTO pillars (client_id, day, type, color, example, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    pillars.forEach((p: Record<string, unknown>, i: number) => {
      insertPillar.run(id, p.day, p.type, p.color, p.example, i);
    });
  }

  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
  return NextResponse.json({ client });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const allowed = ["name","tagline","color","timezone","audience","voice","active","logo_file"];
  const updates = Object.keys(fields).filter(k => allowed.includes(k));

  if (updates.length > 0) {
    const setClause = updates.map(k => `${k} = ?`).join(", ");
    const values = updates.map(k => fields[k]);
    db.prepare(`UPDATE clients SET ${setClause} WHERE id = ?`).run(...values, id);
  }

  if (fields.brand) {
    db.prepare(`
      UPDATE brand_kits SET
        palette = ?, visual_mood = ?, logo_text = ?,
        accent_color = ?, dark_color = ?, light_color = ?,
        key_phrases = ?, badges = ?,
        primary_font = ?, secondary_font = ?,
        headline_font = ?, body_font = ?,
        brand_prompt = ?, invert_logo = ?,
        updated_at = datetime('now')
      WHERE client_id = ?
    `).run(
      JSON.stringify(fields.brand.palette || []),
      fields.brand.visual_mood || "",
      fields.brand.logo_text || "",
      fields.brand.accent_color || "",
      fields.brand.dark_color || "",
      fields.brand.light_color || "",
      JSON.stringify(fields.brand.key_phrases || []),
      JSON.stringify(fields.brand.badges || []),
      fields.brand.primary_font   || null,
      fields.brand.secondary_font || null,
      fields.brand.headline_font  || null,
      fields.brand.body_font      || null,
      fields.brand.brand_prompt   || null,
      fields.brand.invert_logo ? 1 : 0,
      id,
    );
  }

  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
  return NextResponse.json({ client });
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  db.prepare("DELETE FROM clients WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}