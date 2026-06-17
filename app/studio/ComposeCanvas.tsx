"use client";
import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import type { Company } from "@/lib/companies";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { _ccFabricLoaded?: boolean } }
type FO = any;
type FC = any;

const T3 = "rgba(26,26,26,0.35)";
const T2 = "rgba(26,26,26,0.55)";

const LOGO_FILES: Record<string, string> = {
  cpolar:   "/files/cpolar_logo_final.png",
  oxia:     "/files/oxia_logo_final.png",
  coregen:  "/files/coregen_logo_final.png",
  intrepro: "/files/klimloc_logo_final.png",
  senvi:    "/files/senvi_logo_final.png",
};

export interface ComposeCanvasHandle {
  applyPreset: (preset: string) => void;
  downloadCanvas: () => void;
  getCanvasDataURL: () => string | null;
  getCanvasJSON: () => string | null;
}

type TextElement = {
  text: string;
  approximate_position: "top" | "top-left" | "top-right" | "center" | "bottom" | "bottom-left" | "bottom-right";
  size: "large" | "medium" | "small";
  style: "bold" | "regular" | "italic" | "light";
  color: string;
};

function posFromApprox(pos: string, size: number): { x: number; y: number; originX: "left" | "center" | "right" } {
  const topY = Math.round(size * 0.055);
  const midY = Math.round(size * 0.5);
  const botY = Math.round(size * 0.926);
  const leftX = Math.round(size * 0.055);
  const midX  = Math.round(size * 0.5);
  const rightX = Math.round(size * 0.944);
  const map: Record<string, { x: number; y: number; originX: "left" | "center" | "right" }> = {
    "top":          { x: midX,   y: topY, originX: "center" },
    "top-left":     { x: leftX,  y: topY, originX: "left"   },
    "top-right":    { x: rightX, y: topY, originX: "right"  },
    "center":       { x: midX,   y: midY, originX: "center" },
    "bottom":       { x: midX,   y: botY, originX: "center" },
    "bottom-left":  { x: leftX,  y: botY, originX: "left"   },
    "bottom-right": { x: rightX, y: botY, originX: "right"  },
  };
  return map[pos] ?? { x: midX, y: midY, originX: "center" };
}

