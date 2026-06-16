"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { Company } from "@/lib/companies";

// ── Globals ───────────────────────────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { fabric: any } }
type FO = any;
type FC = any;

// ── Constants ─────────────────────────────────────────────────────────────────
const LOGO_FILES: Record<string, string> = {
  cpolar: "/files/cpolar_logo_final.png",
  oxia: "/files/oxia_logo_final.png",
  coregen: "/files/coregen_logo_final.png",
  intrepro: "/files/klimloc_logo_final.png",
  senvi: "/files/senvi_logo_final.png",
};

const FONTS = ["DM Sans", "Inter", "Playfair Display", "Space Grotesk"];

const SIZES = {
  square:   { dw: 560, dh: 560,  ew: 1080, eh: 1080,  label: "Square 1080×1080",    icon: "⬜" },
  portrait: { dw: 448, dh: 560,  ew: 1080, eh: 1350,  label: "Portrait 1080×1350",   icon: "▯" },
  banner:   { dw: 560, dh: 141,  ew: 1584, eh: 396,   label: "Banner 1584×396",      icon: "▬" },
};
type SizeKey = keyof typeof SIZES;

// ── Dark theme ────────────────────────────────────────────────────────────────
const D = {
  bg:       "#0C0C0C",
  panel:    "#151515",
  panelAlt: "#1A1A1A",
  border:   "rgba(255,255,255,0.07)",
  borderHi: "rgba(255,255,255,0.16)",
  text:     "#DEDEDE",
  textDim:  "rgba(222,222,222,0.42)",
  textMid:  "rgba(222,222,222,0.68)",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function hexToRgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function DkBtn({
  onClick, disabled = false, active = false, accent,
  style, children,
}: {
  onClick?: () => void; disabled?: boolean; active?: boolean; accent?: string;
  style?: React.CSSProperties; children: React.ReactNode;
}) {
  const bg = active ? (accent ? `${accent}22` : "rgba(255,255,255,0.10)") : "transparent";
  const border = active ? (accent ? `${accent}66` : D.borderHi) : D.border;
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "5px",
        padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 500,
        letterSpacing: "0.03em", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1, transition: "all 0.15s", fontFamily: "inherit",
        background: bg, border: `1px solid ${border}`,
        color: active ? (accent || D.text) : D.textMid, ...style,
      }}
    >{children}</button>
  );
}

function DkSlider({ label, value, min, max, step = 1, onChange, unit = "" }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; unit?: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 10, color: D.textDim, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 10, color: D.textMid, fontVariantNumeric: "tabular-nums" }}>{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#555", cursor: "pointer" }}
      />
    </div>
  );
}

function DkLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.11em", textTransform: "uppercase", color: D.textDim, marginBottom: 7 }}>{children}</div>;
}

