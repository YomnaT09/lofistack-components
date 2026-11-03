// Photo looks for the Polaroid camera. They change the mood of the photo but keep it looking like the photo.
//   glow:     a blurred copy is screen-blended on top (bloom), plus a soft pink-violet haze
//   halftone: the photo is re-printed as round dots, bigger where it is darker, like a comic book
//   bw:       black and white with extra contrast, film grain and a vignette
//
// applyLookPixels is written with no imports and no outside references on purpose:
// the camera turns it into a string and runs it inside a Web Worker, so the page never freezes.

export type PhotoLook = "glow" | "halftone" | "bw";

export function applyLookPixels(src: Uint8ClampedArray, w: number, h: number, look: string): Uint8ClampedArray {
  const n = w * h;
  const out = new Uint8ClampedArray(src);
  const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
  let seed = 7;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const cx = w / 2, cy = h / 2, md = Math.hypot(cx, cy);
  const vignette = (x: number, y: number, k: number) => 1 - k * Math.pow(Math.hypot(x - cx, y - cy) / md, 2.2);

  if (look === "glow") {
    // separable Gaussian blur of the RGB channels
    const s = Math.max(2, w / 55), r = Math.ceil(s * 2.5), ker: number[] = [];
    let t = 0;
    for (let i = -r; i <= r; i++) { const v = Math.exp(-(i * i) / (2 * s * s)); ker.push(v); t += v; }
    for (let i = 0; i < ker.length; i++) ker[i] /= t;
    const tmp = new Float32Array(n * 3), bl = new Float32Array(n * 3);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let a = 0, b = 0, c = 0;
      for (let i = -r; i <= r; i++) {
        const xx = Math.min(w - 1, Math.max(0, x + i)), j = (y * w + xx) * 4, q = ker[i + r];
        a += src[j] * q; b += src[j + 1] * q; c += src[j + 2] * q;
      }
      const m = (y * w + x) * 3; tmp[m] = a; tmp[m + 1] = b; tmp[m + 2] = c;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let a = 0, b = 0, c = 0;
      for (let i = -r; i <= r; i++) {
        const yy = Math.min(h - 1, Math.max(0, y + i)), j = (yy * w + x) * 3, q = ker[i + r];
        a += tmp[j] * q; b += tmp[j + 1] * q; c += tmp[j + 2] * q;
      }
      const m = (y * w + x) * 3; bl[m] = a; bl[m + 1] = b; bl[m + 2] = c;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, m = (y * w + x) * 3;
      const ch = [0, 0, 0];
      for (let c = 0; c < 3; c++) {
        const a = src[i + c] / 255, b = bl[m + c] / 255;
        ch[c] = (1 - (1 - a) * (1 - b * 0.75)) * 255 * 0.97; // screen blend
      }
      let R = ch[0] + 10, G = ch[1], B = ch[2] + 12;
      R = (R - 128) * 0.95 + 128; G = (G - 128) * 0.95 + 128; B = (B - 128) * 0.95 + 128;
      const l = 0.299 * R + 0.587 * G + 0.114 * B, tt = Math.min(1, Math.max(0, l / 255));
      R = l + (R - l) * 1.05 + 10 * (1 - tt) + 8 * tt;
      G = l + (G - l) * 1.05;
      B = l + (B - l) * 1.05 + 16 * (1 - tt) + 6 * tt;
      R = 8 + R * 0.95; G = 8 + G * 0.95; B = 8 + B * 0.95;
      const v = vignette(x, y, 0.1), g = (rand() - 0.5) * 3;
      out[i] = clamp(R * v + g); out[i + 1] = clamp(G * v + g); out[i + 2] = clamp(B * v + g);
    }
    return out;
  }

  if (look === "halftone") {
    const cell = Math.max(4, Math.round(w / 60));
    const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
    const avg = new Float32Array(cols * rows * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = (Math.floor(y / cell) * cols + Math.floor(x / cell)) * 4, j = (y * w + x) * 4;
      avg[k] += src[j]; avg[k + 1] += src[j + 1]; avg[k + 2] += src[j + 2]; avg[k + 3] += 1;
    }
    for (let k = 0; k < avg.length; k += 4) {
      const c = avg[k + 3];
      let r = avg[k] / c, g = avg[k + 1] / c, b = avg[k + 2] / c;
      const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255, mean = (r + g + b) / 3;
      r = clamp(mean + (r - mean) * 1.5) * 0.85; g = clamp(mean + (g - mean) * 1.5) * 0.85; b = clamp(mean + (b - mean) * 1.5) * 0.85;
      avg[k] = r; avg[k + 1] = g; avg[k + 2] = b;
      avg[k + 3] = cell * 0.72 * Math.sqrt(1 - l * 0.85); // dot radius
    }
    const paper = [255, 246, 230];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const cxI = Math.floor(x / cell), cyI = Math.floor(y / cell);
      // a dot can spill into the next cell, so check the 3x3 neighbourhood and keep the strongest cover
      let cover = 0, cr = 0, cg = 0, cb = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = cxI + dx, Y = cyI + dy;
        if (X < 0 || Y < 0 || X >= cols || Y >= rows) continue;
        const k = (Y * cols + X) * 4;
        const d = Math.hypot(x + 0.5 - (X + 0.5) * cell, y + 0.5 - (Y + 0.5) * cell);
        const a = Math.min(1, Math.max(0, avg[k + 3] - d + 0.5)); // 1px anti-aliased edge
        if (a > cover) { cover = a; cr = avg[k]; cg = avg[k + 1]; cb = avg[k + 2]; }
      }
      const i = (y * w + x) * 4;
      out[i] = paper[0] + (cr - paper[0]) * cover;
      out[i + 1] = paper[1] + (cg - paper[1]) * cover;
      out[i + 2] = paper[2] + (cb - paper[2]) * cover;
    }
    return out;
  }

  // bw
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    let r = (src[i] * 1.02 - 128) * 1.22 + 128, g = (src[i + 1] * 1.02 - 128) * 1.22 + 128, b = (src[i + 2] * 1.02 - 128) * 1.22 + 128;
    let l = 0.5 * r + 0.4 * g + 0.1 * b;
    const tt = Math.min(1, Math.max(0, l / 255));
    let R = l + 6 * tt, G = l + 4 * tt, B = l;
    R = 12 + R * 0.925; G = 12 + G * 0.925; B = 12 + B * 0.925;
    const v = vignette(x, y, 0.35), grain = (rand() - 0.5) * 22;
    out[i] = clamp(R * v + grain); out[i + 1] = clamp(G * v + grain); out[i + 2] = clamp(B * v + grain);
  }
  return out;
}

