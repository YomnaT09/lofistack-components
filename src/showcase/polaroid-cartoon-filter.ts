// Cartoon filter that runs fully in the browser (no server, no AI model).
// 1. Edge-preserving smoothing (a few bilateral passes) flattens skin, sky and fur into soft blobs.
// 2. Lightness is "soft quantized" into a few bands, so shading looks painted instead of photographic.
// 3. A difference-of-Gaussians pass finds outlines, lone specks are dropped, and the rest are inked.
//
// cartoonizePixels is written with no imports and no outside references on purpose:
// the camera turns it into a string and runs it inside a Web Worker, so the page never freezes.

export type CartoonStyle = "comic" | "toon" | "story";

export function cartoonizePixels(src: Uint8ClampedArray, w: number, h: number, style: string): Uint8ClampedArray {
  const presets: Record<string, number[]> = {
    // passes, colourSigma, levels, phi, saturation, light, lift, dogSigma, threshold, inkR, inkG, inkB, inkAlpha, pastel
    comic: [4, 24, 5, 9, 1.5, 1.02, 0, 1.2, 3.2, 20, 14, 28, 1, 0],
    toon: [5, 20, 8, 5, 1.35, 1.08, 0.04, 1.0, 5.5, 70, 45, 80, 0.7, 0],
    story: [5, 26, 6, 6, 0.8, 1.1, 0.06, 1.1, 4.2, 125, 82, 55, 0.75, 0.3],
  };
  const p = presets[style] || presets.comic;
  const passes = p[0], sig = p[1], levels = p[2], phi = p[3], satK = p[4], lightK = p[5], lift = p[6];
  const dogS = p[7], thr = p[8], inkR = p[9], inkG = p[10], inkB = p[11], inkA = p[12], pastel = p[13];
  const n = w * h;

  // --- bilateral smoothing, radius 2 ---
  const spatial: number[] = [];
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) spatial.push(dx, dy, Math.exp(-(dx * dx + dy * dy) / 8));
  const inv = 1 / (2 * sig * sig);
  let cur = src;
  for (let pass = 0; pass < passes; pass++) {
    const out = new Uint8ClampedArray(cur.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r0 = cur[i], g0 = cur[i + 1], b0 = cur[i + 2];
        let R = 0, G = 0, B = 0, W = 0;
        for (let k = 0; k < spatial.length; k += 3) {
          let xx = x + spatial[k], yy = y + spatial[k + 1];
          if (xx < 0) xx = 0; else if (xx >= w) xx = w - 1;
          if (yy < 0) yy = 0; else if (yy >= h) yy = h - 1;
          const j = (yy * w + xx) * 4;
          const dr = cur[j] - r0, dg = cur[j + 1] - g0, db = cur[j + 2] - b0;
          const wt = spatial[k + 2] * Math.exp(-(dr * dr + dg * dg + db * db) * inv);
          R += cur[j] * wt; G += cur[j + 1] * wt; B += cur[j + 2] * wt; W += wt;
        }
        out[i] = R / W; out[i + 1] = G / W; out[i + 2] = B / W; out[i + 3] = 255;
      }
    }
    cur = out;
  }

  // --- outlines: difference of two Gaussian blurs of the lightness ---
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) lum[i] = 0.299 * cur[i * 4] + 0.587 * cur[i * 4 + 1] + 0.114 * cur[i * 4 + 2];
  const blur = (a: Float32Array, s: number) => {
    const r = Math.ceil(s * 3), ker: number[] = [];
    let t = 0;
    for (let i = -r; i <= r; i++) { const v = Math.exp(-(i * i) / (2 * s * s)); ker.push(v); t += v; }
    for (let i = 0; i < ker.length; i++) ker[i] /= t;
    const tmp = new Float32Array(n), o = new Float32Array(n);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = 0;
      for (let i = -r; i <= r; i++) { const xx = Math.min(w - 1, Math.max(0, x + i)); v += a[y * w + xx] * ker[i + r]; }
      tmp[y * w + x] = v;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = 0;
      for (let i = -r; i <= r; i++) { const yy = Math.min(h - 1, Math.max(0, y + i)); v += tmp[yy * w + x] * ker[i + r]; }
      o[y * w + x] = v;
    }
    return o;
  };
  const g1 = blur(lum, dogS), g2 = blur(lum, dogS * 1.6);
  const raw = new Uint8Array(n);
  for (let i = 0; i < n; i++) raw[i] = g2[i] - g1[i] > thr ? 1 : 0;
  const line = new Uint8Array(n);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const k = y * w + x;
    if (!raw[k]) continue;
    let c = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) c += raw[k + dy * w + dx];
    line[k] = c >= 3 ? 1 : 0; // drop lone specks
  }

  // --- colour: soft-quantized lightness, boosted saturation, optional pastel wash, ink on top ---
  const hue = (pp: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return pp + (q - pp) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6;
    return pp;
  };
  const res = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const r = cur[i * 4] / 255, g = cur[i * 4 + 1] / 255, b = cur[i * 4 + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let hh = 0, ss = 0, ll = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      ss = ll > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      hh /= 6;
    }
    const q0 = Math.round(ll * levels) / levels;
    ll = q0 + (0.5 / levels) * Math.tanh(phi * (ll - q0) * levels);
    ll = Math.min(0.97, Math.max(0.05, ll * lightK + lift));
    ss = Math.min(1, ss * satK);
    let R: number, G: number, B: number;
    if (ss === 0) { R = G = B = ll * 255; } else {
      const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss, pp = 2 * ll - q;
      R = hue(pp, q, hh + 1 / 3) * 255; G = hue(pp, q, hh) * 255; B = hue(pp, q, hh - 1 / 3) * 255;
    }
    if (pastel) { R += (255 - R) * pastel; G += (255 - G) * pastel; B += (255 - B) * pastel; }
    if (line[i]) { R = R * (1 - inkA) + inkR * inkA; G = G * (1 - inkA) + inkG * inkA; B = B * (1 - inkA) + inkB * inkA; }
    res[i * 4] = R; res[i * 4 + 1] = G; res[i * 4 + 2] = B; res[i * 4 + 3] = 255;
  }
  return res;
}

/** Runs the filter in a Web Worker when possible, and falls back to the main thread. */
export function runCartoon(img: ImageData, style: CartoonStyle): Promise<ImageData> {
  const fallback = () =>
    new Promise<ImageData>((resolve) =>
      setTimeout(() => resolve(new ImageData(cartoonizePixels(img.data, img.width, img.height, style) as Uint8ClampedArray<ArrayBuffer>, img.width, img.height)), 30),
    );
  if (typeof Worker === "undefined" || typeof Blob === "undefined") return fallback();
  let url = "";
  try {
    const code = `const cartoonizePixels = ${cartoonizePixels.toString()};
self.onmessage = (e) => { const d = e.data; const out = cartoonizePixels(d.data, d.w, d.h, d.style); self.postMessage(out, [out.buffer]); };`;
    url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
    const worker = new Worker(url);
    return new Promise<ImageData>((resolve) => {
      const done = () => { worker.terminate(); URL.revokeObjectURL(url); };
      worker.onmessage = (e: MessageEvent<Uint8ClampedArray<ArrayBuffer>>) => { done(); resolve(new ImageData(e.data, img.width, img.height)); };
      worker.onerror = () => { done(); fallback().then(resolve); };
      const copy = new Uint8ClampedArray(img.data);
      worker.postMessage({ data: copy, w: img.width, h: img.height, style }, [copy.buffer]);
    });
  } catch {
    if (url) URL.revokeObjectURL(url);
    return fallback();
  }
}