function DkSection({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ borderBottom: `1px solid ${D.border}`, padding: "14px 16px", ...style }}>{children}</div>;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ImageStudio({ ac }: { ac: Company }) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [imgError, setImgError] = useState("");
  const [txtError, setTxtError] = useState("");
  const [sizeKey, setSizeKey] = useState<SizeKey>("square");
  const [quality, setQuality] = useState<"standard" | "high">("standard");
  const [activeRightTab, setActiveRightTab] = useState<"element" | "background" | "export">("background");
  const [bgMode, setBgMode] = useState<"regen" | "overlay" | "solid" | "replace">("regen");
  const [regenPrompt, setRegenPrompt] = useState("");
  const [regenLoading, setRegenLoading] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Overlay
  const [ovColor, setOvColor] = useState("#000000");
  const [ovOpacity, setOvOpacity] = useState(35);
  const [ovEnabled, setOvEnabled] = useState(false);

  // Solid / gradient bg
  const [bgSolidColor, setBgSolidColor] = useState("#0A0A0A");
  const [bgSolidEnabled, setBgSolidEnabled] = useState(false);
  const [gradEnabled, setGradEnabled] = useState(false);
  const [grad, setGrad] = useState({ c1: "#000000", c2: "#333333", dir: "vertical" as "vertical" | "horizontal" | "diagonal" });

  // Vignette
  const [vigEnabled, setVigEnabled] = useState(true);

  // Selected object props (synced when element selected)
  const [selId, setSelId] = useState<string | null>(null);
  const [ep, setEp] = useState({
    fontFamily: "DM Sans", fontSize: 32, fill: "#FFFFFF",
    fontWeight: "normal" as "normal" | "bold",
    fontStyle: "normal" as "normal" | "italic",
    opacity: 100, charSpacing: 0,
    textAlign: "left" as "left" | "center" | "right",
    shadow: true,
  });

  // Floating toolbar
  const [ftb, setFtb] = useState({ show: false, x: 0, y: 0, isText: false });

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<FC>(null);
  const originalImageUrl = useRef<string>("");
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const isHistoric = useRef(false);
  const bgLayerRef = useRef<FO>(null);
  const vigLayerRef = useRef<FO>(null);
  const ovLayerRef = useRef<FO>(null);
  const fabricLoaded = useRef(false);

  // ── Brand data ──────────────────────────────────────────────────────────────
  const br = (ac.brand || {}) as Record<string, unknown>;
  const bColors = [
    (br.accent_color || ac.color || "#2BBFB0") as string,
    (br.dark_color   || "#111111") as string,
    (br.light_color  || "#F5F2EE") as string,
  ];
  const bFonts = {
    headline: (br.headline_font || "Playfair Display") as string,
    body:     (br.body_font     || "DM Sans") as string,
  };
  const bTone = (ac.voice || "modern professional").slice(0, 120);
  const bVS   = ((br.visual_mood as string) || "premium editorial").slice(0, 120);
  const bLogo = LOGO_FILES[ac.id] || (ac.logo_file as string | null) || null;

  // Seed gradient colors from brand on mount / client change
  useEffect(() => {
    setGrad(g => ({ ...g, c1: bColors[0], c2: bColors[1] }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ac.id]);

  // Reset when client changes
  useEffect(() => {
    setCanvasReady(false);
    setImgError("");
    setTxtError("");
    setPrompt("");
    if (fabricRef.current) {
      try { fabricRef.current.dispose(); } catch {}
      fabricRef.current = null;
    }
    originalImageUrl.current = "";
    undoStack.current = [];
    redoStack.current = [];
  }, [ac.id]);

  // Load Google Fonts needed for canvas
  useEffect(() => {
    const id = "is-google-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id; link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fabricRef.current) {
        try { fabricRef.current.dispose(); } catch {}
      }
    };
  }, []);

  // ── Fabric loader ───────────────────────────────────────────────────────────
  const ensureFabric = useCallback((): Promise<void> => {
    return new Promise(res => {
      if (window.fabric) { fabricLoaded.current = true; res(); return; }
      if (fabricLoaded.current) { res(); return; }
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js";
      s.onload = () => { fabricLoaded.current = true; res(); };
      s.onerror = () => console.error("Failed to load Fabric.js");
      document.head.appendChild(s);
    });
  }, []);

  // ── Snapshot helpers ────────────────────────────────────────────────────────
  const saveSnapshot = useCallback(() => {
    if (isHistoric.current || !fabricRef.current) return;
    const json = JSON.stringify(fabricRef.current.toJSON(["isBg", "isVig", "isOv", "customId"]));
    undoStack.current = [...undoStack.current.slice(-29), json];
    redoStack.current = [];
  }, []);

  const applySnapshot = useCallback((json: string) => {
    if (!fabricRef.current) return;
    isHistoric.current = true;
    fabricRef.current.loadFromJSON(json, () => {
      fabricRef.current.renderAll();
      isHistoric.current = false;
      const objs: FO[] = fabricRef.current.getObjects();
      bgLayerRef.current  = objs.find((o: FO) => o.isBg)  ?? null;
      vigLayerRef.current = objs.find((o: FO) => o.isVig) ?? null;
      ovLayerRef.current  = objs.find((o: FO) => o.isOv)  ?? null;
    });
  }, []);

  const undo = useCallback(() => {
    if (undoStack.current.length <= 1) return;
    const cur = undoStack.current.pop()!;
    redoStack.current = [...redoStack.current, cur];
    applySnapshot(undoStack.current[undoStack.current.length - 1]);
  }, [applySnapshot]);

  const redo = useCallback(() => {
    if (!redoStack.current.length) return;
    const next = redoStack.current.pop()!;
    undoStack.current = [...undoStack.current, next];
    applySnapshot(next);
  }, [applySnapshot]);

  // ── Floating toolbar position ───────────────────────────────────────────────
  const syncFtb = useCallback((obj: FO | null) => {
    if (!obj) { setFtb(f => ({ ...f, show: false })); return; }
    try {
      const br = obj.getBoundingRect(true, true);
      setFtb({ show: true, x: br.left + br.width / 2, y: br.top, isText: obj.type === "i-text" || obj.type === "text" });
    } catch {}
  }, []);

  // ── Sync element props from selected object ─────────────────────────────────
  const syncElemProps = useCallback((obj: FO) => {
    setEp({
      fontFamily:  obj.fontFamily  || "DM Sans",
      fontSize:    Math.round(obj.fontSize    || 32),
      fill:        typeof obj.fill === "string" ? obj.fill : "#FFFFFF",
      fontWeight:  obj.fontWeight  || "normal",
      fontStyle:   obj.fontStyle   || "normal",
      opacity:     Math.round((obj.opacity ?? 1) * 100),
      charSpacing: Math.round(obj.charSpacing || 0),
      textAlign:   obj.textAlign   || "left",
      shadow:      !!obj.shadow,
    });
  }, []);

  // ── Apply element props to selected object ──────────────────────────────────
  const applyElem = useCallback((patch: Partial<typeof ep>) => {
    if (!fabricRef.current) return;
    const obj = fabricRef.current.getActiveObject();
    if (!obj || !obj.selectable) return;
    const next = { ...ep, ...patch };
    setEp(next);
    const updates: Record<string, unknown> = {};
    if ("fontFamily"  in patch) updates.fontFamily  = patch.fontFamily;
    if ("fontSize"    in patch) updates.fontSize    = patch.fontSize;
    if ("fill"        in patch) updates.fill        = patch.fill;
    if ("fontWeight"  in patch) updates.fontWeight  = patch.fontWeight;
    if ("fontStyle"   in patch) updates.fontStyle   = patch.fontStyle;
    if ("opacity"     in patch) updates.opacity     = (patch.opacity ?? 100) / 100;
    if ("charSpacing" in patch) updates.charSpacing = patch.charSpacing;
    if ("textAlign"   in patch) updates.textAlign   = patch.textAlign;
    if ("shadow"      in patch) {
      updates.shadow = patch.shadow
        ? new window.fabric.Shadow({ color: "rgba(0,0,0,0.4)", blur: 8, offsetX: 1, offsetY: 1 })
        : null;
    }
    obj.set(updates);
    fabricRef.current.requestRenderAll();
    saveSnapshot();
  }, [ep, saveSnapshot]);

  // ── Add vignette layer ──────────────────────────────────────────────────────
  const addVignette = useCallback((canvas: FC, w: number, h: number) => {
    if (!window.fabric) return;
    const vig = new window.fabric.Rect({
      left: 0, top: 0, width: w, height: h,
      fill: new window.fabric.Gradient({
        type: "radial", gradientUnits: "pixels",
        coords: { x1: w / 2, y1: h / 2, r1: 0, x2: w / 2, y2: h / 2, r2: Math.max(w, h) * 0.75 },
        colorStops: [
          { offset: 0,   color: "rgba(0,0,0,0)"    },
          { offset: 0.5, color: "rgba(0,0,0,0)"    },
          { offset: 1,   color: "rgba(0,0,0,0.65)" },
        ],
      }),
      selectable: false, evented: false, isVig: true,
    });
    canvas.add(vig);
    vigLayerRef.current = vig;
  }, []);

  // ── Canvas init ─────────────────────────────────────────────────────────────
  const initCanvas = useCallback(async (
    imgUrl: string,
    textData: { headline: string; subtext: string; tagline: string },
    targetSizeKey: SizeKey = sizeKey,
  ) => {
    await ensureFabric();
    if (!canvasRef.current) return;

    if (fabricRef.current) {
      try { fabricRef.current.dispose(); } catch {}
    }

    const sz = SIZES[targetSizeKey];

    const canvas: FC = new window.fabric.Canvas(canvasRef.current, {
      width: sz.dw,
      height: sz.dh,
      backgroundColor: "#0A0A0A",
      preserveObjectStacking: true,
      selection: true,
    });
    fabricRef.current = canvas;
    undoStack.current = [];
    redoStack.current = [];
    bgLayerRef.current = null;
    vigLayerRef.current = null;
    ovLayerRef.current = null;

    const safeUrl = `/api/proxy-image?url=${encodeURIComponent(imgUrl)}`;

    window.fabric.Image.fromURL(safeUrl, (img: FO) => {
      if (!img) return;
      // Scale to cover
      const scX = sz.dw / (img.width  || sz.dw);
      const scY = sz.dh / (img.height || sz.dh);
      const sc  = Math.max(scX, scY);
      img.set({
        left:     (sz.dw - (img.width  || sz.dw) * sc) / 2,
        top:      (sz.dh - (img.height || sz.dh) * sc) / 2,
        scaleX: sc, scaleY: sc,
        selectable: false, evented: false, isBg: true,
      });
      canvas.insertAt(img, 0);
      bgLayerRef.current = img;

      // Vignette
      if (vigEnabled) addVignette(canvas, sz.dw, sz.dh);

      // Text helper
      const makeText = (text: string, opts: Record<string, unknown>) => {
        const t = new window.fabric.IText(text, {
          ...opts,
          shadow: new window.fabric.Shadow({ color: "rgba(0,0,0,0.4)", blur: 8, offsetX: 1, offsetY: 1 }),
        });
        canvas.add(t);
        return t;
      };

      // Headline
      makeText(textData.headline, {
        left: sz.dw * 0.055, top: sz.dh * 0.20, width: sz.dw * 0.89,
        fontFamily: bFonts.headline, fontSize: Math.round(sz.dh * 0.108),
        fontWeight: "bold", fill: "#FFFFFF", textAlign: "left",
      });

      // Subtext
      makeText(textData.subtext, {
        left: sz.dw * 0.055, top: sz.dh * 0.40, width: sz.dw * 0.89,
        fontFamily: bFonts.body, fontSize: Math.round(sz.dh * 0.042),
        fill: "rgba(255,255,255,0.88)", textAlign: "left",
      });

      // Tagline
      makeText(textData.tagline, {
        left: sz.dw * 0.055, top: sz.dh * 0.84, width: sz.dw * 0.89,
        fontFamily: bFonts.body, fontSize: Math.round(sz.dh * 0.027),
        fill: bColors[0], charSpacing: 150, fontStyle: "italic", textAlign: "left",
      });

      canvas.renderAll();
      saveSnapshot();
      setCanvasReady(true);
      setActiveRightTab("background");
    }, { crossOrigin: "anonymous" });

    // ── Events ─────────────────────────────────────────────────────────────────
    const onSel = (e: Record<string, unknown>) => {
      const obj = (e.target || (e.selected as FO[])?.[0]) as FO | null;
      if (!obj?.selectable) return;
      setSelId(obj.customId || String(Date.now()));
      syncElemProps(obj);
      syncFtb(obj);
      setActiveRightTab("element");
    };

    canvas.on("selection:created", onSel);
    canvas.on("selection:updated", onSel);
    canvas.on("selection:cleared", () => {
      setSelId(null);
      setFtb(f => ({ ...f, show: false }));
    });
    canvas.on("object:modified", () => { saveSnapshot(); syncFtb(canvas.getActiveObject()); });
    canvas.on("object:moving",   (e: Record<string, unknown>) => {
      const obj = e.target as FO;
      // Snap to 8px grid
      if (obj?.selectable) {
        obj.set({ left: Math.round((obj.left || 0) / 8) * 8, top: Math.round((obj.top || 0) / 8) * 8 });
        syncFtb(obj);
      }
    });
    canvas.on("object:scaling",  (e: Record<string, unknown>) => syncFtb(e.target as FO));
    canvas.on("object:rotating", (e: Record<string, unknown>) => syncFtb(e.target as FO));
  }, [sizeKey, vigEnabled, bColors, bFonts, ensureFabric, addVignette, saveSnapshot, syncElemProps, syncFtb]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !canvasReady) return;
    const handler = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement;
      if (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable) return;
      const canvas = fabricRef.current;
      if (!canvas) return;
      const obj = canvas.getActiveObject() as FO | null;

      if ((e.key === "Delete" || e.key === "Backspace") && obj?.selectable) {
        canvas.remove(obj); canvas.renderAll(); saveSnapshot(); return;
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault(); undo(); return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "Z" || (e.shiftKey && e.key === "z"))) {
        e.preventDefault(); redo(); return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && obj?.selectable) {
        e.preventDefault();
        obj.clone((cloned: FO) => {
          cloned.set({ left: (cloned.left || 0) + 20, top: (cloned.top || 0) + 20 });
          canvas.add(cloned); canvas.setActiveObject(cloned); canvas.renderAll(); saveSnapshot();
        });
        return;
      }
      if (e.key === "Escape") { canvas.discardActiveObject(); canvas.renderAll(); return; }
      if (obj?.selectable && ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        if (e.key === "ArrowUp")    obj.set({ top:  (obj.top  || 0) - d });
        if (e.key === "ArrowDown")  obj.set({ top:  (obj.top  || 0) + d });
        if (e.key === "ArrowLeft")  obj.set({ left: (obj.left || 0) - d });
        if (e.key === "ArrowRight") obj.set({ left: (obj.left || 0) + d });
        obj.setCoords(); canvas.renderAll(); syncFtb(obj);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, canvasReady, undo, redo, saveSnapshot, syncFtb]);

  // ── Generate ────────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setGenerating(true); setCanvasReady(false); setImgError(""); setTxtError("");
    setRegenPrompt(prompt);

    const [imgRes, txtRes] = await Promise.allSettled([
      fetch("/api/generate-image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, brandColors: bColors, brandTone: bTone, brandVisualStyle: bVS }),
      }).then(r => r.json()),
      fetch("/api/generate-image-text", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, brandTone: bTone, clientName: ac.name }),
      }).then(r => r.json()),
    ]);

    const imgUrl  = imgRes.status  === "fulfilled" ? imgRes.value.url  : null;
    const txtData = txtRes.status  === "fulfilled" ? txtRes.value      : null;

    if (imgRes.status  === "rejected" || !imgUrl)  setImgError("Image generation failed — check FAL_API_KEY");
    if (txtRes.status  === "rejected" || !txtData) setTxtError("Text generation failed — check ANTHROPIC_API_KEY");

    if (imgUrl) {
      originalImageUrl.current = imgUrl;
      await initCanvas(imgUrl, txtData || { headline: "Your Message Here", subtext: "Insight for your target audience.", tagline: ac.name });
    }
    setGenerating(false);
  }, [prompt, bColors, bTone, bVS, ac.name, initCanvas]);

  // ── Background operations ───────────────────────────────────────────────────
  const handleRegen = useCallback(async () => {
    if (!regenPrompt.trim() || !fabricRef.current) return;
    setRegenLoading(true);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: regenPrompt, brandColors: bColors, brandTone: bTone, brandVisualStyle: bVS }),
      });
      const data = await res.json();
      if (data.url) {
        originalImageUrl.current = data.url;
        const safeUrl = `/api/proxy-image?url=${encodeURIComponent(data.url)}`;
        const sz = SIZES[sizeKey];
        window.fabric.Image.fromURL(safeUrl, (img: FO) => {
          if (!img || !bgLayerRef.current) return;
          const sc = Math.max(sz.dw / (img.width || sz.dw), sz.dh / (img.height || sz.dh));
          bgLayerRef.current.set({ _element: img._element, scaleX: sc, scaleY: sc });
          fabricRef.current.renderAll();
          saveSnapshot();
        }, { crossOrigin: "anonymous" });
      }
    } catch {}
    setRegenLoading(false);
  }, [regenPrompt, bColors, bTone, bVS, sizeKey, saveSnapshot]);

  const applyOverlay = useCallback((color: string, opacity: number, enabled: boolean) => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    const sz = SIZES[sizeKey];

    if (ovLayerRef.current) {
      canvas.remove(ovLayerRef.current);
      ovLayerRef.current = null;
    }
    if (!enabled) { canvas.renderAll(); return; }

    const ov = new window.fabric.Rect({
      left: 0, top: 0, width: sz.dw, height: sz.dh,
      fill: hexToRgba(color, opacity / 100),
      selectable: false, evented: false, isOv: true,
    });

    // Insert above vignette (index 2) but below text layers
    const vigIdx = canvas.getObjects().indexOf(vigLayerRef.current);
    canvas.insertAt(ov, vigIdx >= 0 ? vigIdx + 1 : 2);
    ovLayerRef.current = ov;
    canvas.renderAll();
    saveSnapshot();
  }, [sizeKey, saveSnapshot]);

  const applySolidBg = useCallback((color: string) => {
    if (!fabricRef.current || !bgLayerRef.current) return;
    bgLayerRef.current.set({ fill: color, _element: null });
    const sz = SIZES[sizeKey];
    bgLayerRef.current.set({ width: sz.dw, height: sz.dh, scaleX: 1, scaleY: 1, left: 0, top: 0 });
    fabricRef.current.renderAll();
    saveSnapshot();
  }, [sizeKey, saveSnapshot]);

  const applyGradientBg = useCallback((c1: string, c2: string, dir: string) => {
    if (!fabricRef.current || !bgLayerRef.current) return;
    const sz = SIZES[sizeKey];
    const coords = dir === "horizontal"
      ? { x1: 0, y1: 0, x2: sz.dw, y2: 0 }
      : dir === "diagonal"
        ? { x1: 0, y1: 0, x2: sz.dw, y2: sz.dh }
        : { x1: 0, y1: 0, x2: 0, y2: sz.dh };

    bgLayerRef.current.set({
      fill: new window.fabric.Gradient({ type: "linear", gradientUnits: "pixels", coords, colorStops: [{ offset: 0, color: c1 }, { offset: 1, color: c2 }] }),
      width: sz.dw, height: sz.dh, scaleX: 1, scaleY: 1, left: 0, top: 0, _element: null,
    });
    fabricRef.current.renderAll();
    saveSnapshot();
  }, [sizeKey, saveSnapshot]);

  const restoreOriginalBg = useCallback(() => {
    if (!originalImageUrl.current || !fabricRef.current) return;
    const sz = SIZES[sizeKey];
    const safeUrl = `/api/proxy-image?url=${encodeURIComponent(originalImageUrl.current)}`;
    window.fabric.Image.fromURL(safeUrl, (img: FO) => {
      if (!img || !bgLayerRef.current) return;
      const sc = Math.max(sz.dw / (img.width || sz.dw), sz.dh / (img.height || sz.dh));
      bgLayerRef.current.set({
        _element: img._element, scaleX: sc, scaleY: sc,
        left: (sz.dw - (img.width || sz.dw) * sc) / 2,
        top:  (sz.dh - (img.height || sz.dh) * sc) / 2,
        fill: undefined,
      });
      fabricRef.current.renderAll();
      saveSnapshot();
    }, { crossOrigin: "anonymous" });
  }, [sizeKey, saveSnapshot]);

  // ── Resize canvas ───────────────────────────────────────────────────────────
  const changeSize = useCallback((newKey: SizeKey) => {
    if (!fabricRef.current || newKey === sizeKey) { setSizeKey(newKey); return; }
    const oldSz = SIZES[sizeKey];
    const newSz = SIZES[newKey];
    const scX = newSz.dw / oldSz.dw;
    const scY = newSz.dh / oldSz.dh;

    const objs: FO[] = fabricRef.current.getObjects();
    objs.forEach(obj => {
      if (!obj.selectable) return;
      obj.set({
        left: (obj.left || 0) * scX,
        top:  (obj.top  || 0) * scY,
      });
      obj.setCoords();
    });

    // Rescale bg to cover new size
    if (bgLayerRef.current?.width) {
      const sc = Math.max(newSz.dw / (bgLayerRef.current.width || newSz.dw), newSz.dh / (bgLayerRef.current.height || newSz.dh));
      bgLayerRef.current.set({ scaleX: sc, scaleY: sc, left: 0, top: 0 });
    }
    // Resize vignette / overlay
    [vigLayerRef.current, ovLayerRef.current].forEach(l => {
      if (l) l.set({ width: newSz.dw, height: newSz.dh });
    });

    fabricRef.current.setDimensions({ width: newSz.dw, height: newSz.dh });
    fabricRef.current.renderAll();
    setSizeKey(newKey);
    saveSnapshot();
  }, [sizeKey, saveSnapshot]);

  // ── Add elements ────────────────────────────────────────────────────────────
  const addText = useCallback((big = false) => {
    if (!fabricRef.current) return;
    const sz = SIZES[sizeKey];
    const t = new window.fabric.IText(big ? "Add Heading" : "Add text here", {
      left: sz.dw * 0.1, top: sz.dh * 0.5 - (big ? 40 : 20),
      fontFamily: big ? bFonts.headline : bFonts.body,
      fontSize: big ? Math.round(sz.dh * 0.072) : Math.round(sz.dh * 0.044),
      fontWeight: big ? "bold" : "normal",
      fill: "#FFFFFF",
      shadow: new window.fabric.Shadow({ color: "rgba(0,0,0,0.4)", blur: 8, offsetX: 1, offsetY: 1 }),
    });
    fabricRef.current.add(t); fabricRef.current.setActiveObject(t); fabricRef.current.renderAll();
    saveSnapshot();
  }, [sizeKey, bFonts, saveSnapshot]);

  const addShape = useCallback((shape: "rect" | "circle" | "line") => {
    if (!fabricRef.current) return;
    const sz = SIZES[sizeKey];
    let obj: FO;
    if (shape === "rect") {
      obj = new window.fabric.Rect({ left: sz.dw * 0.3, top: sz.dh * 0.3, width: 120, height: 60, fill: bColors[0], rx: 4, ry: 4 });
    } else if (shape === "circle") {
      obj = new window.fabric.Circle({ left: sz.dw * 0.4, top: sz.dh * 0.4, radius: 50, fill: bColors[0] });
    } else {
      obj = new window.fabric.Line([sz.dw * 0.1, sz.dh * 0.5, sz.dw * 0.9, sz.dh * 0.5], {
        stroke: bColors[0], strokeWidth: 2,
      });
    }
    fabricRef.current.add(obj); fabricRef.current.setActiveObject(obj); fabricRef.current.renderAll();
    saveSnapshot();
  }, [sizeKey, bColors, saveSnapshot]);

  const deleteSelected = useCallback(() => {
    if (!fabricRef.current) return;
    const obj = fabricRef.current.getActiveObject();
    if (obj?.selectable) {
      fabricRef.current.remove(obj); fabricRef.current.renderAll(); saveSnapshot();
      setSelId(null); setFtb(f => ({ ...f, show: false }));
    }
  }, [saveSnapshot]);

  const duplicateSelected = useCallback(() => {
    if (!fabricRef.current) return;
    const obj = fabricRef.current.getActiveObject();
    if (!obj?.selectable) return;
    obj.clone((c: FO) => {
      c.set({ left: (c.left || 0) + 20, top: (c.top || 0) + 20 });
      fabricRef.current.add(c); fabricRef.current.setActiveObject(c); fabricRef.current.renderAll(); saveSnapshot();
    });
  }, [saveSnapshot]);

  const bringForward = useCallback(() => {
    if (!fabricRef.current) return;
    const obj = fabricRef.current.getActiveObject();
    if (obj?.selectable) { fabricRef.current.bringForward(obj); fabricRef.current.renderAll(); saveSnapshot(); }
  }, [saveSnapshot]);

  const sendBackward = useCallback(() => {
    if (!fabricRef.current) return;
    const obj = fabricRef.current.getActiveObject();
    if (obj?.selectable) { fabricRef.current.sendBackwards(obj); fabricRef.current.renderAll(); saveSnapshot(); }
  }, [saveSnapshot]);

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!fabricRef.current) return;
    const sz = SIZES[sizeKey];
    const mult = quality === "high" ? (sz.ew / sz.dw) * 2 : sz.ew / sz.dw;
    try {
      const url = fabricRef.current.toDataURL({ format: "png", multiplier: mult });
      const date = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url; a.download = `${slugify(ac.name)}-${sizeKey}-${date}.png`; a.click();
    } catch (e) {
      console.error("Export error:", e);
    }
  }, [sizeKey, quality, ac.name]);

  // ── Vignette toggle ─────────────────────────────────────────────────────────
  const toggleVignette = useCallback((on: boolean) => {
    setVigEnabled(on);
    if (!fabricRef.current) return;
    if (!on && vigLayerRef.current) {
      fabricRef.current.remove(vigLayerRef.current);
      vigLayerRef.current = null;
      fabricRef.current.renderAll();
      saveSnapshot();
    } else if (on && !vigLayerRef.current) {
      const sz = SIZES[sizeKey];
      addVignette(fabricRef.current, sz.dw, sz.dh);
      fabricRef.current.renderAll();
      saveSnapshot();
    }
  }, [sizeKey, addVignette, saveSnapshot]);

  // ── Zoom helpers ────────────────────────────────────────────────────────────
  const adjustZoom = useCallback((delta: number) => {
    setZoom(z => Math.min(2, Math.max(0.3, +(z + delta).toFixed(1))));
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  const sz = SIZES[sizeKey];

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{
        background: D.bg, border: `1px solid ${D.border}`,
        borderRadius: 10, overflow: "hidden",
      }}>

        {/* Subtle inline header */}
        <div style={{ padding: "10px 20px", borderBottom: `1px solid ${D.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: canvasReady ? bColors[0] : "rgba(255,255,255,0.15)", transition: "background 0.3s" }} />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: D.textDim }}>
            Image Studio
          </span>
          {canvasReady && (
            <span style={{ fontSize: 10, color: D.textDim }}>{sz.label}</span>
          )}
        </div>

        {/* Prompt area */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${D.border}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <input
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !generating && handleGenerate()}
              placeholder={`Describe an image for ${ac.name}…  e.g. "A scientist examining cellular samples in a modern lab, teal lighting"`}
              style={{
                width: "100%", background: D.panelAlt, border: `1px solid ${D.border}`,
                borderRadius: 7, padding: "10px 14px", fontSize: 13, color: D.text,
                outline: "none", fontFamily: "inherit", boxSizing: "border-box",
              }}
              onFocus={e => { e.target.style.borderColor = D.borderHi; }}
              onBlur={e =>  { e.target.style.borderColor = D.border; }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              {[`${ac.name} brand imagery`, "scientific precision", "modern lab environment", "abstract data visualization", "human impact"].map(s => (
                <button key={s} onClick={() => setPrompt(s)}
                  style={{ fontSize: 10, padding: "3px 9px", background: "transparent", border: `1px solid ${D.border}`, borderRadius: 5, color: D.textDim, cursor: "pointer", fontFamily: "inherit" }}
                >{s}</button>
              ))}
            </div>
          </div>
          <button
            onClick={handleGenerate} disabled={generating || !prompt.trim()}
            style={{
              padding: "10px 20px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600,
              letterSpacing: "0.05em", cursor: generating || !prompt.trim() ? "not-allowed" : "pointer",
              background: generating || !prompt.trim() ? "rgba(255,255,255,0.06)" : bColors[0],
              color: generating || !prompt.trim() ? D.textDim : "#fff",
              flexShrink: 0, fontFamily: "inherit", transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            {generating ? (
              <><span style={{ width: 12, height: 12, border: `1.5px solid rgba(255,255,255,0.2)`, borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} /> Generating…</>
            ) : "Generate ↗"}
          </button>
        </div>

        {/* Error banners */}
        {(imgError || txtError) && (
          <div style={{ padding: "8px 20px", background: "rgba(204,51,51,0.08)", borderBottom: `1px solid rgba(204,51,51,0.18)` }}>
            {imgError && <div style={{ fontSize: 11, color: "#E07070", marginBottom: txtError ? 2 : 0 }}>⚠ {imgError}</div>}
            {txtError && <div style={{ fontSize: 11, color: "#E0A070" }}>⚠ {txtError} (text layers will use defaults)</div>}
          </div>
        )}

        {/* Empty state — only shown before first generation */}
        {!canvasReady && !generating && (
          <div style={{ padding: 32, textAlign: "center" }}>
            <div style={{ width: 1, height: 32, background: `${bColors[0]}40`, margin: "0 auto 16px" }} />
            <p style={{ fontSize: 13, color: D.textDim, fontFamily: "var(--font-cormorant, Georgia, serif)", fontStyle: "italic" }}>
              Enter a prompt above and generate your canvas
            </p>
            {bLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bLogo} alt={ac.name} style={{ marginTop: 20, maxHeight: 40, opacity: 0.25, filter: "brightness(0) invert(1)" }} />
            )}
          </div>
        )}

        {/* Canvas section — expands smoothly once generation starts */}
        <div style={{
          maxHeight: (generating || canvasReady) ? "1600px" : "0px",
          overflow: "hidden",
          transition: "max-height 0.45s cubic-bezier(0.4,0,0.2,1)",
        }}>

          {/* Toolbar — only shown when canvas is ready */}
          {canvasReady && !generating && (
            <div style={{ padding: "10px 16px", borderBottom: `1px solid ${D.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                <DkBtn onClick={() => addText(false)}>T Text</DkBtn>
                <DkBtn onClick={() => addText(true)}>H Heading</DkBtn>
                <DkBtn onClick={() => addShape("rect")}>▭ Rect</DkBtn>
                <DkBtn onClick={() => addShape("circle")}>○ Circle</DkBtn>
                <DkBtn onClick={() => addShape("line")}>— Line</DkBtn>
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                <DkBtn onClick={undo}>↩ Undo</DkBtn>
                <DkBtn onClick={redo}>↪ Redo</DkBtn>
                <DkBtn onClick={() => adjustZoom(-0.1)}>−</DkBtn>
                <span style={{ fontSize: 10, color: D.textDim, alignSelf: "center", minWidth: 36, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
                <DkBtn onClick={() => adjustZoom(0.1)}>+</DkBtn>
                <DkBtn onClick={() => setZoom(1)}>Reset</DkBtn>
              </div>
            </div>
          )}

          {/* Canvas + right panel */}
          <div style={{ display: "flex" }}>

            {/* Canvas area — canvas element always in DOM so ref stays stable */}
            <div style={{ flex: 1, padding: 20, display: "flex", justifyContent: "center", alignItems: "flex-start", overflow: "auto", background: "#0A0A0A", minHeight: 200, position: "relative" }}>

              {/* Loading overlay */}
              {generating && (
                <div style={{
                  position: "absolute", inset: 0, zIndex: 10,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 14, background: "rgba(10,10,10,0.9)", animation: "pulse 1.8s ease-in-out infinite",
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid rgba(255,255,255,0.08)`, borderTopColor: bColors[0], animation: "spin 0.9s linear infinite" }} />
                  <span style={{ fontSize: 12, color: D.textDim, letterSpacing: "0.08em" }}>Generating image and copy…</span>
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    {[60, 100, 80].map((w, i) => (
                      <div key={i} style={{ height: 4, width: w, borderRadius: 2, background: "rgba(255,255,255,0.06)" }} />
                    ))}
                  </div>
                </div>
              )}

              <div
                ref={canvasContainerRef}
                style={{ position: "relative", transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 0.15s" }}
              >
                <canvas ref={canvasRef} style={{ borderRadius: 4, display: "block" }} />

                {/* Floating toolbar */}
                {canvasReady && ftb.show && selId && (
                  <div style={{
                    position: "absolute",
                    left: ftb.x, top: Math.max(4, ftb.y - 50),
                    transform: "translateX(-50%)",
                    background: "#1E1E1E", border: `1px solid ${D.borderHi}`,
                    borderRadius: 8, padding: "5px 8px",
                    display: "flex", gap: 4, alignItems: "center",
                    zIndex: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
                    animation: "ftbIn 0.15s ease both",
                    pointerEvents: "auto",
                  }}>
                    <input type="color" value={ep.fill} onChange={e => applyElem({ fill: e.target.value })}
                      title="Color"
                      style={{ width: 22, height: 22, border: "none", background: "none", cursor: "pointer", padding: 0, borderRadius: 3 }} />
                    {ftb.isText && (
                      <select value={ep.fontFamily} onChange={e => applyElem({ fontFamily: e.target.value })}
                        style={{ background: D.panelAlt, border: `1px solid ${D.border}`, color: D.text, fontSize: 10, borderRadius: 4, padding: "2px 4px", cursor: "pointer" }}>
                        {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    )}
                    {ftb.isText && (
                      <input type="number" value={ep.fontSize} min={8} max={200}
                        onChange={e => applyElem({ fontSize: Number(e.target.value) })}
                        style={{ width: 38, background: D.panelAlt, border: `1px solid ${D.border}`, color: D.text, fontSize: 10, borderRadius: 4, padding: "2px 4px", textAlign: "center" }} />
                    )}
                    {ftb.isText && (
                      <DkBtn active={ep.fontWeight === "bold"} onClick={() => applyElem({ fontWeight: ep.fontWeight === "bold" ? "normal" : "bold" })} style={{ padding: "3px 8px", fontWeight: "bold", fontSize: 12 }}>B</DkBtn>
                    )}
                    {ftb.isText && (
                      <DkBtn active={ep.fontStyle === "italic"} onClick={() => applyElem({ fontStyle: ep.fontStyle === "italic" ? "normal" : "italic" })} style={{ padding: "3px 8px", fontStyle: "italic", fontSize: 12 }}>I</DkBtn>
                    )}
                    <div style={{ width: 1, height: 18, background: D.border }} />
                    <DkBtn onClick={deleteSelected} style={{ color: "#E07070", borderColor: "rgba(224,112,112,0.2)", fontSize: 13, padding: "2px 6px" }}>✕</DkBtn>
                  </div>
                )}
              </div>
            </div>

            {/* Right panel — only shown when canvas is ready */}
            {canvasReady && !generating && (
              <div style={{ width: 272, borderLeft: `1px solid ${D.border}`, background: D.panel, flexShrink: 0, display: "flex", flexDirection: "column" }}>

                {/* Tab headers */}
                <div style={{ display: "flex", borderBottom: `1px solid ${D.border}` }}>
                  {(["element","background","export"] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveRightTab(tab)}
                      style={{
                        flex: 1, padding: "10px 4px", fontSize: 9, fontWeight: 600,
                        letterSpacing: "0.10em", textTransform: "uppercase",
                        background: "transparent", border: "none",
                        borderBottom: activeRightTab === tab ? `2px solid ${bColors[0]}` : "2px solid transparent",
                        color: activeRightTab === tab ? D.text : D.textDim,
                        cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                      }}
                    >{tab}</button>
                  ))}
                </div>

                {/* Tab content */}
                <div style={{ flex: 1, overflowY: "auto" }}>

                  {/* ── ELEMENT tab ─────────────────────────────── */}
                  {activeRightTab === "element" && (
                    <div>
                      {!selId ? (
                        <div style={{ padding: 24, textAlign: "center", color: D.textDim, fontSize: 12 }}>
                          Select an element on the canvas to edit it.
                        </div>
                      ) : (
                        <>
                          <DkSection>
                            <DkLabel>Font</DkLabel>
                            <select value={ep.fontFamily} onChange={e => applyElem({ fontFamily: e.target.value })}
                              style={{ width: "100%", background: D.panelAlt, border: `1px solid ${D.border}`, color: D.text, fontSize: 12, borderRadius: 5, padding: "6px 8px", fontFamily: "inherit" }}>
                              {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                          </DkSection>

                          <DkSection>
                            <DkSlider label="Size" value={ep.fontSize} min={8} max={200} onChange={v => applyElem({ fontSize: v })} unit="px" />
                          </DkSection>

                          <DkSection>
                            <DkLabel>Color</DkLabel>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                              {[...bColors, "#FFFFFF", "#000000"].map(c => (
                                <button key={c} onClick={() => applyElem({ fill: c })}
                                  style={{ width: 22, height: 22, borderRadius: 4, background: c, border: ep.fill === c ? `2px solid ${D.text}` : `1px solid ${D.border}`, cursor: "pointer", flexShrink: 0 }} />
                              ))}
                            </div>
                            <input type="color" value={ep.fill} onChange={e => applyElem({ fill: e.target.value })}
                              style={{ width: "100%", height: 28, border: `1px solid ${D.border}`, borderRadius: 5, background: D.panelAlt, cursor: "pointer", padding: 2 }} />
                          </DkSection>

                          <DkSection>
                            <DkLabel>Style</DkLabel>
                            <div style={{ display: "flex", gap: 6 }}>
                              <DkBtn active={ep.fontWeight === "bold"} onClick={() => applyElem({ fontWeight: ep.fontWeight === "bold" ? "normal" : "bold" })} style={{ flex: 1, fontWeight: "bold" }}>B Bold</DkBtn>
                              <DkBtn active={ep.fontStyle === "italic"} onClick={() => applyElem({ fontStyle: ep.fontStyle === "italic" ? "normal" : "italic" })} style={{ flex: 1, fontStyle: "italic" }}>I Italic</DkBtn>
                            </div>
                          </DkSection>

                          <DkSection>
                            <DkLabel>Alignment</DkLabel>
                            <div style={{ display: "flex", gap: 4 }}>
                              {(["left","center","right"] as const).map(a => (
                                <DkBtn key={a} active={ep.textAlign === a} onClick={() => applyElem({ textAlign: a })} style={{ flex: 1 }}>{a === "left" ? "⬅" : a === "center" ? "↔" : "➡"}</DkBtn>
                              ))}
                            </div>
                          </DkSection>

                          <DkSection>
                            <DkSlider label="Opacity" value={ep.opacity} min={0} max={100} onChange={v => applyElem({ opacity: v })} unit="%" />
                          </DkSection>

                          <DkSection>
                            <DkSlider label="Letter spacing" value={ep.charSpacing} min={-100} max={800} step={10} onChange={v => applyElem({ charSpacing: v })} />
                          </DkSection>

                          <DkSection>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 10, color: D.textDim, letterSpacing: "0.08em", textTransform: "uppercase" }}>Text shadow</span>
                              <button onClick={() => applyElem({ shadow: !ep.shadow })}
                                style={{ width: 32, height: 18, borderRadius: 9, background: ep.shadow ? bColors[0] : D.panelAlt, border: `1px solid ${ep.shadow ? bColors[0] + "80" : D.border}`, cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: ep.shadow ? 16 : 2, transition: "left 0.2s" }} />
                              </button>
                            </div>
                          </DkSection>

                          <DkSection>
                            <DkLabel>Layer</DkLabel>
                            <div style={{ display: "flex", gap: 5 }}>
                              <DkBtn onClick={bringForward} style={{ flex: 1 }}>↑ Forward</DkBtn>
                              <DkBtn onClick={sendBackward} style={{ flex: 1 }}>↓ Back</DkBtn>
                            </div>
                          </DkSection>

                          <DkSection>
                            <div style={{ display: "flex", gap: 5 }}>
                              <DkBtn onClick={duplicateSelected} style={{ flex: 1 }}>⧉ Duplicate</DkBtn>
                              <DkBtn onClick={deleteSelected} style={{ flex: 1, color: "#E07070", borderColor: "rgba(224,112,112,0.18)" }}>✕ Delete</DkBtn>
                            </div>
                          </DkSection>
                        </>
                      )}
                    </div>
                  )}

                  {/* ── BACKGROUND tab ──────────────────────────── */}
                  {activeRightTab === "background" && (
                    <div>
                      <DkSection>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                          {(["regen","overlay","solid","replace"] as const).map(m => (
                            <DkBtn key={m} active={bgMode === m} accent={bColors[0]} onClick={() => setBgMode(m)} style={{ justifyContent: "flex-start", padding: "7px 10px" }}>
                              {m === "regen" ? "↺ Regenerate" : m === "overlay" ? "⬚ Overlay" : m === "solid" ? "■ Solid" : "⇅ Replace"}
                            </DkBtn>
                          ))}
                        </div>
                      </DkSection>

                      <DkSection>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 10, color: D.textDim, letterSpacing: "0.08em", textTransform: "uppercase" }}>Vignette</span>
                          <button onClick={() => toggleVignette(!vigEnabled)}
                            style={{ width: 32, height: 18, borderRadius: 9, background: vigEnabled ? bColors[0] : D.panelAlt, border: `1px solid ${vigEnabled ? bColors[0] + "80" : D.border}`, cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: vigEnabled ? 16 : 2, transition: "left 0.2s" }} />
                          </button>
                        </div>
                      </DkSection>

                      {bgMode === "regen" && (
                        <DkSection>
                          <DkLabel>Prompt</DkLabel>
                          <textarea
                            value={regenPrompt}
                            onChange={e => setRegenPrompt(e.target.value)}
                            rows={3}
                            style={{ width: "100%", background: D.panelAlt, border: `1px solid ${D.border}`, color: D.text, fontSize: 11, borderRadius: 5, padding: "8px 10px", resize: "vertical", fontFamily: "inherit", lineHeight: 1.55, boxSizing: "border-box" }}
                          />
                          <DkBtn onClick={handleRegen} disabled={regenLoading || !regenPrompt.trim()}
                            style={{ width: "100%", justifyContent: "center", marginTop: 8, background: regenLoading ? "transparent" : `${bColors[0]}22`, borderColor: `${bColors[0]}55`, color: bColors[0] }}>
                            {regenLoading ? "Generating…" : "↺ Regenerate background"}
                          </DkBtn>
                        </DkSection>
                      )}

                      {bgMode === "overlay" && (
                        <DkSection>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <DkLabel>Color overlay</DkLabel>
                            <button onClick={() => { const next = !ovEnabled; setOvEnabled(next); applyOverlay(ovColor, ovOpacity, next); }}
                              style={{ width: 32, height: 18, borderRadius: 9, background: ovEnabled ? bColors[0] : D.panelAlt, border: `1px solid ${ovEnabled ? bColors[0] + "80" : D.border}`, cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: ovEnabled ? 16 : 2, transition: "left 0.2s" }} />
                            </button>
                          </div>
                          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                            {[...bColors, "#000000", "#FFFFFF"].map(c => (
                              <button key={c} onClick={() => { setOvColor(c); if (ovEnabled) applyOverlay(c, ovOpacity, true); }}
                                style={{ width: 22, height: 22, borderRadius: 4, background: c, border: ovColor === c ? `2px solid ${D.text}` : `1px solid ${D.border}`, cursor: "pointer" }} />
                            ))}
                          </div>
                          <input type="color" value={ovColor} onChange={e => { setOvColor(e.target.value); if (ovEnabled) applyOverlay(e.target.value, ovOpacity, true); }}
                            style={{ width: "100%", height: 28, border: `1px solid ${D.border}`, borderRadius: 5, background: D.panelAlt, cursor: "pointer", padding: 2, marginBottom: 10 }} />
                          <DkSlider label="Opacity" value={ovOpacity} min={0} max={80} onChange={v => { setOvOpacity(v); if (ovEnabled) applyOverlay(ovColor, v, true); }} unit="%" />
                        </DkSection>
                      )}

                      {bgMode === "solid" && (
                        <DkSection>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                            <DkBtn active={!gradEnabled} onClick={() => setGradEnabled(false)} style={{ flex: 1 }}>Solid</DkBtn>
                            <DkBtn active={gradEnabled}  onClick={() => setGradEnabled(true)}  style={{ flex: 1, marginLeft: 5 }}>Gradient</DkBtn>
                          </div>
                          {!gradEnabled ? (
                            <>
                              <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                                {[...bColors, "#000000", "#FFFFFF"].map(c => (
                                  <button key={c} onClick={() => { setBgSolidColor(c); applySolidBg(c); setBgSolidEnabled(true); }}
                                    style={{ width: 22, height: 22, borderRadius: 4, background: c, border: bgSolidColor === c && bgSolidEnabled ? `2px solid ${D.text}` : `1px solid ${D.border}`, cursor: "pointer" }} />
                                ))}
                              </div>
                              <input type="color" value={bgSolidColor}
                                onChange={e => { setBgSolidColor(e.target.value); applySolidBg(e.target.value); setBgSolidEnabled(true); }}
                                style={{ width: "100%", height: 28, border: `1px solid ${D.border}`, borderRadius: 5, background: D.panelAlt, cursor: "pointer", padding: 2 }} />
                            </>
                          ) : (
                            <>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                                <div>
                                  <DkLabel>Color 1</DkLabel>
                                  <input type="color" value={grad.c1}
                                    onChange={e => { const g = { ...grad, c1: e.target.value }; setGrad(g); applyGradientBg(g.c1, g.c2, g.dir); }}
                                    style={{ width: "100%", height: 28, border: `1px solid ${D.border}`, borderRadius: 5, background: D.panelAlt, cursor: "pointer", padding: 2 }} />
                                </div>
                                <div>
                                  <DkLabel>Color 2</DkLabel>
                                  <input type="color" value={grad.c2}
                                    onChange={e => { const g = { ...grad, c2: e.target.value }; setGrad(g); applyGradientBg(g.c1, g.c2, g.dir); }}
                                    style={{ width: "100%", height: 28, border: `1px solid ${D.border}`, borderRadius: 5, background: D.panelAlt, cursor: "pointer", padding: 2 }} />
                                </div>
                              </div>
                              <DkLabel>Direction</DkLabel>
                              <div style={{ display: "flex", gap: 5 }}>
                                {(["vertical","horizontal","diagonal"] as const).map(d => (
                                  <DkBtn key={d} active={grad.dir === d} onClick={() => { const g = { ...grad, dir: d }; setGrad(g); applyGradientBg(g.c1, g.c2, g.dir); }} style={{ flex: 1, fontSize: 9 }}>
                                    {d === "vertical" ? "↕" : d === "horizontal" ? "↔" : "↗"} {d.slice(0,4)}
                                  </DkBtn>
                                ))}
                              </div>
                            </>
                          )}
                        </DkSection>
                      )}

                      {bgMode === "replace" && (
                        <DkSection style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <label style={{ cursor: "pointer" }}>
                            <input type="file" accept="image/*" style={{ display: "none" }}
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (!file || !fabricRef.current) return;
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  const dataUrl = ev.target?.result as string;
                                  const sz = SIZES[sizeKey];
                                  window.fabric.Image.fromURL(dataUrl, (img: FO) => {
                                    if (!img || !bgLayerRef.current) return;
                                    const sc = Math.max(sz.dw / (img.width || sz.dw), sz.dh / (img.height || sz.dh));
                                    bgLayerRef.current.set({ _element: img._element, scaleX: sc, scaleY: sc, left: (sz.dw - (img.width || sz.dw) * sc) / 2, top: (sz.dh - (img.height || sz.dh) * sc) / 2, fill: undefined });
                                    fabricRef.current.renderAll();
                                    saveSnapshot();
                                  });
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                            <div style={{ border: `1px dashed ${D.border}`, borderRadius: 6, padding: "12px 16px", textAlign: "center", cursor: "pointer", fontSize: 11, color: D.textDim, transition: "border-color 0.15s" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = D.borderHi; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = D.border; }}
                            >
                              ↑ Upload your own image
                            </div>
                          </label>
                          {originalImageUrl.current && (
                            <DkBtn onClick={restoreOriginalBg} style={{ width: "100%", justifyContent: "center" }}>
                              ↺ Restore AI-generated image
                            </DkBtn>
                          )}
                        </DkSection>
                      )}
                    </div>
                  )}

                  {/* ── EXPORT tab ───────────────────────────────── */}
                  {activeRightTab === "export" && (
                    <div>
                      <DkSection>
                        <DkLabel>Canvas size</DkLabel>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {(Object.keys(SIZES) as SizeKey[]).map(k => {
                            const s = SIZES[k];
                            return (
                              <button key={k} onClick={() => changeSize(k)}
                                style={{
                                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                                  background: sizeKey === k ? `${bColors[0]}18` : D.panelAlt,
                                  border: `1px solid ${sizeKey === k ? bColors[0] + "66" : D.border}`,
                                  borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                                }}>
                                <span style={{ fontSize: 18, opacity: 0.7 }}>{s.icon}</span>
                                <div style={{ textAlign: "left" }}>
                                  <div style={{ fontSize: 11, color: sizeKey === k ? D.text : D.textMid, fontWeight: sizeKey === k ? 600 : 400 }}>{s.label}</div>
                                  <div style={{ fontSize: 9, color: D.textDim, marginTop: 1 }}>{s.ew} × {s.eh}px</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </DkSection>

                      <DkSection>
                        <DkLabel>Quality</DkLabel>
                        <div style={{ display: "flex", gap: 5 }}>
                          <DkBtn active={quality === "standard"} onClick={() => setQuality("standard")} style={{ flex: 1 }}>Standard</DkBtn>
                          <DkBtn active={quality === "high"}     onClick={() => setQuality("high")}     style={{ flex: 1 }}>High (2×)</DkBtn>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 9, color: D.textDim }}>
                          {quality === "high" ? `Export: ${sz.ew * 2}×${sz.eh * 2}px` : `Export: ${sz.ew}×${sz.eh}px`}
                        </div>
                      </DkSection>

                      <DkSection>
                        <button onClick={handleExport}
                          style={{
                            width: "100%", padding: "12px 16px", borderRadius: 7, border: "none",
                            background: bColors[0], color: "#fff",
                            fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", cursor: "pointer",
                            fontFamily: "inherit", transition: "opacity 0.15s",
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                        >
                          ↓ Download PNG
                        </button>
                        <div style={{ marginTop: 6, fontSize: 9, color: D.textDim, textAlign: "center" }}>
                          {slugify(ac.name)}-{sizeKey}-{new Date().toISOString().slice(0, 10)}.png
                        </div>
                      </DkSection>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity:.7 } 50% { opacity:.4 } }
        @keyframes spin   { to { transform: rotate(360deg) } }
        @keyframes ftbIn { from { opacity:0; transform:translateX(-50%) translateY(4px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }
      `}</style>
    </div>
  );
}