/** Runs the look in a Web Worker when possible, and falls back to the main thread. */
export function runLook(img: ImageData, look: PhotoLook): Promise<ImageData> {
  const fallback = () =>
    new Promise<ImageData>((resolve) =>
      setTimeout(() => resolve(new ImageData(applyLookPixels(img.data, img.width, img.height, look) as Uint8ClampedArray<ArrayBuffer>, img.width, img.height)), 30),
    );
  if (typeof Worker === "undefined" || typeof Blob === "undefined") return fallback();
  let url = "";
  try {
    const code = `const applyLookPixels = ${applyLookPixels.toString()};
self.onmessage = (e) => { const d = e.data; const out = applyLookPixels(d.data, d.w, d.h, d.look); self.postMessage(out, [out.buffer]); };`;
    url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
    const worker = new Worker(url);
    return new Promise<ImageData>((resolve) => {
      const done = () => { worker.terminate(); URL.revokeObjectURL(url); };
      worker.onmessage = (e: MessageEvent<Uint8ClampedArray<ArrayBuffer>>) => { done(); resolve(new ImageData(e.data, img.width, img.height)); };
      worker.onerror = () => { done(); fallback().then(resolve); };
      const copy = new Uint8ClampedArray(img.data);
      worker.postMessage({ data: copy, w: img.width, h: img.height, look }, [copy.buffer]);
    });
  } catch {
    if (url) URL.revokeObjectURL(url);
    return fallback();
  }
}
