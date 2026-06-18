// Client-side PDF rasterization (browser only). Used by the Compose workflow to
// (a) "Import as Slides" — turn each page into a visual asset, and
// (b) "Original Figure" mode — render a specific page that contains a chart.
//
// pdfjs-dist 6.x ships ESM. We lazy-import it so it never enters the server
// bundle, and point the worker at the copy in node_modules (served by Next).

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function loadPdfjs() {
  if (typeof window === "undefined") {
    throw new Error("rasterizePdf must run in the browser.");
  }
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      // Worker is bundled by the app via a static import URL.
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

export type RasterPage = {
  page: number; // 1-based
  dataUrl: string; // image/png
  width: number;
  height: number;
};

export type RasterizeOptions = {
  // Longest edge of each rendered page, in pixels. LinkedIn renders carousels
  // around 1080px; 1600 gives crisp originals without huge payloads.
  maxEdge?: number;
  // Restrict to specific 1-based pages (e.g. just the figure page). Omit for all.
  pages?: number[];
  mimeType?: "image/png" | "image/jpeg";
  quality?: number; // for jpeg
};

function toUint8(input: ArrayBuffer | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

/**
 * Rasterize a PDF (from a File, Blob URL, ArrayBuffer, or Uint8Array) into PNG
 * data URLs, one per page. Returns pages in document order.
 */
export async function rasterizePdf(
  source: File | Blob | string | ArrayBuffer | Uint8Array,
  opts: RasterizeOptions = {}
): Promise<RasterPage[]> {
  const pdfjs = await loadPdfjs();
  const maxEdge = opts.maxEdge ?? 1600;
  const mimeType = opts.mimeType ?? "image/png";

  let dataBuf: Uint8Array;
  if (typeof source === "string") {
    const res = await fetch(source);
    dataBuf = toUint8(await res.arrayBuffer());
  } else if (source instanceof Blob) {
    dataBuf = toUint8(await source.arrayBuffer());
  } else {
    dataBuf = toUint8(source);
  }

  const loadingTask = pdfjs.getDocument({ data: dataBuf });
  const doc = await loadingTask.promise;
  const wanted =
    opts.pages && opts.pages.length
      ? opts.pages.filter((p) => p >= 1 && p <= doc.numPages)
      : Array.from({ length: doc.numPages }, (_, i) => i + 1);

  const out: RasterPage[] = [];
  for (const pageNum of wanted) {
    const page = await doc.getPage(pageNum);
    const base = page.getViewport({ scale: 1 });
    const scale = maxEdge / Math.max(base.width, base.height);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D canvas context.");

    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    out.push({
      page: pageNum,
      dataUrl: canvas.toDataURL(mimeType, opts.quality ?? 0.92),
      width: canvas.width,
      height: canvas.height,
    });
    page.cleanup();
  }
  await loadingTask.destroy();
  return out;
}

/** Convenience: rasterize a single 1-based page (used for Original Figure mode). */
export async function rasterizePdfPage(
  source: File | Blob | string | ArrayBuffer | Uint8Array,
  page: number,
  opts: Omit<RasterizeOptions, "pages"> = {}
): Promise<RasterPage | null> {
  const [first] = await rasterizePdf(source, { ...opts, pages: [page] });
  return first ?? null;
}

/** How many pages a PDF has, without rendering them. */
export async function pdfPageCount(
  source: File | Blob | string | ArrayBuffer | Uint8Array
): Promise<number> {
  const pdfjs = await loadPdfjs();
  let dataBuf: Uint8Array;
  if (typeof source === "string") {
    dataBuf = toUint8(await (await fetch(source)).arrayBuffer());
  } else if (source instanceof Blob) {
    dataBuf = toUint8(await source.arrayBuffer());
  } else {
    dataBuf = toUint8(source);
  }
  const loadingTask = pdfjs.getDocument({ data: dataBuf });
  const doc = await loadingTask.promise;
  const n = doc.numPages;
  await loadingTask.destroy();
  return n;
}
