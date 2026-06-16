import sharp from "sharp";

interface RGB { r: number; g: number; b: number }

function euclidean(a: RGB, b: RGB): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

// Sample an NxN block around (cx,cy), return average RGB of opaque pixels.
function sampleBlock(data: Buffer, cx: number, cy: number, width: number, height: number, radius = 2): RGB {
  let r = 0, g = 0, b = 0, n = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = Math.max(0, Math.min(width - 1, cx + dx));
      const y = Math.max(0, Math.min(height - 1, cy + dy));
      const i = (y * width + x) * 4;
      if (data[i + 3] > 200) { // only count opaque pixels
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
      }
    }
  }
  if (n === 0) return { r: 255, g: 255, b: 255 }; // default white
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

// Detect background color by sampling corners. Falls back to white.
function detectBgColor(data: Buffer, width: number, height: number): RGB {
  const corners = [
    sampleBlock(data, 0, 0, width, height),
    sampleBlock(data, width - 1, 0, width, height),
    sampleBlock(data, 0, height - 1, width, height),
    sampleBlock(data, width - 1, height - 1, width, height),
  ];

  // Use the corner that is most consistent with the others (lowest avg distance to peers)
  let bestIdx = 0;
  let bestScore = Infinity;
  for (let i = 0; i < corners.length; i++) {
    const score = corners.reduce((s, c, j) => s + (j === i ? 0 : euclidean(corners[i], c)), 0);
    if (score < bestScore) { bestScore = score; bestIdx = i; }
  }
  return corners[bestIdx];
}

/**
 * Remove the background from a logo PNG.
 *
 * Algorithm:
 *  1. Detect bg color from corner pixel samples.
 *  2. Any pixel within Euclidean distance `threshold` of bg color → transparent.
 *  3. Any near-white pixel (R>240 G>240 B>240) also → transparent.
 *  4. If bg is dark (luminance<30), also remove near-black pixels (R<20 G<20 B<20).
 *  5. Feather edges by blurring the alpha channel with sigma=0.6 (~1px).
 *
 * Already-transparent images are returned unchanged.
 */
export async function removeLogoBg(input: Buffer, threshold = 40): Promise<Buffer> {
  const meta = await sharp(input).metadata();

  // Skip if the image is already RGBA with actual transparency at corners
  if (meta.channels === 4 || meta.hasAlpha) {
    const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const w = info.width, h = info.height;
    // Check corner alphas — if any corner is already transparent, assume already processed
    const cornerAlphas = [
      data[3],                            // top-left
      data[((w - 1) * 4) + 3],            // top-right
      data[((h - 1) * w * 4) + 3],        // bottom-left
      data[((h - 1) * w * 4) + (w - 1) * 4 + 3], // bottom-right
    ];
    if (cornerAlphas.some(a => a < 10)) {
      // Already has transparency, return as-is (re-encode to PNG to normalise)
      return sharp(input).png().toBuffer();
    }
  }

  // Load as RGBA
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const bg = detectBgColor(data, width, height);
  const bgLuminance = 0.299 * bg.r + 0.587 * bg.g + 0.114 * bg.b;
  const bgIsDark    = bgLuminance < 30;

  const rgbBuf   = Buffer.alloc(width * height * 3);
  const alphaBuf = Buffer.alloc(width * height);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const px: RGB = { r, g, b };

    const distFromBg  = euclidean(px, bg);
    const isNearWhite = r > 240 && g > 240 && b > 240;
    const isNearBlack = r < 20  && g < 20  && b < 20;

    const transparent =
      distFromBg < threshold ||
      isNearWhite ||
      (bgIsDark && isNearBlack);

    rgbBuf[i * 3]     = r;
    rgbBuf[i * 3 + 1] = g;
    rgbBuf[i * 3 + 2] = b;
    alphaBuf[i]        = transparent ? 0 : 255;
  }

  // Feather: blur the alpha mask with sigma ≈ 0.6 (≈1px radius)
  const blurredAlpha = await sharp(alphaBuf, { raw: { width, height, channels: 1 } })
    .blur(0.6)
    .raw()
    .toBuffer();

  // Recombine RGB + blurred alpha
  const finalBuf = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    finalBuf[i * 4]     = rgbBuf[i * 3];
    finalBuf[i * 4 + 1] = rgbBuf[i * 3 + 1];
    finalBuf[i * 4 + 2] = rgbBuf[i * 3 + 2];
    finalBuf[i * 4 + 3] = blurredAlpha[i];
  }

  return sharp(finalBuf, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}
