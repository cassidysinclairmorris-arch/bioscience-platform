"use client";

import { useState, useEffect, useCallback, useRef, type DragEvent } from "react";
import { upload } from "@vercel/blob/client";
import {
  allowedTypes, blobPrefix, MAX_BYTES, maxLabel, resolveContentType, safeFileName,
  type BrandUploadKind,
} from "@/lib/brand-files";

/**
 * Brand Center: everything Claude should know about a client's voice, plus the
 * reference material the agency keeps on hand.
 *
 * Seven accordion sections, one open at a time. The five text sections write to
 * the client's brand_kits row; the last two hold uploaded files.
 */

type SectionId =
  | "voice_guide"
  | "post_guidelines"
  | "target_audiences"
  | "competitor_analysis"
  | "messaging_priorities"
  | "post_examples"
  | "materials";

type SaveState = "idle" | "saving" | "saved" | "error";

type PostExample = {
  id: number; client_id: string; file_url: string; file_name: string;
  post_text: string | null; pillar: string | null;
  engagement_notes: string | null; posted_date: string | null; created_at: string;
};

type Material = {
  id: number; client_id: string; file_url: string; file_name: string;
  file_type: string | null; file_size: number; created_at: string;
};

type FormData = Record<Exclude<SectionId, "post_examples" | "materials">, string>;

const TEXT_SECTIONS: { id: keyof FormData; title: string; hint: string; placeholder: string }[] = [
  {
    id: "voice_guide",
    title: "Voice & Tone",
    hint: "How this client sounds",
    placeholder: "Quietly confident. Never shout, never scare, never overexplain. State facts simply and let them stand.",
  },
  {
    id: "post_guidelines",
    title: "Post Guidelines",
    hint: "Rules every post must follow",
    placeholder: "No em dashes. Short declarative sentences. Always name the specific product or study rather than gesturing at it.",
  },
  {
    id: "target_audiences",
    title: "Target Audiences",
    hint: "Who the content is written for",
    placeholder: "Facility managers, public health officials, enterprise buyers, investors. Write for the person who has to defend the decision internally.",
  },
  {
    id: "competitor_analysis",
    title: "Competitors & Positioning",
    hint: "Where this client sits in the market",
    placeholder: "Who else is in this space, what they claim, and the one thing this client does that they cannot.",
  },
  {
    id: "messaging_priorities",
    title: "Messaging Priorities",
    hint: "What to push this quarter",
    placeholder: "Ranked. What matters most right now, and what to leave alone until the next milestone.",
  },
];

const EMPTY_FORM: FormData = {
  voice_guide: "", post_guidelines: "", target_audiences: "",
  competitor_analysis: "", messaging_priorities: "",
};

// ── Shared styles ─────────────────────────────────────────────────────────────
const FONT = "Helvetica, Arial, sans-serif";
const card: React.CSSProperties = {
  border: "0.5px solid var(--border-line)",
  borderRadius: "12px",
  background: "var(--surface-0)",
  overflow: "hidden",
};
const headerBase: React.CSSProperties = {
  width: "100%", display: "flex", alignItems: "center", gap: "12px",
  padding: "14px 18px", background: "var(--surface-1)", border: "none",
  cursor: "pointer", textAlign: "left", fontFamily: FONT,
  transition: "background 0.15s ease",
};
const textareaStyle: React.CSSProperties = {
  width: "100%", minHeight: "120px", resize: "vertical",
  background: "var(--surface-0)", border: "0.5px solid var(--border-line)",
  borderRadius: "var(--radius)", padding: "12px",
  fontFamily: FONT, fontSize: "13px", lineHeight: 1.65,
  color: "var(--text-primary)", outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontFamily: FONT, fontSize: "12px", color: "var(--text-secondary)",
};
const buttonStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "7px",
  padding: "9px 16px", background: "var(--surface-0)",
  border: "0.5px solid var(--border-line)", borderRadius: "var(--radius)",
  fontFamily: FONT, fontSize: "13px", color: "var(--text-primary)",
  cursor: "pointer", transition: "border-color 0.15s ease",
};

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