const ComposeCanvas = forwardRef<ComposeCanvasHandle, {
  imgUrl: string;
  imgProvider: string;
  imgPrompt: string;
  ac: Company;
  notify: (m: string, t?: "default" | "success" | "error") => void;
}>(function ComposeCanvas({ imgUrl, imgProvider, imgPrompt, ac, notify }, ref) {

  const canvasElRef   = useRef<HTMLCanvasElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const fabricRef     = useRef<FC>(null);
  const bgLayerRef    = useRef<FO>(null);
  const tintLayerRef  = useRef<FO>(null);
  const undoStack     = useRef<string[]>([]);
  const redoStack     = useRef<string[]>([]);
  const isHistoric    = useRef(false);
  const fabricReady   = useRef(false);

  const [canvasSize, setCanvasSize] = useState(0);
  const [selId,  setSelId]  = useState<string | null>(null);
  const [ftb,    setFtb]    = useState({ show: false, x: 0, y: 0 });
  const [ep,     setEp]     = useState({ opacity: 100, fill: "#FFFFFF" });
  const [bgPanel,       setBgPanel]       = useState<"none" | "tint" | "replace">("none");
  const [tintColor,     setTintColor]     = useState("#000000");
  const [tintOpacity,   setTintOpacity]   = useState(30);
  const [tintEnabled,   setTintEnabled]   = useState(false);
  const [replacedBg,    setReplacedBg]    = useState(false);
  const [separating,    setSeparating]    = useState(false);
  const [layersDone,    setLayersDone]    = useState(false);
  const [noTextMsg,     setNoTextMsg]     = useState("");

  const br      = (ac.brand || {}) as Record<string, unknown>;
  const bColors = [
    (br.accent_color || ac.color || "#2BBFB0") as string,
    (br.dark_color   || "#111111") as string,
    (br.light_color  || "#F5F2EE") as string,
  ];
  const bFont    = (br.headline_font || "DM Sans") as string;
  const logoSrc  = LOGO_FILES[ac.id] || (ac.logo_file as string | null) || null;
  const invertLogo = !!(ac.brand as Record<string, unknown> | undefined)?.invert_logo;

  // ── Fabric loader ────────────────────────────────────────────────────────────
  const ensureFabric = useCallback((): Promise<void> => new Promise(resolve => {
    if ((window as any).fabric) { resolve(); return; }
    if (fabricReady.current) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js";
    s.onload = () => { fabricReady.current = true; resolve(); };
    document.head.appendChild(s);
  }), []);

  // ── Snapshot ─────────────────────────────────────────────────────────────────
  const saveSnapshot = useCallback(() => {
    if (isHistoric.current || !fabricRef.current) return;
    const json = JSON.stringify(fabricRef.current.toJSON(["isBg", "isTint", "isLogo"]));
    undoStack.current = [...undoStack.current.slice(-29), json];
    redoStack.current = [];
  }, []);

  const applySnapshot = useCallback((json: string) => {
    if (!fabricRef.current) return;
    isHistoric.current = true;
    fabricRef.current.loadFromJSON(json, () => {
      fabricRef.current.renderAll();
      const objs = fabricRef.current.getObjects();
      bgLayerRef.current   = objs.find((o: FO) => o.isBg)   ?? null;
      tintLayerRef.current = objs.find((o: FO) => o.isTint) ?? null;
      isHistoric.current = false;
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

  // ── Floating toolbar sync ─────────────────────────────────────────────────────
  const syncFtb = useCallback((obj: FO | null) => {
    if (!obj || !fabricRef.current) { setFtb(f => ({ ...f, show: false })); return; }
    try {
      const bb = obj.getBoundingRect(true, true);
      setFtb({ show: true, x: bb.left + bb.width / 2, y: bb.top });
    } catch {}
  }, []);

  // ── Tint helper ───────────────────────────────────────────────────────────────
  const applyTint = useCallback((color: string, opacity: number, enabled: boolean) => {
    if (!fabricRef.current || !canvasSize) return;
    try {
      if (tintLayerRef.current) {
        fabricRef.current.remove(tintLayerRef.current);
        tintLayerRef.current = null;
      }
      if (!enabled) { fabricRef.current.renderAll(); return; }
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      const rect = new (window as any).fabric.Rect({
        left: 0, top: 0, width: canvasSize, height: canvasSize,
        fill: `rgba(${r},${g},${b},${opacity / 100})`,
        selectable: false, evented: false, isTint: true,
      });
      fabricRef.current.add(rect);
      // Position just above bg layer
      const objs: FO[] = fabricRef.current.getObjects();
      const bgIdx = objs.indexOf(bgLayerRef.current);
      const tintIdx = objs.indexOf(rect);
      for (let i = tintIdx; i > bgIdx + 1; i--) {
        fabricRef.current.sendBackwards(rect, true);
      }
      tintLayerRef.current = rect;
      fabricRef.current.renderAll();
    } catch (err) { console.error("[ComposeCanvas] applyTint:", err); }
  }, [canvasSize]);

  // ── Delete / apply helpers ────────────────────────────────────────────────────
  const deleteSelected = useCallback(() => {
    if (!fabricRef.current) return;
    const obj = fabricRef.current.getActiveObject();
    if (!obj || obj.isBg || obj.isTint) return;
    fabricRef.current.remove(obj);
    fabricRef.current.discardActiveObject();
    fabricRef.current.renderAll();
    saveSnapshot();
    setSelId(null);
    setFtb(f => ({ ...f, show: false }));
  }, [saveSnapshot]);

  const bringForward = useCallback(() => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj || obj.isBg || obj.isTint) return;
    fabricRef.current.bringForward(obj);
    fabricRef.current.renderAll();
    saveSnapshot();
  }, [saveSnapshot]);

  const sendBackward = useCallback(() => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj || obj.isBg || obj.isTint) return;
    fabricRef.current.sendBackwards(obj);
    fabricRef.current.renderAll();
    saveSnapshot();
  }, [saveSnapshot]);

  const applyElem = useCallback((patch: { opacity?: number; fill?: string }) => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj || obj.isBg || obj.isTint) return;
    const next = { ...ep, ...patch };
    setEp(next);
    if ("opacity" in patch) obj.set({ opacity: (patch.opacity ?? 100) / 100 });
    if ("fill"    in patch) obj.set({ fill: patch.fill });
    fabricRef.current.renderAll();
    saveSnapshot();
  }, [ep, saveSnapshot]);

  // ── Add elements ───────────────────────────────────────────────────────────────
  const addText = useCallback(() => {
    if (!fabricRef.current || !canvasSize) return;
    try {
      const t = new (window as any).fabric.IText("Add text here", {
        left: canvasSize / 2, top: canvasSize / 2,
        originX: "center", originY: "center",
        fontFamily: bFont, fontSize: Math.round(canvasSize * 0.065),
        fill: bColors[0], fontWeight: "400",
      });
      fabricRef.current.add(t);
      fabricRef.current.setActiveObject(t);
      fabricRef.current.renderAll();
      saveSnapshot();
    } catch {}
  }, [canvasSize, bFont, bColors, saveSnapshot]);

  const addRect = useCallback(() => {
    if (!fabricRef.current || !canvasSize) return;
    try {
      const r = new (window as any).fabric.Rect({
        left: canvasSize * 0.2, top: canvasSize * 0.2,
        width: canvasSize * 0.35, height: canvasSize * 0.2,
        fill: bColors[0], opacity: 0.85,
      });
      fabricRef.current.add(r);
      fabricRef.current.setActiveObject(r);
      fabricRef.current.renderAll();
      saveSnapshot();
    } catch {}
  }, [canvasSize, bColors, saveSnapshot]);

  const addCircle = useCallback(() => {
    if (!fabricRef.current || !canvasSize) return;
    try {
      const c = new (window as any).fabric.Circle({
        left: canvasSize * 0.3, top: canvasSize * 0.3,
        radius: canvasSize * 0.1, fill: bColors[0], opacity: 0.85,
      });
      fabricRef.current.add(c);
      fabricRef.current.setActiveObject(c);
      fabricRef.current.renderAll();
      saveSnapshot();
    } catch {}
  }, [canvasSize, bColors, saveSnapshot]);

  const addLogo = useCallback(() => {
    if (!fabricRef.current || !canvasSize || !logoSrc) return;
    try {
      (window as any).fabric.Image.fromURL(logoSrc, (img: FO) => {
        if (!img || !fabricRef.current) return;
        const targetW = Math.round(canvasSize * 0.15);
        const sc = targetW / (img.width || targetW);
        img.set({
          left: 16, top: canvasSize - (img.height || 40) * sc - 16,
          scaleX: sc, scaleY: sc, isLogo: true,
          ...(invertLogo ? { filters: [(window as any).fabric.Image.filters ? new (window as any).fabric.Image.filters.Invert() : {}] } : {}),
        });
        if (invertLogo) { try { img.applyFilters(); } catch {} }
        fabricRef.current.add(img);
        fabricRef.current.setActiveObject(img);
        fabricRef.current.renderAll();
        saveSnapshot();
      }, { crossOrigin: "anonymous" });
    } catch {}
  }, [canvasSize, logoSrc, invertLogo, saveSnapshot]);

  // ── Canvas init ───────────────────────────────────────────────────────────────
  const initCanvas = useCallback(async (url: string, size: number) => {
    try {
      await ensureFabric();
      if (!canvasElRef.current) return;

      if (fabricRef.current) { try { fabricRef.current.dispose(); } catch {} fabricRef.current = null; }
      bgLayerRef.current   = null;
      tintLayerRef.current = null;
      undoStack.current    = [];
      redoStack.current    = [];

      const canvas: FC = new (window as any).fabric.Canvas(canvasElRef.current, {
        width: size, height: size,
        backgroundColor: "#0A0A0A",
        preserveObjectStacking: true,
      });
      fabricRef.current = canvas;

      // Background image via proxy
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      await new Promise<void>(res => {
        (window as any).fabric.Image.fromURL(proxyUrl, (img: FO) => {
          if (!img) { res(); return; }
          const sc = Math.max(size / (img.width || size), size / (img.height || size));
          img.set({
            left: (size - (img.width || size) * sc) / 2,
            top:  (size - (img.height || size) * sc) / 2,
            scaleX: sc, scaleY: sc,
            selectable: false, evented: false, isBg: true,
          });
          canvas.add(img);
          bgLayerRef.current = img;
          canvas.renderAll();
          res();
        }, { crossOrigin: "anonymous" });
      });

      // Logo
      if (logoSrc) {
        await new Promise<void>(res => {
          (window as any).fabric.Image.fromURL(logoSrc, (img: FO) => {
            if (!img) { res(); return; }
            const targetW = Math.round(size * 0.15);
            const sc = targetW / (img.width || targetW);
            img.set({
              left: 16, top: size - (img.height || 40) * sc - 16,
              scaleX: sc, scaleY: sc, isLogo: true,
              ...(invertLogo ? { filters: [(window as any).fabric.Image.filters ? new (window as any).fabric.Image.filters.Invert() : {}] } : {}),
            });
            if (invertLogo) { try { img.applyFilters(); } catch {} }
            canvas.add(img);
            canvas.renderAll();
            res();
          }, { crossOrigin: "anonymous" });
        });
      }

      // Events
      const onSelect = (e: FO) => {
        const obj: FO = e.selected?.[0] ?? null;
        if (!obj || obj.isBg || obj.isTint) { setSelId(null); setFtb(f => ({ ...f, show: false })); return; }
        const uid = obj.__uid || (obj.__uid = String(Math.random()));
        setSelId(uid);
        setEp({ opacity: Math.round((obj.opacity ?? 1) * 100), fill: typeof obj.fill === "string" ? obj.fill : "#FFFFFF" });
        syncFtb(obj);
      };
      canvas.on("selection:created", onSelect);
      canvas.on("selection:updated", onSelect);
      canvas.on("selection:cleared", () => { setSelId(null); setFtb(f => ({ ...f, show: false })); });
      canvas.on("object:modified", () => saveSnapshot());
      canvas.on("object:moving",   (e: FO) => syncFtb(e.target));

      saveSnapshot();
    } catch (err) { console.error("[ComposeCanvas] initCanvas:", err); }
  }, [ensureFabric, logoSrc, invertLogo, syncFtb, saveSnapshot]);

  // ── Separate Layers ───────────────────────────────────────────────────────────
  const handleSeparateLayers = useCallback(async () => {
    if (!fabricRef.current || !imgUrl || !canvasSize || separating) return;
    setSeparating(true);
    setNoTextMsg("");

    const cleanPrompt = (imgPrompt
      ? `${imgPrompt} No text, no typography, no words, no letters, completely clean background, text-free`
      : "Ultra high quality commercial photography, no text, no typography, no words, no letters, completely clean background, text-free"
    ).trim();

    const [textResult, bgResult] = await Promise.allSettled([
      fetch("/api/extract-image-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: imgUrl }),
      }).then(r => r.json()),
      fetch("/api/image-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawPrompt: cleanPrompt }),
      }).then(r => r.json()),
    ]);

    // Replace background if we got a clean image
    if (bgResult.status === "fulfilled" && bgResult.value?.imageUrl) {
      try {
        const newUrl = bgResult.value.imageUrl as string;
        const sz = canvasSize;
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(newUrl)}`;
        await new Promise<void>(res => {
          (window as any).fabric.Image.fromURL(proxyUrl, (img: FO) => {
            if (!img || !bgLayerRef.current || !fabricRef.current) { res(); return; }
            const sc = Math.max(sz / (img.width || sz), sz / (img.height || sz));
            bgLayerRef.current.set({
              _element: img._element,
              scaleX: sc, scaleY: sc,
              left: (sz - (img.width || sz) * sc) / 2,
              top:  (sz - (img.height || sz) * sc) / 2,
            });
            fabricRef.current.renderAll();
            res();
          }, { crossOrigin: "anonymous" });
        });
      } catch (err) {
        console.error("[ComposeCanvas] bg replace failed:", err);
      }
    }

    // Apply text layers
    if (textResult.status === "fulfilled" && Array.isArray(textResult.value)) {
      const elements = textResult.value as TextElement[];
      if (elements.length === 0) {
        setNoTextMsg("No text detected in image");
        setTimeout(() => setNoTextMsg(""), 3000);
      } else {
        try {
          for (const el of elements) {
            const { x, y, originX } = posFromApprox(el.approximate_position, canvasSize);
            const basePx = el.size === "large" ? 64 : el.size === "medium" ? 32 : 18;
            const fontSize = Math.max(8, Math.round(basePx * (canvasSize / 1080)));
            // Playfair Display for light/italic styles (editorial), DM Sans for everything else
            const fontFamily = (el.style === "italic" || el.style === "light") ? "Playfair Display" : "DM Sans";
            const t = new (window as any).fabric.IText(el.text, {
              left: x, top: y, originX,
              fontFamily,
              fontSize,
              fontWeight: el.style === "bold" ? "700" : "normal",
              fontStyle:  el.style === "italic" ? "italic" : "normal",
              fill: /^#[0-9a-fA-F]{3,8}$/.test(el.color) ? el.color : bColors[0],
            });
            fabricRef.current!.add(t);
          }
          fabricRef.current!.renderAll();
          saveSnapshot();
        } catch (err) {
          console.error("[ComposeCanvas] text layer placement failed:", err);
        }
      }
    }

    setSeparating(false);
    setLayersDone(true);
  }, [imgUrl, imgPrompt, canvasSize, bColors, separating, saveSnapshot]);

  // ── Download ─────────────────────────────────────────────────────────────────
  const downloadCanvas = useCallback(() => {
    if (!fabricRef.current || !canvasSize) return;
    try {
      const multiplier = 1080 / canvasSize;
      const dataUrl = fabricRef.current.toDataURL({ format: "png", multiplier });
      const a = document.createElement("a");
      a.href = dataUrl;
      const today = new Date().toISOString().slice(0, 10);
      a.download = `${ac.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-post-${today}.png`;
      a.click();
    } catch (err) {
      console.error("[ComposeCanvas] export:", err);
      notify("Export failed", "error");
    }
  }, [canvasSize, ac.name, notify]);

  // ── Imperative handle ─────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    applyPreset: (preset: string) => {
      if (!fabricRef.current) return;
      try {
        const objs: FO[] = fabricRef.current.getObjects().filter((o: FO) => !o.isBg && !o.isTint);
        if (preset === "Make it more minimal") {
          objs.filter((o: FO) => o.type === "i-text" || o.type === "text").forEach((o: FO) => fabricRef.current.remove(o));
          fabricRef.current.renderAll();
          saveSnapshot();
        } else if (preset === "Bolder typography") {
          objs.filter((o: FO) => o.type === "i-text" || o.type === "text").forEach((o: FO) => {
            o.set({ fontSize: Math.round((o.fontSize || 20) * 1.2), fontWeight: "400" });
          });
          fabricRef.current.renderAll();
          saveSnapshot();
        } else if (preset === "Add more contrast") {
          setTintColor("#000000"); setTintOpacity(30); setTintEnabled(true);
          applyTint("#000000", 30, true);
        } else if (preset === "More whitespace") {
          const cx = canvasSize / 2, cy = canvasSize / 2;
          objs.forEach((o: FO) => {
            o.set({
              left:   cx + ((o.left   || 0) - cx) * 0.9,
              top:    cy + ((o.top    || 0) - cy) * 0.9,
              scaleX: (o.scaleX || 1) * 0.9,
              scaleY: (o.scaleY || 1) * 0.9,
            });
          });
          fabricRef.current.renderAll();
          saveSnapshot();
        }
      } catch (err) { console.error("[ComposeCanvas] applyPreset:", err); }
    },
    downloadCanvas,
    getCanvasDataURL: () => {
      if (!fabricRef.current || !canvasSize) return null;
      try {
        const multiplier = 1080 / canvasSize;
        return fabricRef.current.toDataURL({ format: "jpeg", quality: 0.88, multiplier });
      } catch { return null; }
    },
    getCanvasJSON: () => {
      if (!fabricRef.current) return null;
      try {
        return JSON.stringify(fabricRef.current.toJSON(["isBg", "isTint", "isLogo"]));
      } catch { return null; }
    },
  }), [applyTint, canvasSize, downloadCanvas, saveSnapshot]);

  // ── Measure container (once on mount) ────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.getBoundingClientRect().width;
    if (w > 0) setCanvasSize(Math.round(w));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initialize canvas when imgUrl + canvasSize are both ready ────────────────
  useEffect(() => {
    if (!imgUrl || !canvasSize) return;
    setTintEnabled(false);
    setReplacedBg(false);
    setBgPanel("none");
    setSelId(null);
    setFtb(f => ({ ...f, show: false }));
    setSeparating(false);
    setLayersDone(false);
    setNoTextMsg("");
    initCanvas(imgUrl, canvasSize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgUrl, canvasSize]);

  // ── Dispose when imgUrl clears ────────────────────────────────────────────────
  useEffect(() => {
    if (!imgUrl && fabricRef.current) {
      try { fabricRef.current.dispose(); } catch {}
      fabricRef.current = null;
    }
  }, [imgUrl]);

  // ── Dispose on unmount ────────────────────────────────────────────────────────
  useEffect(() => () => { if (fabricRef.current) { try { fabricRef.current.dispose(); } catch {} } }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!fabricRef.current) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const obj = fabricRef.current.getActiveObject();

      if ((e.key === "Delete" || e.key === "Backspace") && obj && !obj.isBg && !obj.isTint && !obj.isEditing) {
        e.preventDefault();
        fabricRef.current.remove(obj);
        fabricRef.current.discardActiveObject();
        fabricRef.current.renderAll();
        saveSnapshot();
        setSelId(null);
        setFtb(f => ({ ...f, show: false }));
      }
      if (e.key === "d" && (e.metaKey || e.ctrlKey) && obj && !obj.isBg && !obj.isTint) {
        e.preventDefault();
        try { obj.clone((c: FO) => { c.set({ left: (obj.left || 0) + 20, top: (obj.top || 0) + 20 }); fabricRef.current.add(c); fabricRef.current.setActiveObject(c); fabricRef.current.renderAll(); saveSnapshot(); }); } catch {}
      }
      if (e.key === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === "z" && (e.metaKey || e.ctrlKey) && e.shiftKey)  { e.preventDefault(); redo(); }

      const nudge = e.shiftKey ? 10 : 1;
      if (obj && !obj.isBg && !obj.isTint && ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)) {
        e.preventDefault();
        obj.set({
          left: (obj.left || 0) + (e.key === "ArrowLeft" ? -nudge : e.key === "ArrowRight" ? nudge : 0),
          top:  (obj.top  || 0) + (e.key === "ArrowUp"   ? -nudge : e.key === "ArrowDown"  ? nudge : 0),
        });
        fabricRef.current.renderAll();
        saveSnapshot();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, saveSnapshot]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Provider badge — static, above canvas */}
      {imgProvider && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "6px" }}>
          <span style={{ fontSize: "10px", fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase" as const, padding: "3px 8px", background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "rgba(255,255,255,0.65)" }}>
            {imgProvider}
          </span>
        </div>
      )}

      {/* Elements toolbar */}
      <div style={{ display: "flex", gap: "5px", marginBottom: "8px", flexWrap: "wrap", alignItems: "center" }}>
        {([
          { label: "T Text",   fn: addText   },
          { label: "▭ Rect",   fn: addRect   },
          { label: "○ Circle", fn: addCircle },
          ...(logoSrc ? [{ label: "⊞ Logo", fn: addLogo }] : []),
        ] as { label: string; fn: () => void }[]).map(({ label, fn }) => (
          <button key={label} onClick={fn}
            style={{ fontSize: "11px", padding: "4px 10px", background: "rgba(26,26,26,0.04)", border: "1px solid rgba(26,26,26,0.09)", borderRadius: "5px", cursor: "pointer", color: T2, fontFamily: "inherit", fontWeight: 500 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,26,26,0.18)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,26,26,0.09)"; }}
          >{label}</button>
        ))}
        {/* Separate Layers */}
        <button
          onClick={handleSeparateLayers}
          disabled={separating || layersDone}
          style={{
            fontSize: "11px", padding: "4px 10px",
            background: layersDone ? "rgba(43,191,176,0.06)" : "rgba(26,26,26,0.04)",
            border: `1px solid ${layersDone ? "rgba(43,191,176,0.3)" : "rgba(26,26,26,0.09)"}`,
            borderRadius: "5px",
            cursor: separating || layersDone ? "default" : "pointer",
            color: layersDone ? "#1D8A7F" : separating ? T3 : T2,
            fontFamily: "inherit", fontWeight: 500,
            opacity: separating ? 0.6 : 1,
            display: "flex", alignItems: "center", gap: "5px",
            transition: "all 0.15s",
          }}
        >
          {separating ? (
            <><span style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid rgba(26,26,26,0.15)", borderTopColor: T2, animation: "ccSpin 0.7s linear infinite", display: "inline-block" }} /> Separating…</>
          ) : layersDone ? "Layers separated ✓" : "⊕ Separate Layers"}
        </button>
        <div style={{ flex: 1 }} />
        {([{ label: "↩ Undo", fn: undo }, { label: "↪ Redo", fn: redo }] as { label: string; fn: () => void }[]).map(({ label, fn }) => (
          <button key={label} onClick={fn}
            style={{ fontSize: "11px", padding: "4px 10px", background: "transparent", border: "1px solid rgba(26,26,26,0.09)", borderRadius: "5px", cursor: "pointer", color: T3, fontFamily: "inherit", fontWeight: 500 }}
          >{label}</button>
        ))}
      </div>
      {noTextMsg && (
        <div style={{ fontSize: "11px", color: T3, textAlign: "center", marginBottom: "6px" }}>{noTextMsg}</div>
      )}

      {/* Canvas container — always in DOM so ref can be measured */}
      <div ref={containerRef}
        style={{ border: "1px solid rgba(26,26,26,0.09)", borderRadius: "8px", overflow: "hidden", position: "relative", background: "#0A0A0A", aspectRatio: "1/1" }}
      >
        <canvas ref={canvasElRef} style={{ display: "block" }} />

        {/* Separating layers overlay */}
        {separating && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 30,
            background: "rgba(255,255,255,0.72)", backdropFilter: "blur(2px)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 12, animation: "ccPulse 1.8s ease-in-out infinite",
          }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(26,26,26,0.1)", borderTopColor: "rgba(26,26,26,0.5)", animation: "ccSpin 0.9s linear infinite" }} />
            <span style={{ fontSize: "12px", color: T2, letterSpacing: "0.06em" }}>Separating layers…</span>
          </div>
        )}

        {/* Floating toolbar */}
        {selId && ftb.show && (
          <div style={{
            position: "absolute",
            left: ftb.x, top: Math.max(8, ftb.y - 52),
            transform: "translateX(-50%)",
            background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.13)",
            borderRadius: "8px", padding: "5px 8px",
            display: "flex", gap: "5px", alignItems: "center",
            zIndex: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
            animation: "ccFtbIn 0.15s ease both",
            pointerEvents: "auto",
          }}>
            {bColors.map(c => (
              <button key={c} onClick={() => applyElem({ fill: c })}
                style={{ width: 18, height: 18, borderRadius: 3, background: c, border: ep.fill === c ? "2px solid #fff" : "1px solid rgba(255,255,255,0.2)", cursor: "pointer", flexShrink: 0 }} />
            ))}
            <input type="color" value={ep.fill} onChange={e => applyElem({ fill: e.target.value })}
              style={{ width: 18, height: 18, border: "none", background: "none", cursor: "pointer", padding: 0, borderRadius: 3 }} />
            <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.1)" }} />
            <input type="range" min={0} max={100} value={ep.opacity}
              onChange={e => applyElem({ opacity: Number(e.target.value) })}
              style={{ width: 60, accentColor: bColors[0], cursor: "pointer" }} />
            <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.1)" }} />
            <button onClick={bringForward} style={{ fontSize: 12, background: "transparent", border: "none", color: "rgba(255,255,255,0.55)", cursor: "pointer", padding: "0 2px" }}>↑</button>
            <button onClick={sendBackward} style={{ fontSize: 12, background: "transparent", border: "none", color: "rgba(255,255,255,0.55)", cursor: "pointer", padding: "0 2px" }}>↓</button>
            <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.1)" }} />
            <button onClick={deleteSelected} style={{ fontSize: 12, background: "transparent", border: "none", color: "#E07070", cursor: "pointer", padding: "0 2px" }}>✕</button>
          </div>
        )}
      </div>

      {/* Background controls */}
      <div style={{ marginTop: "6px" }}>
        {/* Links row */}
        <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
          {(["tint", "replace"] as const).map(mode => (
            <button key={mode} onClick={() => setBgPanel(p => p === mode ? "none" : mode)}
              style={{ fontSize: "11px", color: bgPanel === mode ? ac.color : T3, background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", textDecoration: bgPanel === mode ? "none" : "underline", transition: "color 0.15s" }}>
              {mode === "tint" ? "Tint background" : "Replace background"}
            </button>
          ))}
        </div>

        {/* Tint panel */}
        {bgPanel === "tint" && (
          <div style={{ marginTop: "8px", padding: "12px 16px", background: "rgba(26,26,26,0.03)", border: "1px solid rgba(26,26,26,0.08)", borderRadius: "8px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 5 }}>
              {[...bColors, "#000000", "#FFFFFF"].map(c => (
                <button key={c} onClick={() => { setTintColor(c); if (tintEnabled) applyTint(c, tintOpacity, true); }}
                  style={{ width: 20, height: 20, borderRadius: 3, background: c, border: tintColor === c ? "2px solid rgba(26,26,26,0.5)" : "1px solid rgba(26,26,26,0.12)", cursor: "pointer", flexShrink: 0 }} />
              ))}
              <input type="color" value={tintColor}
                onChange={e => { setTintColor(e.target.value); if (tintEnabled) applyTint(e.target.value, tintOpacity, true); }}
                style={{ width: 20, height: 20, border: "1px solid rgba(26,26,26,0.12)", borderRadius: 3, background: "transparent", cursor: "pointer", padding: 1 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: T3, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Opacity</span>
              <input type="range" min={0} max={70} value={tintOpacity}
                onChange={e => { setTintOpacity(+e.target.value); if (tintEnabled) applyTint(tintColor, +e.target.value, true); }}
                style={{ width: 80, accentColor: ac.color, cursor: "pointer" }} />
              <span style={{ fontSize: 11, color: T3, minWidth: 28 }}>{tintOpacity}%</span>
            </div>
            <button onClick={() => { const next = !tintEnabled; setTintEnabled(next); applyTint(tintColor, tintOpacity, next); }}
              style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5, border: `1px solid ${tintEnabled ? ac.color + "66" : "rgba(26,26,26,0.12)"}`, background: tintEnabled ? `${ac.color}12` : "transparent", color: tintEnabled ? ac.color : T3, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
              {tintEnabled ? "Remove tint" : "Apply tint"}
            </button>
          </div>
        )}

        {/* Replace panel */}
        {bgPanel === "replace" && (
          <div style={{ marginTop: "8px", padding: "12px 16px", background: "rgba(26,26,26,0.03)", border: "1px solid rgba(26,26,26,0.08)", borderRadius: "8px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ cursor: "pointer" }}>
              <input type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file || !fabricRef.current || !canvasSize) return;
                  const reader = new FileReader();
                  reader.onload = ev => {
                    const dataUrl = ev.target?.result as string;
                    const sz = canvasSize;
                    (window as any).fabric.Image.fromURL(dataUrl, (img: FO) => {
                      if (!img || !bgLayerRef.current) return;
                      const sc = Math.max(sz / (img.width || sz), sz / (img.height || sz));
                      bgLayerRef.current.set({
                        _element: img._element,
                        scaleX: sc, scaleY: sc,
                        left: (sz - (img.width || sz) * sc) / 2,
                        top:  (sz - (img.height || sz) * sc) / 2,
                      });
                      fabricRef.current.renderAll();
                      setReplacedBg(true);
                      saveSnapshot();
                    });
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <span style={{ fontSize: 11, padding: "5px 12px", borderRadius: 5, border: "1px solid rgba(26,26,26,0.12)", background: "transparent", color: T2, cursor: "pointer" }}>
                ↑ Upload image
              </span>
            </label>
            {replacedBg && (
              <button onClick={() => {
                if (!fabricRef.current || !bgLayerRef.current || !canvasSize) return;
                const sz = canvasSize;
                const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imgUrl)}`;
                (window as any).fabric.Image.fromURL(proxyUrl, (img: FO) => {
                  if (!img || !bgLayerRef.current) return;
                  const sc = Math.max(sz / (img.width || sz), sz / (img.height || sz));
                  bgLayerRef.current.set({ _element: img._element, scaleX: sc, scaleY: sc, left: (sz - (img.width || sz) * sc) / 2, top: (sz - (img.height || sz) * sc) / 2 });
                  fabricRef.current.renderAll();
                  setReplacedBg(false);
                  saveSnapshot();
                }, { crossOrigin: "anonymous" });
              }}
                style={{ fontSize: 11, padding: "5px 12px", borderRadius: 5, border: "1px solid rgba(26,26,26,0.09)", background: "transparent", color: T3, cursor: "pointer", fontFamily: "inherit" }}>
                ↺ Reset to AI image
              </button>
            )}
          </div>
        )}
      </div>

      {/* Download */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
        <button onClick={downloadCanvas}
          style={{ fontSize: "11px", padding: "5px 12px", background: "transparent", border: "1px solid rgba(26,26,26,0.12)", borderRadius: "5px", cursor: "pointer", color: T3, fontFamily: "inherit", transition: "all 0.15s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,26,26,0.25)"; (e.currentTarget as HTMLElement).style.color = T2; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,26,26,0.12)"; (e.currentTarget as HTMLElement).style.color = T3; }}
        >↓ Download PNG</button>
      </div>

      <style>{`
        @keyframes ccFtbIn  { from { opacity:0; transform:translateX(-50%) translateY(4px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }
        @keyframes ccSpin   { to { transform: rotate(360deg) } }
        @keyframes ccPulse  { 0%,100% { opacity:.85 } 50% { opacity:.65 } }
      `}</style>
    </div>
  );
});

export default ComposeCanvas;