// A quiet status line under a textarea: saving, saved, or the error.
function SaveIndicator({ state, error }: { state: SaveState; error?: string }) {
  if (state === "idle") return null;
  const text =
    state === "saving" ? "Saving…" :
    state === "saved"  ? "Saved" :
    error || "Could not save";
  return (
    <div style={{
      fontFamily: FONT, fontSize: "12px", marginTop: "8px",
      color: state === "error" ? "#E30000" : "var(--text-tertiary)",
    }}>
      {text}
    </div>
  );
}

export default function BrandCenterTab({ clientId }: { clientId: string }) {
  // Only one section open at a time, Voice & Tone on load.
  const [expanded, setExpanded] = useState<Set<SectionId>>(new Set(["voice_guide"]));
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [postExamples, setPostExamples] = useState<PostExample[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<"examples" | "materials" | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [detail, setDetail] = useState<PostExample | null>(null);

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const exampleInput = useRef<HTMLInputElement>(null);
  const materialInput = useRef<HTMLInputElement>(null);

  const toggle = (id: SectionId) =>
    setExpanded(prev => (prev.has(id) ? new Set() : new Set<SectionId>([id])));

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const [kit, ex, mat] = await Promise.all([
      fetch(`/api/clients/${clientId}/brand-kit`).then(r => (r.ok ? r.json() : { brandKit: {} })).catch(() => ({ brandKit: {} })),
      fetch(`/api/clients/${clientId}/brand-post-examples`).then(r => (r.ok ? r.json() : { examples: [] })).catch(() => ({ examples: [] })),
      fetch(`/api/clients/${clientId}/brand-materials`).then(r => (r.ok ? r.json() : { materials: [] })).catch(() => ({ materials: [] })),
    ]);
    setFormData({ ...EMPTY_FORM, ...(kit.brandKit || {}) });
    setPostExamples(ex.examples || []);
    setMaterials(mat.materials || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  // Drop any pending autosave when the client changes, so a debounce started for
  // one client cannot land on another.
  useEffect(() => {
    const pending = timers.current;
    return () => { Object.values(pending).forEach(clearTimeout); };
  }, [clientId]);

  // ── Autosave ────────────────────────────────────────────────────────────────
  const save = useCallback(async (field: keyof FormData, value: string) => {
    setSaveStates(s => ({ ...s, [field]: "saving" }));
    try {
      const res = await fetch(`/api/clients/${clientId}/brand-kit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed");
      setSaveStates(s => ({ ...s, [field]: "saved" }));
      setTimeout(() => setSaveStates(s => (s[field] === "saved" ? { ...s, [field]: "idle" } : s)), 2000);
    } catch (err) {
      setErrors(e => ({ ...e, [field]: err instanceof Error ? err.message : "Save failed" }));
      setSaveStates(s => ({ ...s, [field]: "error" }));
    }
  }, [clientId]);

  // Blur commits immediately; typing schedules a save 500ms after the last key.
  const scheduleSave = (field: keyof FormData, value: string) => {
    clearTimeout(timers.current[field]);
    timers.current[field] = setTimeout(() => save(field, value), 500);
  };
  const saveNow = (field: keyof FormData, value: string) => {
    clearTimeout(timers.current[field]);
    save(field, value);
  };

  // ── Uploads ─────────────────────────────────────────────────────────────────
  // Browser to Blob directly, then a metadata POST once the URL exists. Nothing
  // routes the file bytes through a serverless function, so a full deck uploads.
  const putFile = useCallback(async (kind: BrandUploadKind, file: File) => {
    const errorKey = kind === "examples" ? "post_examples" : "materials";
    const fail = (message: string) => setErrors(e => ({ ...e, [errorKey]: message }));

    const contentType = resolveContentType(file.name, file.type);
    if (!allowedTypes(kind).includes(contentType)) {
      fail(`Unsupported file type (${contentType || file.type || "unknown"}).`);
      return null;
    }
    if (file.size > MAX_BYTES[kind]) {
      fail(`File too large (max ${maxLabel(kind)}).`);
      return null;
    }

    setErrors(e => ({ ...e, [errorKey]: "" }));
    setUploading(kind);
    try {
      const blob = await upload(
        `${blobPrefix(kind, clientId)}${safeFileName(file.name, kind === "examples" ? "example" : "material")}`,
        file,
        {
          access: "public",
          contentType,
          handleUploadUrl: `/api/clients/${clientId}/brand-upload`,
          clientPayload: kind,
        },
      );
      return {
        file_url: blob.url,
        file_name: file.name,
        file_type: contentType,
        file_size: file.size,
      };
    } catch (err) {
      fail(err instanceof Error ? err.message : "Upload failed");
      return null;
    } finally {
      setUploading(null);
    }
  }, [clientId]);

  const uploadExample = async (file: File) => {
    const meta = await putFile("examples", file);
    if (!meta) return;
    const res = await fetch(`/api/clients/${clientId}/brand-post-examples`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(meta),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.example) setPostExamples(prev => [d.example, ...prev].slice(0, 12));
    else setErrors(e => ({ ...e, post_examples: d.error || "Upload failed" }));
  };

  const uploadMaterial = async (file: File) => {
    const meta = await putFile("materials", file);
    if (!meta) return;
    const res = await fetch(`/api/clients/${clientId}/brand-materials`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(meta),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.material) setMaterials(prev => [d.material, ...prev]);
    else setErrors(e => ({ ...e, materials: d.error || "Upload failed" }));
  };

  const removeExample = async (id: number) => {
    const res = await fetch(`/api/clients/${clientId}/brand-post-examples?id=${id}`, { method: "DELETE" });
    if (res.ok) setPostExamples(prev => prev.filter(x => x.id !== id));
  };
  const removeMaterial = async (id: number) => {
    const res = await fetch(`/api/clients/${clientId}/brand-materials?id=${id}`, { method: "DELETE" });
    if (res.ok) setMaterials(prev => prev.filter(x => x.id !== id));
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadMaterial(file);
  };

  // ── Section shell ───────────────────────────────────────────────────────────
  const Section = ({ id, title, meta, children }: {
    id: SectionId; title: string; meta: string; children: React.ReactNode;
  }) => {
    const open = expanded.has(id);
    return (
      <div style={card}>
        <button
          onClick={() => toggle(id)}
          style={headerBase}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-hover)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--surface-1)"; }}
          aria-expanded={open}
        >
          <span style={{ fontFamily: FONT, fontSize: "15px", fontWeight: 500, color: "var(--text-primary)" }}>
            {title}
          </span>
          <span style={{ ...labelStyle, color: "var(--text-tertiary)" }}>{meta}</span>
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "var(--text-tertiary)" }}>
            {open ? "▲" : "▼"}
          </span>
        </button>
        {open && <div style={{ padding: "18px" }}>{children}</div>}
      </div>
    );
  };

  if (!clientId) {
    return <div style={{ ...labelStyle, padding: "40px 0", textAlign: "center" }}>Select a client to edit their Brand Center.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {loading && (
        <div style={{ ...labelStyle, color: "var(--text-tertiary)" }}>Loading brand center…</div>
      )}

      {/* 1 to 5: long-form guidance, autosaved */}
      {TEXT_SECTIONS.map(s => {
        const value = formData[s.id];
        const words = value.trim() ? value.trim().split(/\s+/).length : 0;
        return (
          <Section key={s.id} id={s.id} title={s.title} meta={words ? `${words} words` : s.hint}>
            <textarea
              value={value}
              placeholder={s.placeholder}
              onChange={e => {
                const v = e.target.value;
                setFormData(f => ({ ...f, [s.id]: v }));
                scheduleSave(s.id, v);
              }}
              onBlur={e => saveNow(s.id, e.target.value)}
              style={textareaStyle}
              onFocus={e => { e.target.style.borderColor = "var(--text-tertiary)"; }}
            />
            <SaveIndicator state={saveStates[s.id] ?? "idle"} error={errors[s.id]} />
          </Section>
        );
      })}

      {/* 6: post examples */}
      <Section
        id="post_examples"
        title="Post Examples"
        meta={postExamples.length ? `${postExamples.length} of 12` : "Screenshots of posts that worked"}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: postExamples.length ? "16px" : 0 }}>
          <button
            onClick={() => exampleInput.current?.click()}
            disabled={uploading === "examples"}
            style={{ ...buttonStyle, opacity: uploading === "examples" ? 0.6 : 1 }}
          >
            {uploading === "examples" ? "Uploading…" : "Upload screenshot"}
          </button>
          <span style={{ ...labelStyle, color: "var(--text-tertiary)" }}>PNG, JPG or WEBP, up to {maxLabel("examples")}. The 12 most recent are kept.</span>
          <input
            ref={exampleInput} type="file" accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadExample(f); e.target.value = ""; }}
          />
        </div>
        {errors.post_examples && (
          <div style={{ ...labelStyle, color: "#E30000", marginBottom: "12px" }}>{errors.post_examples}</div>
        )}

        {postExamples.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px" }}>
            {postExamples.slice(0, 12).map(ex => (
              <div
                key={ex.id}
                onClick={() => setDetail(ex)}
                style={{
                  position: "relative", border: "0.5px solid var(--border-line)",
                  borderRadius: "12px", overflow: "hidden", background: "var(--surface-1)",
                  cursor: "pointer",
                }}
                onMouseEnter={e => { const x = e.currentTarget.querySelector("[data-remove]") as HTMLElement | null; if (x) x.style.opacity = "1"; }}
                onMouseLeave={e => { const x = e.currentTarget.querySelector("[data-remove]") as HTMLElement | null; if (x) x.style.opacity = "0"; }}
              >
                <div style={{ height: "104px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-1)", overflow: "hidden" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ex.file_url} alt={ex.file_name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />
                </div>
                <div style={{ padding: "8px 10px", background: "var(--surface-0)", borderTop: "0.5px solid var(--border-line)" }}>
                  <div style={{ fontFamily: FONT, fontSize: "12px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    📸 {ex.pillar || ex.file_name}
                  </div>
                  {ex.engagement_notes && (
                    <div style={{ ...labelStyle, color: "var(--text-tertiary)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ex.engagement_notes}
                    </div>
                  )}
                </div>
                <button
                  data-remove
                  onClick={e => { e.stopPropagation(); removeExample(ex.id); }}
                  style={{
                    position: "absolute", top: "6px", right: "6px", width: "22px", height: "22px",
                    borderRadius: "999px", border: "none", background: "rgba(10,10,10,0.65)",
                    color: "#FFFFFF", cursor: "pointer", fontSize: "13px", lineHeight: 1,
                    opacity: 0, transition: "opacity 0.15s ease", fontFamily: FONT,
                  }}
                  aria-label={`Remove ${ex.file_name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 7: reference materials */}
      <Section
        id="materials"
        title="Materials & References"
        meta={materials.length ? `${materials.length} file${materials.length === 1 ? "" : "s"}` : "Decks, briefs, research"}
      >
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          style={{
            border: `1px dashed ${dragOver ? "var(--text-tertiary)" : "var(--border-line)"}`,
            borderRadius: "12px", padding: "22px", textAlign: "center",
            background: dragOver ? "var(--surface-1)" : "var(--surface-0)",
            transition: "background 0.15s ease, border-color 0.15s ease",
          }}
        >
          <div style={{ ...labelStyle, marginBottom: "10px" }}>
            Drag a file here, or
          </div>
          <button
            onClick={() => materialInput.current?.click()}
            disabled={uploading === "materials"}
            style={{ ...buttonStyle, opacity: uploading === "materials" ? 0.6 : 1 }}
          >
            {uploading === "materials" ? "Uploading…" : "Choose file"}
          </button>
          <div style={{ ...labelStyle, color: "var(--text-tertiary)", marginTop: "10px" }}>
            PDF, DOC, PPT, TXT or image, up to {maxLabel("materials")}
          </div>
          <input
            ref={materialInput} type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,image/png,image/jpeg"
            style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadMaterial(f); e.target.value = ""; }}
          />
        </div>
        {errors.materials && (
          <div style={{ ...labelStyle, color: "#E30000", marginTop: "12px" }}>{errors.materials}</div>
        )}

        {materials.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", marginTop: "16px" }}>
            {materials.map((m, i) => (
              <div
                key={m.id}
                style={{
                  display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px",
                  borderTop: i === 0 ? "0.5px solid var(--border-line)" : "none",
                  borderBottom: "0.5px solid var(--border-line)",
                }}
              >
                <span style={{ fontSize: "14px" }}>📄</span>
                <a
                  href={m.file_url} target="_blank" rel="noreferrer"
                  style={{ fontFamily: FONT, fontSize: "13px", color: "var(--text-primary)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {m.file_name}
                </a>
                <span style={{ ...labelStyle, color: "var(--text-tertiary)", flexShrink: 0 }}>{formatSize(m.file_size)}</span>
                <button
                  onClick={() => removeMaterial(m.id)}
                  style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#E30000", fontFamily: FONT, fontSize: "12px", flexShrink: 0 }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* What each section is actually used for */}
      <div style={{ ...labelStyle, color: "var(--text-tertiary)", lineHeight: 1.7, padding: "4px 2px 8px" }}>
        Claude reads your Brand Kit sections when generating posts. Post Examples show Claude your style
        when generating visuals. Materials are for your reference only.
      </div>

      {/* Optional detail editor for a post example */}
      {detail && (
        <ExampleDetail
          clientId={clientId}
          example={detail}
          onClose={() => setDetail(null)}
          onSaved={updated => {
            setPostExamples(prev => prev.map(x => (x.id === updated.id ? updated : x)));
            setDetail(null);
          }}
        />
      )}
    </div>
  );
}

// Modal for the notes attached to a post example: the text, its pillar, and how
// it performed. All optional; the screenshot alone is useful on its own.
function ExampleDetail({ clientId, example, onClose, onSaved }: {
  clientId: string;
  example: PostExample;
  onClose: () => void;
  onSaved: (e: PostExample) => void;
}) {
  const [postText, setPostText] = useState(example.post_text ?? "");
  const [pillar, setPillar] = useState(example.pillar ?? "");
  const [notes, setNotes] = useState(example.engagement_notes ?? "");
  const [postedDate, setPostedDate] = useState(example.posted_date ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const res = await fetch(`/api/clients/${clientId}/brand-post-examples`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: example.id, post_text: postText, pillar, engagement_notes: notes, posted_date: postedDate }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && d.example) onSaved(d.example);
  };

  const field: React.CSSProperties = {
    width: "100%", background: "var(--surface-0)", border: "0.5px solid var(--border-line)",
    borderRadius: "var(--radius)", padding: "10px 12px", fontFamily: FONT, fontSize: "13px",
    color: "var(--text-primary)", outline: "none", boxSizing: "border-box",
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(10,10,10,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 24px", overflowY: "auto" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ ...card, width: "100%", maxWidth: "620px", padding: "24px" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "16px" }}>
          <div style={{ fontFamily: FONT, fontSize: "15px", fontWeight: 500, color: "var(--text-primary)" }}>Post example</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: "20px", lineHeight: 1 }} aria-label="Close">×</button>
        </div>

        <div style={{ border: "0.5px solid var(--border-line)", borderRadius: "12px", background: "var(--surface-1)", padding: "10px", display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={example.file_url} alt={example.file_name} style={{ maxWidth: "100%", maxHeight: "320px", objectFit: "contain", display: "block" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <div style={{ ...labelStyle, marginBottom: "6px" }}>Post text</div>
            <textarea value={postText} onChange={e => setPostText(e.target.value)} rows={4} style={{ ...field, resize: "vertical", lineHeight: 1.6 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <div style={{ ...labelStyle, marginBottom: "6px" }}>Pillar</div>
              <input value={pillar} onChange={e => setPillar(e.target.value)} style={field} />
            </div>
            <div>
              <div style={{ ...labelStyle, marginBottom: "6px" }}>Posted date</div>
              <input type="date" value={postedDate} onChange={e => setPostedDate(e.target.value)} style={field} />
            </div>
          </div>
          <div>
            <div style={{ ...labelStyle, marginBottom: "6px" }}>How it performed</div>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="4.2k impressions, 38 comments" style={field} />
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", marginTop: "18px" }}>
          <button onClick={submit} disabled={busy} style={{ ...buttonStyle, background: "#E30000", borderColor: "#E30000", color: "#FFFFFF", opacity: busy ? 0.6 : 1 }}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button onClick={onClose} style={buttonStyle}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
